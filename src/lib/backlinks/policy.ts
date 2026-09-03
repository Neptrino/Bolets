import { createHmac, timingSafeEqual } from "node:crypto";

import type { BacklinkCampaign } from "@/data/backlink-campaigns";
import type { BacklinkScoreExplanation } from "@/src/lib/backlinks/types";
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
  outboundLinkCount: number;
  contentPublishedAt: string | null;
  contentModifiedAt: string | null;
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

function outboundLinkPropensityScore(count: number) {
  if (count === 0) return -20;
  if (count === 1) return -8;
  if (count === 2) return 2;
  if (count >= 3) return 6;
  return 0;
}

function contentFreshnessFactor(input: CandidateInput, now: Date) {
  const effectiveDate = input.contentModifiedAt ?? input.contentPublishedAt;
  const timestamp = effectiveDate ? Date.parse(effectiveDate) : Number.NaN;
  const ageYears = (now.getTime() - timestamp) / (365.25 * 24 * 60 * 60 * 1000);
  const points = !Number.isFinite(ageYears) || ageYears < 0 ? 0 : ageYears >= 8 ? -18 : ageYears >= 5 ? -8 : 0;
  return {
    id: "content-freshness" as const,
    points,
    evidence: effectiveDate ? [effectiveDate, input.contentModifiedAt ? "modified" : "published"] : [],
  };
}

export function explainCandidateScore(input: CandidateInput, now = new Date()): BacklinkScoreExplanation {
  const host = new URL(input.pageUrl).hostname;
  const haystack = `${input.title} ${input.pageText.slice(0, 20_000)}`.toLocaleLowerCase("ca");
  const matchedTerms = input.campaign.topicTerms.filter((term) => haystack.includes(term.toLocaleLowerCase("ca")));
  const institutionalMarker = INSTITUTIONAL_HOST_MARKERS.find((marker) => host.includes(marker));
  const roleMailbox = Boolean(input.contactEmail && isRoleMailbox(input.contactEmail));
  const lowQualityMatch = haystack.match(/\b(fòrum|forum|comentaris|classified|casino|aposta|betting)\b/i)?.[0];
  const factors: BacklinkScoreExplanation["factors"] = [
    { id: "base", points: 30, evidence: [] },
    { id: "topic-relevance", points: Math.min(matchedTerms.length * 8, 32), evidence: matchedTerms },
    { id: "institutional-domain", points: institutionalMarker ? 14 : 0, evidence: institutionalMarker ? [institutionalMarker] : [] },
    { id: "role-mailbox", points: roleMailbox ? 14 : 0, evidence: input.contactEmail ? [input.contactEmail] : [] },
    { id: "external-link-propensity", points: outboundLinkPropensityScore(input.outboundLinkCount), evidence: [String(input.outboundLinkCount)] },
    contentFreshnessFactor(input, now),
    { id: "existing-link", points: input.hasExistingLink ? -100 : 0, evidence: [] },
    { id: "low-quality-signal", points: lowQualityMatch ? -40 : 0, evidence: lowQualityMatch ? [lowQualityMatch] : [] },
  ];
  const rawScore = factors.reduce((sum, factor) => sum + factor.points, 0);
  return {
    version: "backlink-score-v3",
    rawScore,
    finalScore: Math.max(0, Math.min(100, rawScore)),
    factors,
  };
}

export function scoreCandidate(input: CandidateInput, now = new Date()) {
  return explainCandidateScore(input, now).finalScore;
}

export function automaticEligibility(input: CandidateInput, minimumScore: number) {
  const score = scoreCandidate(input);
  if (input.hasExistingLink) return { eligible: false, score, reason: "existing-link" };
  if (!input.contactEmail) return { eligible: false, score, reason: "missing-contact" };
  if (!isRoleMailbox(input.contactEmail)) return { eligible: false, score, reason: "personal-mailbox" };
  if (score < minimumScore) return { eligible: false, score, reason: "low-score" };
  return { eligible: true, score, reason: "policy-passed" };
}

