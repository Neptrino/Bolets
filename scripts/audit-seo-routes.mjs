import { writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const DEFAULT_BASE_URL = "https://bolets.app";
const DEFAULT_CONCURRENCY = 8;

function decodeEntities(value) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}

function stripMarkup(value) {
  return decodeEntities(value.replaceAll(/<[^>]+>/g, " ").replaceAll(/\s+/g, " ").trim());
}

function attribute(tag, name) {
  const quoted = tag.match(new RegExp(`\\b${name}\\s*=\\s*(["'])(.*?)\\1`, "i"));
  if (quoted) return decodeEntities(quoted[2].trim());
  const unquoted = tag.match(new RegExp(`\\b${name}\\s*=\\s*([^\\s>]+)`, "i"));
  return unquoted ? decodeEntities(unquoted[1].trim()) : undefined;
}

export function extractSitemapLocations(xml) {
  return [...xml.matchAll(/<loc(?:\s[^>]*)?>([\s\S]*?)<\/loc>/gi)]
    .map((match) => stripMarkup(match[1]))
    .filter(Boolean);
}

export function inspectHtml(html, pageUrl, siteOrigin = new URL(pageUrl).origin) {
  const titleMatch = html.match(/<title(?:\s[^>]*)?>([\s\S]*?)<\/title>/i);
  const h1Matches = [...html.matchAll(/<h1(?:\s[^>]*)?>([\s\S]*?)<\/h1>/gi)];
  const metaTags = [...html.matchAll(/<meta\b[^>]*>/gi)].map((match) => match[0]);
  const linkTags = [...html.matchAll(/<link\b[^>]*>/gi)].map((match) => match[0]);
  const anchorTags = [...html.matchAll(/<a\b[^>]*>/gi)].map((match) => match[0]);
  const descriptionTag = metaTags.find((tag) => attribute(tag, "name")?.toLowerCase() === "description");
  const robotsTag = metaTags.find((tag) => attribute(tag, "name")?.toLowerCase() === "robots");
  const canonicalTag = linkTags.find((tag) => attribute(tag, "rel")?.toLowerCase().split(/\s+/).includes("canonical"));
  const internalLinks = new Set();

  for (const tag of anchorTags) {
    const href = attribute(tag, "href");
    if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:") || href.startsWith("javascript:")) continue;
    try {
      const target = new URL(href, pageUrl);
      if (target.origin !== siteOrigin) continue;
      target.hash = "";
      target.search = "";
      internalLinks.add(target.toString().replace(/\/$/, "") || siteOrigin);
    } catch {
      // Ignore malformed links; the route report remains useful for valid URLs.
    }
  }

  const robots = attribute(robotsTag ?? "", "content")?.toLowerCase() ?? "";
  return {
    title: titleMatch ? stripMarkup(titleMatch[1]) : "",
    description: attribute(descriptionTag ?? "", "content") ?? "",
    h1: h1Matches.map((match) => stripMarkup(match[1])).filter(Boolean),
    canonical: attribute(canonicalTag ?? "", "href") ?? "",
    noindex: robots.split(",").some((directive) => directive.trim() === "noindex"),
    internalLinks: [...internalLinks],
  };
}

