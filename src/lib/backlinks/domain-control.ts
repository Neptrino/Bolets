import { getDomain } from "tldts";

export const ADMIN_DOMAIN_SUPPRESSION_PREFIX = "admin:";

export function backlinkDomainKey(hostname: string) {
  const normalized = hostname.trim().toLocaleLowerCase("en").replace(/\.$/, "");
  return getDomain(normalized) ?? normalized.replace(/^www\./, "");
}

export function backlinkSuppressionDomainValues(hostname: string) {
  const normalized = hostname.trim().toLocaleLowerCase("en").replace(/\.$/, "");
  return [...new Set([backlinkDomainKey(normalized), normalized])];
}

export function adminDomainSuppressionReason(note: string) {
  return `${ADMIN_DOMAIN_SUPPRESSION_PREFIX}${note.trim()}`.slice(0, 100);
}

export function isAdminDomainSuppression(reason: string) {
  return reason.startsWith(ADMIN_DOMAIN_SUPPRESSION_PREFIX);
}

export function backlinkDomainMatchFilter(hostname: string) {
  const domain = backlinkDomainKey(hostname);
  return `domain.eq.${domain},domain.like.%.${domain}`;
}
