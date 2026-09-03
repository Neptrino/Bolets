import { createHmac, timingSafeEqual } from "node:crypto";

import type { BacklinkCampaign } from "@/data/backlink-campaigns";
import { SITE_URL } from "@/src/lib/seo";

const BLOCKED_HOST_PARTS = [
  "facebook.com", "instagram.com", "linkedin.com", "pinterest.", "reddit.com",
  "tiktok.com", "tripadvisor.", "wikipedia.org", "x.com", "youtube.com",
];

const ROLE_MAILBOXES = new Set([
  "comunicacio", "comunicació", "contact", "contacte", "editor", "editorial",
  "info", "mediambient", "media", "premsa", "redaccio", "redacció", "turisme",
]);

const INSTITUTIONAL_HOST_MARKERS = [
  ".cat", ".org", ".edu", ".gov", ".gob", "ajuntament", "diputacio", "gencat",
  "parcs", "turisme", "universitat",
];

export type CandidateInput = {
  campaign: BacklinkCampaign;
  pageUrl: string;
  title: string;
  pageText: string;
  contactEmail: string | null;
  hasExistingLink: boolean;
};

export function normalizeCandidateUrl(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    if (url.port && url.port !== "80" && url.port !== "443") return null;
    url.hash = "";
    for (const key of [...url.searchParams.keys()]) {
      if (key.startsWith("utm_") || ["fbclid", "gclid"].includes(key)) url.searchParams.delete(key);
    }
    url.hostname = url.hostname.toLowerCase();
    if (url.hostname === "bolets.app" || url.hostname.endsWith(".bolets.app")) return null;
    if (BLOCKED_HOST_PARTS.some((part) => url.hostname.includes(part))) return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function normalizeEmail(value: string) {
  const email = value.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254 ? email : null;
}

export function isRoleMailbox(value: string) {
  const email = normalizeEmail(value);
  if (!email) return false;
  const local = email.split("@")[0]!.split(/[+._-]/)[0]!;
  return ROLE_MAILBOXES.has(local);
}

export function scoreCandidate(input: CandidateInput) {
  const host = new URL(input.pageUrl).hostname;
  const haystack = `${input.title} ${input.pageText.slice(0, 20_000)}`.toLocaleLowerCase("ca");
  const termHits = input.campaign.topicTerms.filter((term) => haystack.includes(term.toLocaleLowerCase("ca"))).length;
  let score = 30;
  score += Math.min(termHits * 8, 32);
  score += INSTITUTIONAL_HOST_MARKERS.some((marker) => host.includes(marker)) ? 14 : 0;
  score += input.contactEmail && isRoleMailbox(input.contactEmail) ? 14 : 0;
  score -= input.hasExistingLink ? 100 : 0;
  score -= /\b(fòrum|forum|comentaris|classified|casino|aposta|betting)\b/i.test(haystack) ? 40 : 0;
  return Math.max(0, Math.min(100, score));
}

export function automaticEligibility(input: CandidateInput, minimumScore: number) {
  const score = scoreCandidate(input);
  if (input.hasExistingLink) return { eligible: false, score, reason: "existing-link" };
  if (!input.contactEmail) return { eligible: false, score, reason: "missing-contact" };
  if (!isRoleMailbox(input.contactEmail)) return { eligible: false, score, reason: "personal-mailbox" };
  if (score < minimumScore) return { eligible: false, score, reason: "low-score" };
  return { eligible: true, score, reason: "policy-passed" };
}

export function buildOutreachMessage(input: {
  campaign: BacklinkCampaign;
  organization: string;
  pageTitle: string;
  pageUrl: string;
  unsubscribeUrl: string;
  followUp: boolean;
}) {
  const targetUrl = new URL(input.campaign.targetPath, SITE_URL).toString();
  const greeting = `Hola, equip de ${input.organization},`;
  const context = `Hem trobat la vostra pàgina «${input.pageTitle}» (${input.pageUrl}) mentre revisàvem recursos públics sobre bolets a Catalunya.`;
  const resource = `A Bolets Atles mantenim ${input.campaign.resourceSummary}: ${input.campaign.targetTitle} (${targetUrl}).`;
  const request = "Si creieu que pot ser útil als vostres lectors, podeu citar-lo com a recurs complementari. No demanem cap intercanvi ni oferim cap compensació.";
  const closing = `Si no encaixa, no cal que respongueu. No tornarem a escriure sobre aquesta pàgina. Podeu evitar qualsevol comunicació futura aquí: ${input.unsubscribeUrl}`;
  return {
    subject: input.followUp
      ? `Recordatori breu: ${input.campaign.targetTitle}`
      : `Recurs sobre bolets per a «${input.pageTitle.slice(0, 72)}»`,
    text: input.followUp
      ? `${greeting}\n\nFa uns dies us vam compartir aquest recurs per si complementava la vostra pàgina:\n${targetUrl}\n\n${request}\n\n${closing}\n\nGràcies,\nEquip de Bolets Atles`
      : `${greeting}\n\n${context}\n\n${resource}\n\n${request}\n\n${closing}\n\nGràcies,\nEquip de Bolets Atles`,
  };
}

export function createUnsubscribeToken(prospectId: string, email: string, secret: string) {
  const payload = Buffer.from(JSON.stringify({ prospectId, email: normalizeEmail(email) }), "utf8").toString("base64url");
  const signature = createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function readUnsubscribeToken(token: string, secret: string) {
  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra) return null;
  const expected = createHmac("sha256", secret).update(payload).digest();
  let candidate: Buffer;
  try { candidate = Buffer.from(signature, "base64url"); } catch { return null; }
  if (candidate.length !== expected.length || !timingSafeEqual(candidate, expected)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Record<string, unknown>;
    const email = typeof parsed.email === "string" ? normalizeEmail(parsed.email) : null;
    return typeof parsed.prospectId === "string" && email
      ? { prospectId: parsed.prospectId, email }
      : null;
  } catch {
    return null;
  }
}