function parseArguments(argv) {
  const options = { baseUrl: DEFAULT_BASE_URL, concurrency: DEFAULT_CONCURRENCY, limit: undefined, output: undefined };
  for (const arg of argv) {
    if (arg.startsWith("--base-url=")) options.baseUrl = arg.slice("--base-url=".length);
    else if (arg.startsWith("--concurrency=")) options.concurrency = Number(arg.slice("--concurrency=".length));
    else if (arg.startsWith("--limit=")) options.limit = Number(arg.slice("--limit=".length));
    else if (arg.startsWith("--output=")) options.output = arg.slice("--output=".length);
    else if (arg === "--help") options.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  if (!Number.isInteger(options.concurrency) || options.concurrency < 1 || options.concurrency > 32) throw new Error("--concurrency must be an integer between 1 and 32");
  if (options.limit !== undefined && (!Number.isInteger(options.limit) || options.limit < 1)) throw new Error("--limit must be a positive integer");
  options.baseUrl = new URL(options.baseUrl).origin;
  return options;
}

async function fetchText(url) {
  const response = await fetch(url, { headers: { "user-agent": "BoletsSEOAudit/1.0" }, redirect: "follow" });
  const body = await response.text();
  return { body, status: response.status, finalUrl: response.url };
}

async function loadSitemap(url, seen = new Set()) {
  if (seen.has(url)) return [];
  seen.add(url);
  const { body, status } = await fetchText(url);
  if (status < 200 || status >= 300) throw new Error(`Sitemap returned HTTP ${status}: ${url}`);
  const locations = extractSitemapLocations(body);
  if (!/<sitemapindex\b/i.test(body)) return locations;
  const nested = await Promise.all(locations.map((location) => loadSitemap(location, seen)));
  return nested.flat();
}

async function mapConcurrent(values, concurrency, mapper) {
  const results = new Array(values.length);
  let cursor = 0;
  async function worker() {
    while (cursor < values.length) {
      const index = cursor++;
      results[index] = await mapper(values[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, values.length) }, worker));
  return results;
}

function duplicateGroups(pages, field) {
  const groups = new Map();
  for (const page of pages) {
    const value = page[field];
    if (!value) continue;
    groups.set(value, [...(groups.get(value) ?? []), page.url]);
  }
  return [...groups.entries()]
    .filter(([, urls]) => urls.length > 1)
    .map(([value, urls]) => ({ value, urls }));
}

export function summarizeAudit(pages, sitemapUrls) {
  const sitemapSet = new Set(sitemapUrls.map((url) => url.replace(/\/$/, "")));
  const inbound = new Map([...sitemapSet].map((url) => [url, 0]));
  for (const page of pages) {
    for (const link of page.internalLinks ?? []) {
      if (sitemapSet.has(link)) inbound.set(link, (inbound.get(link) ?? 0) + 1);
    }
  }

  const failures = pages.filter((page) => page.status < 200 || page.status >= 400);
  const missingTitles = pages.filter((page) => !page.title);
  const missingDescriptions = pages.filter((page) => !page.description);
  const missingH1 = pages.filter((page) => page.h1.length === 0);
  const multipleH1 = pages.filter((page) => page.h1.length > 1);
  const missingCanonicals = pages.filter((page) => !page.canonical);
  const noindexInSitemap = pages.filter((page) => page.noindex);
  const orphanCandidates = pages.filter((page) => (inbound.get(page.url.replace(/\/$/, "")) ?? 0) === 0 && new URL(page.url).pathname !== "/");
  const legacySpeciesUrls = sitemapUrls.filter((url) => new URL(url).pathname.startsWith("/species/"));

  return {
    checkedAt: new Date().toISOString(),
    totals: { sitemapUrls: sitemapUrls.length, checkedPages: pages.length },
    critical: {
      failures,
      missingTitles: missingTitles.map((page) => page.url),
      missingDescriptions: missingDescriptions.map((page) => page.url),
      missingH1: missingH1.map((page) => page.url),
      missingCanonicals: missingCanonicals.map((page) => page.url),
      noindexInSitemap: noindexInSitemap.map((page) => page.url),
      legacySpeciesUrls,
    },
    warnings: {
      multipleH1: multipleH1.map((page) => ({ url: page.url, count: page.h1.length })),
      duplicateTitles: duplicateGroups(pages, "title"),
      duplicateDescriptions: duplicateGroups(pages, "description"),
      orphanCandidates: orphanCandidates.map((page) => page.url),
      longTitles: pages.filter((page) => page.title.length > 60).map((page) => ({ url: page.url, length: page.title.length })),
      longDescriptions: pages.filter((page) => page.description.length > 160).map((page) => ({ url: page.url, length: page.description.length })),
    },
  };
}

function countIssues(group) {
  return Object.values(group).reduce((total, issues) => total + issues.length, 0);
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  if (options.help) {
    console.log("Usage: npm run seo:audit -- [--base-url=http://localhost:3101] [--limit=25] [--concurrency=8] [--output=report.json]");
    return;
  }

  const sitemapUrl = `${options.baseUrl}/sitemap.xml`;
  const discoveredUrls = await loadSitemap(sitemapUrl);
  const allUrls = discoveredUrls.map((url) => {
    const discovered = new URL(url);
    return new URL(`${discovered.pathname}${discovered.search}`, options.baseUrl).toString();
  });
  const scopedUrls = options.limit ? allUrls.slice(0, options.limit) : allUrls;
  console.log(`Auditing ${scopedUrls.length} routes from ${sitemapUrl}`);
  const pages = await mapConcurrent(scopedUrls, options.concurrency, async (url) => {
    try {
      const response = await fetchText(url);
      return { url: url.replace(/\/$/, ""), status: response.status, finalUrl: response.finalUrl, ...inspectHtml(response.body, url, options.baseUrl) };
    } catch (error) {
      return { url: url.replace(/\/$/, ""), status: 0, finalUrl: url, title: "", description: "", h1: [], canonical: "", noindex: false, internalLinks: [], error: error instanceof Error ? error.message : String(error) };
    }
  });
  const report = summarizeAudit(pages, scopedUrls);
  const criticalCount = countIssues(report.critical);
  const warningCount = countIssues(report.warnings);
  console.log(`SEO audit complete: ${criticalCount} critical issues, ${warningCount} warnings.`);
  for (const [name, issues] of Object.entries(report.critical)) if (issues.length) console.log(`- ${name}: ${issues.length}`);
  for (const [name, issues] of Object.entries(report.warnings)) if (issues.length) console.log(`- ${name}: ${issues.length}`);
  if (options.output) {
    await writeFile(options.output, `${JSON.stringify({ ...report, pages }, null, 2)}\n`, "utf8");
    console.log(`Report written to ${options.output}`);
  }
  if (criticalCount > 0) process.exitCode = 1;
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
