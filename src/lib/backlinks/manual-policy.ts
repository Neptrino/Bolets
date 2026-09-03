import { normalizeEmail } from "@/src/lib/backlinks/policy";
import type { BacklinkManualDecision, BacklinkStatus } from "@/src/lib/backlinks/types";

export type ManualApprovalBlocker = "already-contacted" | "existing-link" | "invalid-contact";

export function isValidManualContact(value: string) {
  return Boolean(normalizeEmail(value));
}

export function manualApprovalBlocker(input: {
  contactEmail: string | null;
  existingLink: boolean;
  sendCount: number;
  status: BacklinkStatus;
}): ManualApprovalBlocker | null {
  if (input.sendCount > 0 || ["sent", "linked", "lost"].includes(input.status)) return "already-contacted";
  if (input.existingLink) return "existing-link";
  // The required approval note is the human review. Automatic sending keeps its
  // stricter role-mailbox policy; this path only requires valid email syntax.
  const email = input.contactEmail && normalizeEmail(input.contactEmail);
  if (!email) return "invalid-contact";
  return null;
}

export type BacklinkRescanMode = "verified-link" | "contacted" | "manual-excluded" | "manual-approved" | "automatic";

export function backlinkRescanMode(input: {
  existingLink: boolean;
  manualDecision: BacklinkManualDecision | null;
  sendCount: number;
  status: BacklinkStatus;
}): BacklinkRescanMode {
  if (input.existingLink) return "verified-link";
  if (input.manualDecision === "excluded") return "manual-excluded";
  if (input.sendCount > 0 || ["sent", "linked", "lost"].includes(input.status)) return "contacted";
  if (input.manualDecision === "approved") return "manual-approved";
  return "automatic";
}