const OUTREACH_SIGNATURE_TEXT = [
  "Aleix Ventayol",
  "Autor i responsable de l’atles",
  "Bolets Atles",
  "Mapa, condicions i fitxes de bolets de Catalunya",
  "bolets.app",
].join("\n");

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]!);
}

function outreachSignatureHtml() {
  const siteUrl = escapeHtml(SITE_URL);
  const iconUrl = escapeHtml(new URL("/icons/icon-192.png", SITE_URL).toString());
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:18px;border-collapse:collapse;font-family:Arial,sans-serif;color:#393733">
  <tr>
    <td style="padding-right:14px;vertical-align:middle"><a href="${siteUrl}" style="text-decoration:none"><img src="${iconUrl}" width="72" height="72" alt="Bolets Atles" style="display:block;width:72px;height:72px;border:0;border-radius:16px"></a></td>
    <td style="padding-left:14px;border-left:2px solid #c45a2a;vertical-align:middle">
      <div style="font-size:16px;font-weight:700;line-height:1.35">Aleix Ventayol</div>
      <div style="font-size:13px;line-height:1.45;color:#6b675f">Autor i responsable de l’atles</div>
      <div style="font-size:14px;font-weight:700;line-height:1.45"><a href="${siteUrl}" style="color:#8c4a2f;text-decoration:none">Bolets Atles</a></div>
      <div style="font-size:13px;line-height:1.45;color:#6b675f">Mapa, condicions i fitxes de bolets de Catalunya</div>
      <div style="font-size:13px;font-weight:700;line-height:1.45"><a href="${siteUrl}" style="color:#c45a2a;text-decoration:none">bolets.app</a></div>
    </td>
  </tr>
</table>`;
}

export function buildOutreachMessage(input: {
  campaign: BacklinkCampaign;
  organization: string;
  pageTitle: string;
  pageUrl: string;
  unsubscribeUrl: string;
}) {
  const targetUrl = new URL(input.campaign.targetPath, SITE_URL).toString();
  const greeting = `Hola, equip de ${input.organization},`;
  const context = `Hem trobat la vostra pàgina «${input.pageTitle}» (${input.pageUrl}) mentre revisàvem recursos públics sobre bolets a Catalunya.`;
  const resource = `A Bolets Atles mantenim ${input.campaign.resourceSummary}: ${input.campaign.targetTitle} (${targetUrl}).`;
  const request = "Si creieu que pot ser útil als vostres lectors, podeu citar-lo com a recurs complementari. No demanem cap intercanvi ni oferim cap compensació.";
  const closing = `Si no encaixa, no cal que respongueu. No tornarem a escriure sobre aquesta pàgina. Podeu evitar qualsevol comunicació futura aquí: ${input.unsubscribeUrl}`;
  const html = `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.55;color:#393733">
  <p>${escapeHtml(greeting)}</p>
  <p>Hem trobat la vostra pàgina «${escapeHtml(input.pageTitle)}» (<a href="${escapeHtml(input.pageUrl)}" style="color:#31523f">${escapeHtml(input.pageUrl)}</a>) mentre revisàvem recursos públics sobre bolets a Catalunya.</p>
  <p>A Bolets Atles mantenim ${escapeHtml(input.campaign.resourceSummary)}: <a href="${escapeHtml(targetUrl)}" style="color:#31523f">${escapeHtml(input.campaign.targetTitle)}</a>.</p>
  <p>${escapeHtml(request)}</p>
  <p>Si no encaixa, no cal que respongueu. No tornarem a escriure sobre aquesta pàgina. Podeu evitar qualsevol comunicació futura <a href="${escapeHtml(input.unsubscribeUrl)}" style="color:#31523f">aquí</a>.</p>
  <p style="margin-bottom:0">Gràcies,</p>
  ${outreachSignatureHtml()}
</div>`;
  return {
    subject: `Recurs sobre bolets per a «${input.pageTitle.slice(0, 72)}»`,
    text: `${greeting}\n\n${context}\n\n${resource}\n\n${request}\n\n${closing}\n\nGràcies,\n${OUTREACH_SIGNATURE_TEXT}`,
    html,
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
