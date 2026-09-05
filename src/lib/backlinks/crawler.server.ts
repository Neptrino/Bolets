import "server-only";

import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { getDomain } from "tldts";

import { SITE_URL } from "@/src/lib/seo";
import { isRoleMailbox, normalizeEmail } from "@/src/lib/backlinks/policy";

const USER_AGENT = "BoletsAtles-Outreach/1.0 (+https://bolets.app/equip-editorial)";
const MAX_BYTES = 512_000;
const NON_EDITORIAL_EXTERNAL_HOSTS = [
  "facebook.com", "instagram.com", "linkedin.com", "pinterest.com", "tiktok.com",
  "t.me", "telegram.me", "twitter.com", "whatsapp.com", "x.com", "youtube.com",
  "profile.google.com",
];
const NON_EDITORIAL_CONTAINER_TAGS = new Set(["aside", "dialog", "footer", "form", "header", "nav"]);
const VOID_HTML_TAGS = new Set([
  "area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param",
  "source", "track", "wbr",
]);
const NON_EDITORIAL_SCOPE = /(?:^|[\s_-])(?:ads?|advert(?:isement)?|author|breadcrumb|captcha|comment(?:s|form)?|consent|cookie|gdpr|newsletter|pagination|pager|promo|recaptcha|recommend(?:ed|ations?)?|related|share|sharing|sidebar|social|subscribe|tags?|toolbar|utility)(?:$|[\s_-])/i;
const EDITORIAL_CONTENT_SCOPE = /(?:article[-_]body|article[-_]content|articlebody|content[-_]inner|entry[-_]content|post[-_]body|post[-_]content|story[-_]body|story[-_]content)/i;

function privateIpv4(address: string) {
  const parts = address.split(".").map(Number);
  if (parts.length !== 4) return true;
  const [a, b] = parts;
  return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254)
    || (a === 172 && b! >= 16 && b! <= 31) || (a === 192 && b === 168)
    || (a === 100 && b! >= 64 && b! <= 127) || a! >= 224;
}

function privateIpv6(address: string) {
  const normalized = address.toLowerCase();
  return normalized === "::" || normalized === "::1" || normalized.startsWith("fc")
    || normalized.startsWith("fd") || normalized.startsWith("fe8")
    || normalized.startsWith("fe9") || normalized.startsWith("fea")
    || normalized.startsWith("feb") || normalized.startsWith("::ffff:127.")
    || normalized.startsWith("::ffff:10.") || normalized.startsWith("::ffff:192.168.");
}

async function assertPublicUrl(input: URL) {
  if (!['http:', 'https:'].includes(input.protocol)) throw new Error("unsupported-protocol");
  if (input.port && !["80", "443"].includes(input.port)) throw new Error("unsupported-port");
  const hostname = input.hostname.toLowerCase();
  if (hostname === "localhost" || hostname.endsWith(".localhost") || hostname.endsWith(".local")) {
    throw new Error("private-host");
  }
  const addresses = await lookup(hostname, { all: true, verbatim: true });
  if (!addresses.length) throw new Error("unresolved-host");
  for (const { address } of addresses) {
    const version = isIP(address);
    if (!version || (version === 4 ? privateIpv4(address) : privateIpv6(address))) {
      throw new Error("private-address");
    }
  }
}

async function readLimitedText(response: Response) {
  const length = Number(response.headers.get("content-length") ?? 0);
  if (length > MAX_BYTES) throw new Error("response-too-large");
  if (!response.body) return "";
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BYTES) {
      await reader.cancel();
      throw new Error("response-too-large");
    }
    chunks.push(value);
  }
  const joined = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    joined.set(chunk, offset);
    offset += chunk.length;
  }
  return new TextDecoder().decode(joined);
}

