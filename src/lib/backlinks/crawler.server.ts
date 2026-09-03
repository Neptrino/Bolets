import "server-only";

import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

import { SITE_URL } from "@/src/lib/seo";
import { normalizeEmail } from "@/src/lib/backlinks/policy";

const USER_AGENT = "BoletsAtles-Outreach/1.0 (+https://bolets.app/equip-editorial)";
const MAX_BYTES = 512_000;

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

function emailsIn(html: string) {
  const decoded = decodeHtml(html).replace(/\s+(?:\[at\]|\(at\))\s+/gi, "@");
  const matches = decoded.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) ?? [];
  return [...new Set(matches.map(normalizeEmail).filter((email): email is string => Boolean(email)))];
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
  return {
    title: pageTitle(html, fallbackTitle),
    organization: organizationName(html, url.hostname),
    pageText: textContent(html).slice(0, 30_000),
    emails: emailsIn(html),
    contactLinks: contactLinks(html, url),
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
  if (inspection.emails.length || inspection.existingLink) return { ...inspection, finalUrl: page.url, contactSourceUrl: page.url };
  for (const contactUrl of inspection.contactLinks) {
    try {
      const contact = await fetchPublicText(contactUrl);
      const contactInspection = inspectHtml(contact.text, contact.url, fallbackTitle);
      if (contactInspection.emails.length) {
        return { ...inspection, emails: contactInspection.emails, finalUrl: page.url, contactSourceUrl: contact.url };
      }
    } catch { /* Keep the original prospect when a contact page is unavailable. */ }
  }
  return { ...inspection, finalUrl: page.url, contactSourceUrl: page.url };
}
