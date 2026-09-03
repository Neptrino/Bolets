"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { hideAdminFinding } from "@/src/lib/community-details-server";

const hideFindingSchema = z.object({ findingId: z.uuid() });

export async function hideFindingAction(formData: FormData) {
  const parsed = hideFindingSchema.safeParse({ findingId: formData.get("findingId") });
  if (!parsed.success) redirect("/admin/troballes?error=invalid-action");

  let updated = false;
  try {
    updated = await hideAdminFinding(parsed.data.findingId);
  } catch {
    redirect("/admin/troballes?error=update-failed");
  }
  if (!updated) redirect("/admin/troballes?error=not-found");

  revalidatePath("/admin/troballes");
  revalidatePath("/admin/avisos");
  revalidatePath("/admin");
  revalidatePath("/troballes");
  revalidatePath(`/troballes/${parsed.data.findingId}`);
  redirect("/admin/troballes?updated=hidden");
}
