"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import {
  grantManualMapAccess,
  revokeContributorAccess,
} from "@/src/lib/contributions/server";
import { requireOperationalSession } from "@/src/lib/operational-status-session";

const grantSchema = z.object({
  userId: z.uuid(),
  accessLevel: z.enum(["finding", "contributor"]),
  durationDays: z.coerce.number().int().min(1).max(365),
  reason: z.string().trim().min(3).max(1000),
});

const revokeSchema = z.object({
  userId: z.uuid(),
  reason: z.string().trim().min(3).max(1000),
});

function revalidateAccessPages() {
  revalidatePath("/admin/usuaris");
  revalidatePath("/admin/aportacions");
  revalidatePath("/admin");
  revalidatePath("/compte/col-laboracio");
  revalidatePath("/map");
}

export async function grantUserMapAccessAction(formData: FormData) {
  const reviewer = await requireOperationalSession();
  const parsed = grantSchema.safeParse({
    userId: formData.get("userId"),
    accessLevel: formData.get("accessLevel"),
    durationDays: formData.get("durationDays"),
    reason: formData.get("reason"),
  });
  if (!parsed.success) redirect("/admin/usuaris?error=invalid-grant");

  try {
    await grantManualMapAccess(
      parsed.data.userId,
      parsed.data.accessLevel,
      parsed.data.durationDays,
      parsed.data.reason,
      reviewer,
    );
  } catch {
    redirect("/admin/usuaris?error=grant-failed");
  }
  revalidateAccessPages();
  redirect("/admin/usuaris?updated=granted");
}

export async function revokeUserMapAccessAction(formData: FormData) {
  const reviewer = await requireOperationalSession();
  const parsed = revokeSchema.safeParse({
    userId: formData.get("userId"),
    reason: formData.get("reason"),
  });
  if (!parsed.success) redirect("/admin/usuaris?error=invalid-revocation");

  let revoked = false;
  try {
    revoked = await revokeContributorAccess(parsed.data.userId, parsed.data.reason, reviewer);
  } catch {
    redirect("/admin/usuaris?error=revocation-failed");
  }
  if (!revoked) redirect("/admin/usuaris?error=not-active");
  revalidateAccessPages();
  redirect("/admin/usuaris?updated=revoked");
}