export async function fetchPublicText(value: string, accept = "text/html", redirects = 0): Promise<{ url: string; text: string }> {
  if (redirects > 3) throw new Error("too-many-redirects");
  const url = new URL(value);
  await assertPublicUrl(url);
  const response = await fetch(url, {
    cache: "no-store",
    headers: { Accept: accept, "User-Agent": USER_AGENT },
    redirect: "manual",
    signal: AbortSignal.timeout(8_000),
  });
  if (response.status >= 300 && response.status < 400) {
    const location = response.headers.get("location");
    if (!location) throw new Error("redirect-without-location");
    return fetchPublicText(new URL(location, url).toString(), accept, redirects + 1);
  }
  if (!response.ok) throw new Error(`upstream-${response.status}`);
  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
  if (accept === "text/html" && !contentType.includes("text/html") && !contentType.includes("application/xhtml")) {
    throw new Error("unsupported-content-type");
  }
  return { url: url.toString(), text: await readLimitedText(response) };
}

function decodeHtml(value: string) {
  return value
    .replaceAll("&amp;", "&").replaceAll("&quot;", '"').replaceAll("&#39;", "'")
    .replaceAll("&apos;", "'").replaceAll("&lt;", "<").replaceAll("&gt;", ">")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)));
}

function textContent(html: string) {
  return decodeHtml(html
    .replace(/<(script|style|noscript|svg)[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim());
}

function attribute(tag: string, name: string) {
  return decodeHtml(tag.match(new RegExp(`\\b${name}\\s*=\\s*["']([^"']+)["']`, "i"))?.[1] ?? "");
}

function pageTitle(html: string, fallback: string) {
  const title = textContent(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "");
  return (title || fallback).slice(0, 500);
}

function organizationName(html: string, host: string) {
  const ogSite = html.match(/<meta[^>]+property=["']og:site_name["'][^>]*>/i)?.[0]
    ?? html.match(/<meta[^>]+content=["'][^"']+["'][^>]+property=["']og:site_name["'][^>]*>/i)?.[0];
  const value = ogSite ? attribute(ogSite, "content") : "";
  return (value || host.replace(/^www\./, "").split(".")[0] || host).slice(0, 300);
}

function normalizedContentDate(value: unknown) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}/.test(value.trim())) return null;
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp) || timestamp > Date.now() + 86_400_000) return null;
  return new Date(timestamp).toISOString();
}

function structuredContentDates(html: string) {
  const published: string[] = [];
  const modified: string[] = [];
  for (const match of html.matchAll(/<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const parsed = JSON.parse(match[1]!.trim()) as unknown;
      const roots = Array.isArray(parsed) ? parsed : parsed && typeof parsed === "object" && Array.isArray((parsed as Record<string, unknown>)["@graph"])
        ? (parsed as Record<string, unknown>)["@graph"] as unknown[]
        : [parsed];
      for (const root of roots) {
        if (!root || typeof root !== "object" || Array.isArray(root)) continue;
        const node = root as Record<string, unknown>;
        const types = Array.isArray(node["@type"]) ? node["@type"] : [node["@type"]];
        if (!types.some((type) => typeof type === "string" && /(article|posting|webpage)/i.test(type))) continue;
        const publishedAt = normalizedContentDate(node.datePublished);
        const modifiedAt = normalizedContentDate(node.dateModified);
        if (publishedAt) published.push(publishedAt);
        if (modifiedAt) modified.push(modifiedAt);
      }
    } catch { /* Ignore malformed third-party structured data. */ }
  }
  return { published, modified };
}

function contentDates(html: string) {
  const structured = structuredContentDates(html);
  const published = [...structured.published];
  const modified = [...structured.modified];
  for (const match of html.matchAll(/<meta\b[^>]*>/gi)) {
    const tag = match[0];
    const key = (attribute(tag, "property") || attribute(tag, "name") || attribute(tag, "itemprop")).toLowerCase();
    const value = normalizedContentDate(attribute(tag, "content"));
    if (!value) continue;
    if (/published|publishdate|pub_date|datecreated|created/.test(key)) published.push(value);
    if (/modified|lastmod|updated/.test(key)) modified.push(value);
  }
  const latest = (values: string[]) => values.sort((left, right) => Date.parse(right) - Date.parse(left))[0] ?? null;
  const publishedAt = latest(published);
  const modifiedCandidate = latest(modified);
  const modifiedAt = modifiedCandidate && (!publishedAt || Date.parse(modifiedCandidate) >= Date.parse(publishedAt)) ? modifiedCandidate : null;
  return { publishedAt, modifiedAt };
}

function emailsIn(html: string, pageHost: string) {
  const searchableHtml = html.replace(/<(script|style|noscript|svg|template)\b[^>]*>[\s\S]*?<\/\1>/gi, " ");
  const decoded = decodeHtml(searchableHtml).replace(/\s+(?:\[at\]|\(at\))\s+/gi, "@");
  const matches = decoded.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) ?? [];
  return [...new Set(matches
    .map(normalizeEmail)
    .filter((email): email is string => Boolean(email))
    .filter((email) => relatedHost(email.split("@")[1]!, pageHost)))];
}

