"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { updateBacklinkSettings } from "@/src/lib/backlinks/admin.server";
import { runBacklinkAutomation } from "@/src/lib/backlinks/automation.server";
import { requireOperationalSession } from "@/src/lib/operational-status-session";

const settingsSchema = z.object({
  enabled: z.boolean(),
  autoSend: z.boolean(),
  dailySendLimit: z.coerce.number().int().min(1).max(25),
  minimumScore: z.coerce.number().int().min(60).max(100),
});

export async function updateBacklinkSettingsAction(formData: FormData) {
  const user = await requireOperationalSession();
  const parsed = settingsSchema.safeParse({
    enabled: formData.get("enabled") === "on",
    autoSend: formData.get("autoSend") === "on",
    dailySendLimit: formData.get("dailySendLimit"),
    minimumScore: formData.get("minimumScore"),
  });
  if (!parsed.success) redirect("/admin/enllacos?error=invalid-settings");
  await updateBacklinkSettings({ ...parsed.data, userId: user.id });
  revalidatePath("/admin/enllacos");
  redirect("/admin/enllacos?updated=settings");
}

export async function runBacklinkAutomationAction() {
  await requireOperationalSession();
  await runBacklinkAutomation();
  revalidatePath("/admin/enllacos");
  revalidatePath("/admin");
  redirect("/admin/enllacos?updated=run");
}
