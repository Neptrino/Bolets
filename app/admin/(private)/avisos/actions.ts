"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { moderateAdminFindingFlag } from "@/src/lib/community-details-server";

const moderationSchema = z.object({
  reportId: z.uuid(),
  decision: z.enum(["hide", "dismiss"]),
});

export async function moderateReportAction(formData: FormData) {
  const parsed = moderationSchema.safeParse({
    reportId: formData.get("reportId"),
    decision: formData.get("decision"),
  });
  if (!parsed.success) redirect("/admin/avisos?status=open&error=invalid-action");

  let updated = false;
  try {
    updated = await moderateAdminFindingFlag(parsed.data.reportId, parsed.data.decision);
  } catch {
    redirect("/admin/avisos?status=open&error=update-failed");
  }
  if (!updated) redirect("/admin/avisos?status=open&error=not-found");

  revalidatePath("/admin/avisos");
  revalidatePath("/admin/troballes");
  revalidatePath("/admin");
  redirect(`/admin/avisos?status=open&updated=${parsed.data.decision}`);
}