function contactLinks(html: string, base: URL) {
  return [...html.matchAll(/<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>/gi)]
    .map((match) => decodeHtml(match[1]!))
    .filter((href) => /contact|contacte|qui-som|equip|premsa|comunicacio/i.test(href))
    .flatMap((href) => {
      try {
        const url = new URL(href, base);
        return url.hostname === base.hostname ? [url.toString()] : [];
      } catch { return []; }
    })
    .slice(0, 2);
}

function relatedHost(candidate: string, source: string) {
  const candidateDomain = getDomain(candidate) ?? candidate.replace(/^www\./, "");
  const sourceDomain = getDomain(source) ?? source.replace(/^www\./, "");
  return candidateDomain === sourceDomain;
}

function listedHost(candidate: string, listed: string) {
  return candidate === listed || candidate.endsWith(`.${listed}`);
}

function scopeAttributes(tag: string) {
  return ["class", "id", "itemprop", "role", "aria-label"]
    .map((name) => attribute(tag, name))
    .filter(Boolean)
    .join(" ");
}

function editorialRootMode(html: string): "marked" | "article" | "main" | "all" {
  for (const match of html.matchAll(/<[a-z][^>]*>/gi)) {
    if (EDITORIAL_CONTENT_SCOPE.test(scopeAttributes(match[0]))) return "marked";
  }
  if (/<article\b/i.test(html)) return "article";
  if (/<main\b/i.test(html)) return "main";
  return "all";
}

function outboundEditorialLinkCount(html: string, base: URL) {
  const siteHost = new URL(SITE_URL).hostname;
  const structuralHtml = html
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(script|style|noscript|svg|template)\b[^>]*>[\s\S]*?<\/\1>/gi, " ");
  const rootMode = editorialRootMode(structuralHtml);
  const links = new Set<string>();

  type Scope = { tag: string; excluded: boolean; markedRoot: boolean; articleRoot: boolean; mainRoot: boolean };
  const scopes: Scope[] = [];
  for (const match of structuralHtml.matchAll(/<\/?([a-z][\w:-]*)\b[^>]*>/gi)) {
    const tagMarkup = match[0];
    const tag = match[1]!.toLowerCase();
    if (tagMarkup.startsWith("</")) {
      let openingIndex = -1;
      for (let index = scopes.length - 1; index >= 0; index -= 1) {
        if (scopes[index]?.tag === tag) {
          openingIndex = index;
          break;
        }
      }
      if (openingIndex >= 0) scopes.length = openingIndex;
      continue;
    }

    const parent = scopes.at(-1);
    const markers = scopeAttributes(tagMarkup);
    const scope: Scope = {
      tag,
      excluded: Boolean(parent?.excluded || NON_EDITORIAL_CONTAINER_TAGS.has(tag) || NON_EDITORIAL_SCOPE.test(markers)),
      markedRoot: Boolean(parent?.markedRoot || EDITORIAL_CONTENT_SCOPE.test(markers)),
      articleRoot: Boolean(parent?.articleRoot || tag === "article"),
      mainRoot: Boolean(parent?.mainRoot || tag === "main"),
    };
    const inEditorialContent = rootMode === "all"
      || (rootMode === "marked" && scope.markedRoot)
      || (rootMode === "article" && scope.articleRoot)
      || (rootMode === "main" && scope.mainRoot);

    if (tag === "a" && !scope.excluded && inEditorialContent) {
      const href = attribute(tagMarkup, "href");
      if (href) {
        try {
          const linked = new URL(href, base);
          if (!["http:", "https:"].includes(linked.protocol)) continue;
          if (relatedHost(linked.hostname, base.hostname) || relatedHost(linked.hostname, siteHost)) continue;
          if (NON_EDITORIAL_EXTERNAL_HOSTS.some((host) => listedHost(linked.hostname, host))) continue;
          if (/\bsponsored\b/i.test(attribute(tagMarkup, "rel"))) continue;
          linked.hash = "";
          links.add(linked.toString());
        } catch { /* Ignore malformed and unsupported links. */ }
      }
    }

    if (!VOID_HTML_TAGS.has(tag) && !tagMarkup.endsWith("/>")) scopes.push(scope);
  }
  return Math.min(links.size, 500);
}

