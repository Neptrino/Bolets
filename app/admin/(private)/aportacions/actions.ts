"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireOperationalSession } from "@/src/lib/operational-status-session";
import {
  reviewContributionRequest,
  revokeContributorAccess,
} from "@/src/lib/contributions/server";

const reviewSchema = z.object({
  requestId: z.uuid(),
  decision: z.enum(["approved", "rejected"]),
  reviewNote: z.string().trim().max(1000),
});

export async function reviewContributionAction(formData: FormData) {
  const reviewer = await requireOperationalSession();
  const parsed = reviewSchema.safeParse({
    requestId: formData.get("requestId"),
    decision: formData.get("decision"),
    reviewNote: formData.get("reviewNote") ?? "",
  });
  if (!parsed.success) redirect("/admin/aportacions?error=invalid-review");
  if (parsed.data.decision === "rejected" && parsed.data.reviewNote.length < 3) {
    redirect("/admin/aportacions?error=rejection-reason");
  }
  await reviewContributionRequest(
    parsed.data.requestId,
    parsed.data.decision,
    parsed.data.reviewNote || null,
    reviewer,
  );
  revalidatePath("/admin/aportacions");
  revalidatePath("/admin");
  redirect(`/admin/aportacions?updated=${parsed.data.decision}`);
}

const revokeSchema = z.object({
  userId: z.uuid(),
  reason: z.string().trim().min(3).max(1000),
});

export async function revokeContributorAction(formData: FormData) {
  const reviewer = await requireOperationalSession();
  const parsed = revokeSchema.safeParse({
    userId: formData.get("userId"),
    reason: formData.get("reason"),
  });
  if (!parsed.success) redirect("/admin/aportacions?error=revocation-reason");
  await revokeContributorAccess(parsed.data.userId, parsed.data.reason, reviewer);
  revalidatePath("/admin/aportacions");
  revalidatePath("/admin");
  redirect("/admin/aportacions?updated=revoked");
}
