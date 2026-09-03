import { isRoleMailbox, normalizeEmail } from "@/src/lib/backlinks/policy";
import { backlinkDomainKey } from "@/src/lib/backlinks/domain-control";
import type { BacklinkManualDecision, BacklinkStatus } from "@/src/lib/backlinks/types";

export type ManualApprovalBlocker = "already-contacted" | "existing-link" | "invalid-contact";

export function isManuallyReviewedContact(value: string, prospectDomain: string) {
  const email = normalizeEmail(value);
  if (!email) return false;
  if (isRoleMailbox(email)) return true;
  const emailDomain = email.slice(email.lastIndexOf("@") + 1);
  return backlinkDomainKey(emailDomain) === backlinkDomainKey(prospectDomain);
}

export function manualApprovalBlocker(input: {
  contactEmail: string | null;
  domain: string;
  existingLink: boolean;
  sendCount: number;
  status: BacklinkStatus;
}): ManualApprovalBlocker | null {
  if (input.sendCount > 0 || ["sent", "linked", "lost"].includes(input.status)) return "already-contacted";
  if (input.existingLink) return "existing-link";
  const email = input.contactEmail && normalizeEmail(input.contactEmail);
  if (!email || !isManuallyReviewedContact(email, input.domain)) return "invalid-contact";
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