export function inspectHtml(html: string, pageUrl: string, fallbackTitle = "Recurs sobre bolets") {
  const url = new URL(pageUrl);
  const siteHost = new URL(SITE_URL).hostname;
  let existingLink: { rel: string | null; anchor: string | null } | null = null;
  for (const match of html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)) {
    const href = attribute(match[0], "href");
    try {
      const linked = new URL(href, url);
      if (linked.hostname === siteHost || linked.hostname.endsWith(`.${siteHost}`)) {
        existingLink = {
          rel: attribute(match[0], "rel") || null,
          anchor: textContent(match[2] ?? "").slice(0, 500) || null,
        };
        break;
      }
    } catch { /* Ignore malformed author links. */ }
  }
  const dates = contentDates(html);
  return {
    title: pageTitle(html, fallbackTitle),
    organization: organizationName(html, url.hostname),
    pageText: textContent(html).slice(0, 30_000),
    emails: emailsIn(html, url.hostname),
    contactLinks: contactLinks(html, url),
    outboundLinkCount: outboundEditorialLinkCount(html, url),
    contentPublishedAt: dates.publishedAt,
    contentModifiedAt: dates.modifiedAt,
    existingLink,
  };
}

function robotsAllows(robots: string, pathname: string) {
  let applies = false;
  for (const rawLine of robots.split(/\r?\n/)) {
    const line = rawLine.split("#")[0]!.trim();
    const [name, ...rest] = line.split(":");
    const value = rest.join(":").trim();
    if (name?.trim().toLowerCase() === "user-agent") applies = value === "*" || value.toLowerCase().includes("boletsatles-outreach");
    if (applies && name?.trim().toLowerCase() === "disallow" && value && pathname.startsWith(value)) return false;
  }
  return true;
}

export async function inspectPublicPage(pageUrl: string, fallbackTitle: string) {
  const requested = new URL(pageUrl);
  try {
    const robots = await fetchPublicText(new URL("/robots.txt", requested).toString(), "text/plain");
    if (!robotsAllows(robots.text, requested.pathname)) throw new Error("robots-disallowed");
  } catch (error) {
    if (error instanceof Error && error.message === "robots-disallowed") throw error;
    // An absent or unavailable robots file does not prohibit ordinary public fetching.
  }
  const page = await fetchPublicText(pageUrl);
  const inspection = inspectHtml(page.text, page.url, fallbackTitle);
  if (inspection.emails.some(isRoleMailbox) || inspection.existingLink) {
    return { ...inspection, finalUrl: page.url, contactSourceUrl: page.url };
  }
  for (const contactUrl of inspection.contactLinks) {
    try {
      const contact = await fetchPublicText(contactUrl);
      const contactInspection = inspectHtml(contact.text, contact.url, fallbackTitle);
      if (contactInspection.emails.length) {
        return {
          ...inspection,
          emails: [...new Set([...contactInspection.emails, ...inspection.emails])],
          finalUrl: page.url,
          contactSourceUrl: contact.url,
        };
      }
    } catch { /* Keep the original prospect when a contact page is unavailable. */ }
  }
  return { ...inspection, finalUrl: page.url, contactSourceUrl: page.url };
}
