"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { z } from "zod";

import { updateBacklinkSettings } from "@/src/lib/backlinks/admin.server";
import { runBacklinkAutomation } from "@/src/lib/backlinks/automation.server";
import {
  approveBacklinkProspect,
  BacklinkManualActionError,
  excludeBacklinkProspect,
  rescanBacklinkProspect,
  restoreAutomaticBacklinkDecision,
  updateBacklinkContact,
} from "@/src/lib/backlinks/manual.server";
import { allowBacklinkDomain, blockBacklinkDomain } from "@/src/lib/backlinks/domain-control.server";
import { safeBacklinkReturnPath } from "@/src/lib/backlinks/admin-table";
import { requireOperationalSession } from "@/src/lib/operational-status-session";

const settingsSchema = z.object({
  enabled: z.boolean(),
  autoSend: z.boolean(),
  dailySendLimit: z.coerce.number().int().min(1).max(25),
  minimumScore: z.coerce.number().int().min(60).max(100),
});

const manualDecisionSchema = z.object({
  prospectId: z.uuid(),
  decision: z.enum(["approve", "exclude", "automatic"]),
  note: z.string().trim().min(3).max(500),
  returnTo: z.string().max(1000),
});

const contactSchema = z.object({
  prospectId: z.uuid(),
  contactEmail: z.email().max(254),
  note: z.string().trim().min(3).max(500),
  returnTo: z.string().max(1000),
});

const rescanSchema = z.object({
  prospectId: z.uuid(),
  returnTo: z.string().max(1000),
});

const domainControlSchema = z.object({
  prospectId: z.uuid(),
  intent: z.enum(["block", "allow"]),
  note: z.string().trim().min(3).max(90),
  returnTo: z.string().max(1000),
});

function noticePath(returnTo: string, kind: "updated" | "error", value: string) {
  const safePath = safeBacklinkReturnPath(returnTo);
  const url = new URL(safePath, "https://bolets.app");
  url.searchParams.delete(kind === "updated" ? "error" : "updated");
  url.searchParams.set(kind, value);
  return `${url.pathname}${url.search}`;
}

function manualErrorCode(error: unknown) {
  if (error instanceof BacklinkManualActionError) return error.code;
  console.error("Backlink manual action failed", error);
  return "manual-action";
}

export type BacklinkSettingsActionState = {
  status: "idle" | "saved" | "error";
  message: string;
  savedAt: string | null;
};

export async function updateBacklinkSettingsAction(
  _previousState: BacklinkSettingsActionState,
  formData: FormData,
): Promise<BacklinkSettingsActionState> {
  const user = await requireOperationalSession();
  const parsed = settingsSchema.safeParse({
    enabled: formData.get("enabled") === "on",
    autoSend: formData.get("autoSend") === "on",
    dailySendLimit: formData.get("dailySendLimit"),
    minimumScore: formData.get("minimumScore"),
  });
  if (!parsed.success) {
    return { status: "error", message: "Revisa els valors abans de desar-los.", savedAt: null };
  }
  try {
    await updateBacklinkSettings({ ...parsed.data, userId: user.id });
    revalidatePath("/admin/enllacos");
    return { status: "saved", message: "Canvis desats.", savedAt: new Date().toISOString() };
  } catch (error) {
    console.error("Backlink settings autosave failed", error);
    return { status: "error", message: "No s’han pogut desar els canvis. Torna-ho a provar.", savedAt: null };
  }
}

export async function runBacklinkAutomationAction() {
  await requireOperationalSession();
  after(async () => {
    try {
      await runBacklinkAutomation();
      revalidatePath("/admin/enllacos");
      revalidatePath("/admin");
    } catch (error) {
      console.error("Manual backlink cycle failed", error);
    }
  });
  redirect("/admin/enllacos?updated=run-started");
}

export async function overrideBacklinkProspectAction(formData: FormData) {
  const user = await requireOperationalSession();
  const parsed = manualDecisionSchema.safeParse({
    prospectId: formData.get("prospectId"),
    decision: formData.get("decision"),
    note: formData.get("note"),
    returnTo: formData.get("returnTo"),
  });
  if (!parsed.success) redirect("/admin/enllacos?error=invalid-manual-action");
  try {
    if (parsed.data.decision === "approve") {
      await approveBacklinkProspect(parsed.data.prospectId, parsed.data.note, user.id);
    } else if (parsed.data.decision === "exclude") {
      await excludeBacklinkProspect(parsed.data.prospectId, parsed.data.note, user.id);
    } else {
      await restoreAutomaticBacklinkDecision(parsed.data.prospectId, parsed.data.note, user.id);
    }
  } catch (error) {
    redirect(noticePath(parsed.data.returnTo, "error", manualErrorCode(error)));
  }
  revalidatePath("/admin/enllacos");
  redirect(noticePath(parsed.data.returnTo, "updated", `manual-${parsed.data.decision}`));
}

export async function updateBacklinkContactAction(formData: FormData) {
  const user = await requireOperationalSession();
  const parsed = contactSchema.safeParse({
    prospectId: formData.get("prospectId"),
    contactEmail: formData.get("contactEmail"),
    note: formData.get("note"),
    returnTo: formData.get("returnTo"),
  });
  if (!parsed.success) redirect("/admin/enllacos?error=invalid-contact");
  try {
    await updateBacklinkContact(
      parsed.data.prospectId,
      parsed.data.contactEmail,
      parsed.data.note,
      user.id,
    );
  } catch (error) {
    redirect(noticePath(parsed.data.returnTo, "error", manualErrorCode(error)));
  }
  revalidatePath("/admin/enllacos");
  redirect(noticePath(parsed.data.returnTo, "updated", "contact"));
}

export async function rescanBacklinkProspectAction(formData: FormData) {
  const user = await requireOperationalSession();
  const parsed = rescanSchema.safeParse({
    prospectId: formData.get("prospectId"),
    returnTo: formData.get("returnTo"),
  });
  if (!parsed.success) redirect("/admin/enllacos?error=invalid-manual-action");
  try {
    await rescanBacklinkProspect(parsed.data.prospectId, user.id);
  } catch (error) {
    redirect(noticePath(parsed.data.returnTo, "error", manualErrorCode(error)));
  }
  revalidatePath("/admin/enllacos");
  redirect(noticePath(parsed.data.returnTo, "updated", "rescan"));
}

export async function controlBacklinkDomainAction(formData: FormData) {
  await requireOperationalSession();
  const parsed = domainControlSchema.safeParse({
    prospectId: formData.get("prospectId"),
    intent: formData.get("intent"),
    note: formData.get("note"),
    returnTo: formData.get("returnTo"),
  });
  if (!parsed.success) redirect("/admin/enllacos?error=invalid-domain-action");
  try {
    if (parsed.data.intent === "block") {
      await blockBacklinkDomain(parsed.data.prospectId, parsed.data.note);
    } else {
      await allowBacklinkDomain(parsed.data.prospectId);
    }
  } catch (error) {
    redirect(noticePath(parsed.data.returnTo, "error", manualErrorCode(error)));
  }
  revalidatePath("/admin/enllacos");
  redirect(noticePath(parsed.data.returnTo, "updated", `domain-${parsed.data.intent}`));
}
