import fs from "node:fs/promises";
import path from "node:path";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const root = "/Users/aleix.ventayol/Documents/ChatGPT/Bolets";
const outputDir = path.join(root, "outputs", "seo-review-2026-09-02");
const previewDir = path.join(outputDir, "previews");
const outputPath = path.join(outputDir, "bolets-seo-review-2026-09-02.xlsx");
const data = JSON.parse(await fs.readFile(path.join(root, ".codex-tmp", "seo-review-data.json"), "utf8"));
await fs.mkdir(previewDir, { recursive: true });

const wb = Workbook.create();
const C = {
  forest: "#234236",
  moss: "#607A4B",
  cream: "#F5F0E6",
  pale: "#E8EEE8",
  amber: "#C78B3C",
  rust: "#9C4F3C",
  ink: "#1F2925",
  muted: "#647169",
  white: "#FFFFFF",
  line: "#D9E0DA",
  redPale: "#F8E7E2",
  amberPale: "#F8EEDC",
  greenPale: "#E3EFE6",
};

function title(sheet, range, text, subtitle) {
  sheet.mergeCells(range);
  const r = sheet.getRange(range);
  r.values = [[text]];
  r.format = { fill: C.forest, font: { bold: true, color: C.white, size: 20 }, verticalAlignment: "center" };
  r.format.rowHeight = 34;
  if (subtitle) {
    const row = Number(range.match(/\d+/)?.[0] ?? 1) + 1;
    sheet.mergeCells(`A${row}:N${row}`);
    const s = sheet.getRange(`A${row}:N${row}`);
    s.values = [[subtitle]];
    s.format = { fill: C.cream, font: { italic: true, color: C.muted, size: 10 }, wrapText: true };
    s.format.rowHeight = 28;
  }
}

function section(sheet, range, text) {
  sheet.mergeCells(range);
  const r = sheet.getRange(range);
  r.values = [[text]];
  r.format = { fill: C.moss, font: { bold: true, color: C.white, size: 12 }, verticalAlignment: "center" };
  r.format.rowHeight = 23;
}

function header(range) {
  range.format = {
    fill: C.forest,
    font: { bold: true, color: C.white },
    wrapText: true,
    verticalAlignment: "center",
    borders: { preset: "all", style: "thin", color: C.line },
  };
  range.format.rowHeight = 30;
}

function body(range) {
  range.format = {
    font: { color: C.ink },
    verticalAlignment: "top",
    wrapText: true,
    borders: { preset: "all", style: "thin", color: C.line },
  };
}

function setWidths(sheet, widths) {
  for (const [col, width] of Object.entries(widths)) sheet.getRange(`${col}:${col}`).format.columnWidth = width;
}

// Executive Summary
{
  const s = wb.worksheets.add("Executive Summary");
  s.showGridLines = false;
  title(s, "A1:N1", "Bolets.app — SEO Review", `Snapshot ${data.snapshot_date} · Spain/Catalonia · Google Search Console + SE Ranking + competitor research`);
  section(s, "A4:N4", "Executive diagnosis");
  s.mergeCells("A5:N6");
  s.getRange("A5:N6").values = [["Strong technical foundations and early search traction, but growth is constrained by 40 discovered-not-indexed pages, low CTR on high-impression hubs, narrow practical-content coverage, and almost no measurable authority. The fastest path is to improve indexation and snippets, then expand into bilingual names, responsible hunting guidance, preservation, recipes, and confusion/safety clusters."]];
  s.getRange("A5:N6").format = { fill: C.pale, font: { color: C.ink, size: 11 }, wrapText: true, verticalAlignment: "center", borders: { preset: "outside", style: "thin", color: C.line } };

  const kpis = [
    ["GSC clicks", data.gsc.clicks, "Available data: 11–31 Aug"],
    ["GSC impressions", data.gsc.impressions, "Search visibility"],
    ["GSC CTR", data.gsc.ctr, "Click-through rate"],
    ["Avg position", data.gsc.average_position, "GSC weighted average"],
    ["Indexed pages", data.gsc.indexed_pages, `${data.gsc.not_indexed_pages} not indexed`],
    ["SE audit score", data.audit.score, `${data.audit.errors} errors`],
    ["SE visibility", data.project_summary.visibility_percent / 100, "Tracked-project visibility"],
    ["Domain Trust", data.audit.domain_trust, "Authority bottleneck"],
  ];
  const starts = ["A8", "D8", "G8", "J8", "A12", "D12", "G12", "J12"];
  starts.forEach((cell, i) => {
    const col = cell.match(/[A-Z]+/)[0];
    const row = Number(cell.match(/\d+/)[0]);
    const end = String.fromCharCode(col.charCodeAt(0) + 2);
    s.mergeCells(`${col}${row}:${end}${row}`);
    s.mergeCells(`${col}${row + 1}:${end}${row + 1}`);
    s.mergeCells(`${col}${row + 2}:${end}${row + 2}`);
    s.getRange(`${col}${row}:${end}${row}`).values = [[kpis[i][0]]];
    s.getRange(`${col}${row}:${end}${row}`).format = { fill: C.forest, font: { bold: true, color: C.white, size: 10 }, horizontalAlignment: "center" };
    s.getRange(`${col}${row + 1}:${end}${row + 1}`).values = [[kpis[i][1]]];
    s.getRange(`${col}${row + 1}:${end}${row + 1}`).format = { fill: C.cream, font: { bold: true, color: C.ink, size: 18 }, horizontalAlignment: "center" };
    s.getRange(`${col}${row + 2}:${end}${row + 2}`).values = [[kpis[i][2]]];
    s.getRange(`${col}${row + 2}:${end}${row + 2}`).format = { fill: C.cream, font: { color: C.muted, size: 9 }, horizontalAlignment: "center" };
  });
  s.getRange("G9:I9").format.numberFormat = "0.00%";
  s.getRange("G13:I13").format.numberFormat = "0.00%";
  section(s, "A17:N17", "Recommended 90-day sequence");
  const actions = [
    ["P1", "Indexation", "Investigate 40 discovered-not-indexed URLs; validate sitemap value, internal linking, canonicals, and old /species redirects.", "2–3 weeks"],
    ["P1", "CTR", "Rewrite titles/descriptions for /bolets and /bolets-d-estiu; align snippets with high-impression query language.", "2 weeks"],
    ["P1", "Near-win rankings", "Refresh pages targeting ceps, poisonous lookalikes, rossinyol, pinetells, spring mushrooms, and cama de perdiu.", "3–6 weeks"],
    ["P1", "Content expansion", "Ship bilingual glossary, responsible hunting guide, preservation hub, and safety/confusion pages with strong internal links.", "4–8 weeks"],
    ["P2", "Authority", "Earn relevant citations from Catalan nature, tourism, forestry, and mycology organizations; GSC links data is still processing.", "Ongoing"],
  ];
  s.getRange("A18:N18").values = [["Priority", "Workstream", "Action", "Timing", "", "", "", "", "", "", "", "", "", ""]];
  s.mergeCells("C18:L18"); s.mergeCells("M18:N18");
  header(s.getRange("A18:N18"));
  actions.forEach((a, i) => {
    const r = 19 + i;
    s.getRange(`A${r}`).values = [[a[0]]];
    s.getRange(`B${r}`).values = [[a[1]]];
    s.mergeCells(`C${r}:L${r}`); s.getRange(`C${r}:L${r}`).values = [[a[2]]];
    s.mergeCells(`M${r}:N${r}`); s.getRange(`M${r}:N${r}`).values = [[a[3]]];
    body(s.getRange(`A${r}:N${r}`));
    s.getRange(`A${r}:N${r}`).format.fill = a[0] === "P1" ? C.redPale : C.amberPale;
    s.getRange(`A${r}:N${r}`).format.rowHeight = 38;
  });
  section(s, "A26:N26", "Top organic competitors — average visibility across three tracked engines");
  s.getRange("A27:B36").values = [["Domain", "Average visibility (%)"], ...data.competitors.map(x => [x.domain, x.average_visibility])];
  header(s.getRange("A27:B27")); body(s.getRange("A28:B36")); s.getRange("B28:B36").format.numberFormat = "0.00";
  const chart = s.charts.add("bar", s.getRange("A27:B36"));
  chart.title = "Competitor visibility gap";
  chart.hasLegend = false;
  chart.xAxis = { axisType: "textAxis", textStyle: { fontSize: 9 } };
  chart.yAxis = { numberFormatCode: "0.0" };
  chart.setPosition("D27", "N45");
  setWidths(s, { A: 14, B: 20, C: 13, D: 13, E: 13, F: 13, G: 13, H: 13, I: 13, J: 13, K: 13, L: 13, M: 13, N: 13 });
  s.freezePanes.freezeRows(2);
}

// Keyword clusters
{
  const s = wb.worksheets.add("Keyword Clusters");
  s.showGridLines = false;
  title(s, "A1:N1", "Keyword clusters and publishing map", "Search volume, difficulty and paid competition are SE Ranking estimates for Spain; paid competition is not SEO difficulty.");
  const headers = ["Cluster", "Keyword", "Volume / mo", "SEO difficulty", "Paid competition", "Intent", "Coverage", "Gap weight", "Opportunity score", "Priority", "Recommended URL", "Recommended action", "Source", "Source URL"];
  const rows = data.keywords.map(k => [k.cluster, k.keyword, k.volume, k.difficulty, k.competition, k.intent, k.coverage, null, null, k.priority, k.target, k.action, k.source, k.source_url]);
  s.getRange(`A4:N${rows.length + 4}`).values = [headers, ...rows];
  header(s.getRange("A4:N4")); body(s.getRange(`A5:N${rows.length + 4}`));
  for (let i = 0; i < rows.length; i++) {
    const r = i + 5;
    s.getRange(`H${r}`).formulas = [[`=IF(G${r}="Missing",1,IF(G${r}="Partial",0.7,0.4))`]];
    s.getRange(`I${r}`).formulas = [[`=IF(C${r}="","",ROUND(LN(C${r}+1)*(101-D${r})*H${r},1))`]];
    const fill = rows[i][9] === "P1" ? C.redPale : rows[i][9] === "P2" ? C.amberPale : C.greenPale;
    s.getRange(`J${r}`).format.fill = fill;
  }
  s.getRange(`C5:C${rows.length + 4}`).format.numberFormat = "#,##0";
  s.getRange(`D5:D${rows.length + 4}`).format.numberFormat = "0";
  s.getRange(`E5:E${rows.length + 4}`).format.numberFormat = "0.00";
  s.getRange(`H5:H${rows.length + 4}`).format.numberFormat = "0.0";
  s.getRange(`I5:I${rows.length + 4}`).format.numberFormat = "0.0";
  s.tables.add(`A4:N${rows.length + 4}`, true, "KeywordClustersTable");
  setWidths(s, { A: 21, B: 31, C: 12, D: 13, E: 14, F: 10, G: 12, H: 11, I: 15, J: 10, K: 35, L: 40, M: 25, N: 35 });
  s.freezePanes.freezeRows(4); s.freezePanes.freezeColumns(2);
}

// GSC performance
{
  const s = wb.worksheets.add("GSC Performance");
  s.showGridLines = false;
  title(s, "A1:J1", "Google Search Console performance", data.gsc.period_label);
  section(s, "A4:J4", "Core metrics");
  s.getRange("A5:H7").values = [
    ["Clicks", data.gsc.clicks, "Impressions", data.gsc.impressions, "CTR", data.gsc.ctr, "Average position", data.gsc.average_position],
    ["Indexed", data.gsc.indexed_pages, "Not indexed", data.gsc.not_indexed_pages, "Known pages", data.gsc.known_pages, "Sitemap URLs", data.gsc.sitemap_discovered],
    ["Sitemap status", data.gsc.sitemap_status, "Last read", data.gsc.sitemap_last_read, "", "", "", ""],
  ];
  header(s.getRange("A5:H5")); body(s.getRange("A6:H7")); s.getRange("F5").format.numberFormat = "0.0%";
  section(s, "A10:E10", "Top queries");
  const qRows = data.gsc.top_queries.map(q => [q.query, q.clicks, q.impressions, null]);
  s.getRange(`A11:D${qRows.length + 11}`).values = [["Query", "Clicks", "Impressions", "CTR"], ...qRows];
  header(s.getRange("A11:D11")); body(s.getRange(`A12:D${qRows.length + 11}`));
  for (let i = 0; i < qRows.length; i++) s.getRange(`D${i + 12}`).formulas = [[`=IF(C${i + 12}=0,0,B${i + 12}/C${i + 12})`]];
  s.getRange(`D12:D${qRows.length + 11}`).format.numberFormat = "0.00%";
  section(s, "F10:J10", "Top pages");
  const pRows = data.gsc.top_pages.map(p => [p.page, p.clicks, p.impressions, null]);
  s.getRange(`F11:I${pRows.length + 11}`).values = [["Page", "Clicks", "Impressions", "CTR"], ...pRows];
  header(s.getRange("F11:I11")); body(s.getRange(`F12:I${pRows.length + 11}`));
  for (let i = 0; i < pRows.length; i++) s.getRange(`I${i + 12}`).formulas = [[`=IF(H${i + 12}=0,0,G${i + 12}/H${i + 12})`]];
  s.getRange(`I12:I${pRows.length + 11}`).format.numberFormat = "0.00%";
  const start = Math.max(qRows.length, pRows.length) + 14;
  section(s, `A${start}:E${start}`, "Index coverage exclusions");
  const idxRows = data.gsc.non_index_reasons.map(x => [x.reason, x.pages]);
  s.getRange(`A${start + 1}:B${start + idxRows.length + 1}`).values = [["Reason", "Pages"], ...idxRows];
  header(s.getRange(`A${start + 1}:B${start + 1}`)); body(s.getRange(`A${start + 2}:B${start + idxRows.length + 1}`));
  setWidths(s, { A: 34, B: 11, C: 13, D: 12, E: 4, F: 55, G: 11, H: 13, I: 12, J: 4 });
  s.freezePanes.freezeRows(2);
}

// Current rankings
{
  const s = wb.worksheets.add("Rankings");
  s.showGridLines = false;
  title(s, "A1:H1", "Current tracked rankings", "SE Ranking snapshot 2026-09-02. Landing pages may include legacy tracker targets; validate current canonical redirects.");
  const headers = ["Engine", "Keyword", "Position", "Volume / mo", "Paid competition", "CPC", "Landing page", "Date"];
  const rows = data.rankings.map(r => [r.engine, r.keyword, r.position, r.volume, r.competition, r.cpc, r.landing_page, r.date]);
  s.getRange(`A4:H${rows.length + 4}`).values = [headers, ...rows];
  header(s.getRange("A4:H4")); body(s.getRange(`A5:H${rows.length + 4}`));
  for (let i = 0; i < rows.length; i++) {
    const pos = rows[i][2];
    s.getRange(`C${i + 5}`).format.fill = pos <= 10 ? C.greenPale : pos <= 20 ? C.amberPale : pos <= 50 ? C.cream : C.redPale;
  }
  s.getRange(`D5:D${rows.length + 4}`).format.numberFormat = "#,##0";
  s.getRange(`E5:F${rows.length + 4}`).format.numberFormat = "0.00";
  s.tables.add(`A4:H${rows.length + 4}`, true, "RankingsTable");
  setWidths(s, { A: 31, B: 33, C: 10, D: 12, E: 15, F: 10, G: 55, H: 13 });
  s.freezePanes.freezeRows(4); s.freezePanes.freezeColumns(2);
}

// Content gaps
{
  const s = wb.worksheets.add("Content Gaps");
  s.showGridLines = false;
  title(s, "A1:F1", "Content gap analysis", "Topics competitors cover more deeply, cross-checked against the current Bolets sitemap and tracked keyword opportunities.");
  const headers = ["Priority", "Topic", "Current status", "Competitor / keyword evidence", "Recommended asset", "Editorial guardrail"];
  const rows = data.content_gaps.map(g => [g.priority, g.topic, g.status, g.competitor_evidence, g.recommended_asset, g.risk_note]);
  s.getRange(`A4:F${rows.length + 4}`).values = [headers, ...rows];
  header(s.getRange("A4:F4")); body(s.getRange(`A5:F${rows.length + 4}`));
  rows.forEach((r, i) => {
    s.getRange(`A${i + 5}:F${i + 5}`).format.fill = r[0] === "P1" ? C.redPale : r[0] === "P2" ? C.amberPale : C.greenPale;
    s.getRange(`A${i + 5}:F${i + 5}`).format.rowHeight = 58;
  });
  s.tables.add(`A4:F${rows.length + 4}`, true, "ContentGapsTable");
  setWidths(s, { A: 10, B: 27, C: 13, D: 48, E: 50, F: 50 });
  s.freezePanes.freezeRows(4);
}

// Competitors
{
  const s = wb.worksheets.add("Competitors");
  s.showGridLines = false;
  title(s, "A1:H1", "Organic competitor benchmark", "Visibility across the same 145 tracked terms; use directionally, not as total-market share.");
  const headers = ["Domain", "Google Spain — CA", "Google Spain — ES", "Google Mobile — Catalonia", "Average visibility"];
  const rows = data.competitors.map(c => [c.domain, c.google_spain_ca, c.google_spain_es, c.google_mobile_catalonia, c.average_visibility]);
  s.getRange(`A4:E${rows.length + 4}`).values = [headers, ...rows];
  header(s.getRange("A4:E4")); body(s.getRange(`A5:E${rows.length + 4}`));
  s.getRange(`B5:E${rows.length + 4}`).format.numberFormat = "0.00";
  const chart = s.charts.add("bar", s.getRange(`A4:E${rows.length + 4}`));
  chart.title = "Tracked visibility by engine";
  chart.hasLegend = true;
  chart.xAxis = { axisType: "textAxis", textStyle: { fontSize: 9 } };
  chart.yAxis = { numberFormatCode: "0.0" };
  chart.setPosition("G4", "N22");
  section(s, "A17:E17", "Interpretation");
  s.mergeCells("A18:E21");
  s.getRange("A18:E21").values = [["Bolets.com is the benchmark for Catalan hunting content and practical tools; La Casa de las Setas dominates broader Spanish educational demand. Regional players win with place specificity. Bolets.app can differentiate through trustworthy current conditions, canonical Catalan taxonomy, safe identification boundaries, and location guidance that never exposes sensitive ecological spots."]];
  s.getRange("A18:E21").format = { fill: C.pale, wrapText: true, verticalAlignment: "top", font: { color: C.ink }, borders: { preset: "outside", style: "thin", color: C.line } };
  setWidths(s, { A: 31, B: 18, C: 18, D: 24, E: 18, F: 4, G: 13, H: 13 });
  s.freezePanes.freezeRows(4);
}

// Technical audit
{
  const s = wb.worksheets.add("Technical Audit");
  s.showGridLines = false;
  title(s, "A1:G1", "Technical SEO audit", `SE Ranking audit ${data.audit.audit_time} · ${data.audit.crawled} URLs crawled`);
  s.getRange("A4:H6").values = [
    ["Audit score", data.audit.score, "Errors", data.audit.errors, "Warnings", data.audit.warnings, "Notices", data.audit.notices],
    ["Google index estimate", data.audit.index_google_estimate, "Domain Trust", data.audit.domain_trust, "", "", "", ""],
    ["Interpretation", "No critical crawl errors. Prioritize missing alt text, broken external links, and indexation; validate CSS/JS notices before acting.", "", "", "", "", "", ""],
  ];
  header(s.getRange("A4:H4")); body(s.getRange("A5:H6")); s.mergeCells("B6:H6");
  section(s, "A9:G9", "Issue inventory");
  const rows = data.audit.issues.map(i => [i.status, i.section, i.code, i.issue, i.count, i.status === "warning" ? "Investigate" : "Validate before action"]);
  s.getRange(`A10:F${rows.length + 10}`).values = [["Severity", "Section", "Code", "Issue", "Affected URLs", "Recommended handling"], ...rows];
  header(s.getRange("A10:F10")); body(s.getRange(`A11:F${rows.length + 10}`));
  rows.forEach((r, i) => s.getRange(`A${i + 11}:F${i + 11}`).format.fill = r[0] === "warning" ? C.redPale : C.cream);
  s.tables.add(`A10:F${rows.length + 10}`, true, "TechnicalIssuesTable");
  setWidths(s, { A: 14, B: 25, C: 24, D: 34, E: 15, F: 34, G: 4, H: 14 });
  s.freezePanes.freezeRows(2);
}

// Sources and limitations
{
  const s = wb.worksheets.add("Sources & Limits");
  s.showGridLines = false;
  title(s, "A1:E1", "Sources, methodology and limitations", "Use this sheet when interpreting or refreshing the review.");
  const rows = [
    ["Google Search Console", "First-party performance, pages, queries and index coverage", "2026-09-02", "https://search.google.com/search-console", "Selected 3 months, but available chart data covered 2026-08-11 to 2026-08-31. External-links report was still processing."],
    ["SE Ranking project", "Tracked rankings, visibility and project competitors", "2026-09-02", "https://seranking.com/", "145 tracked terms across Google Spain CA, Google Spain ES and Google Mobile Catalonia/CA. Visibility is project-specific."],
    ["SE Ranking keyword research", "Search volume, SEO difficulty, CPC and paid competition", "2026-09-02", "https://seranking.com/", "Spain database estimates. Paid competition represents advertisers, not organic difficulty. Seasonal mushroom demand can vary sharply."],
    ["SE Ranking site audit", "Technical issue inventory", "2026-08-25", "https://seranking.com/", "Counts can repeat across templates/pages. CSS and JS notices require validation before engineering work."],
    ["Bolets.com", "Catalan practical-content benchmark", "2026-09-02", "https://www.bolets.com/", "Reviewed rain-data and recipe coverage; use as evidence of topic depth, not as a template to copy."],
    ["La Casa de las Setas", "Spanish educational-content benchmark", "2026-09-02", "https://lacasadelassetas.com/blog/", "Reviewed tree/habitat and mycology-fundamentals coverage."],
    ["Bolets.app sitemap/repository", "Current owned-content inventory", "2026-09-02", "https://bolets.app/sitemap.xml", "Coverage classified as Existing, Partial or Missing based on current routed content and sitemap."],
    ["Limitation", "Bulk raw competitor keyword export", "2026-09-02", "", "The SE Ranking bulk export endpoint was unavailable; gaps are based on accessible competitor, related-keyword and tracked-project datasets."],
    ["Safety constraint", "Mushroom identification and foraging", "Ongoing", "https://canalaliments.gencat.cat/ca/coneix-aliments/bolets-tofona/bolets/", "Never imply edibility certainty, expert sign-off, or safe consumption from an image. Keep legal, ecological and poisoning guidance source-backed."],
  ];
  s.getRange(`A4:E${rows.length + 4}`).values = [["Source", "Used for", "Access date", "URL", "Notes / limitations"], ...rows];
  header(s.getRange("A4:E4")); body(s.getRange(`A5:E${rows.length + 4}`));
  s.getRange(`A5:E${rows.length + 4}`).format.rowHeight = 52;
  setWidths(s, { A: 28, B: 38, C: 14, D: 55, E: 72 });
  s.freezePanes.freezeRows(4);
}

// Verification: inspect key ranges, scan formulas, render every sheet, then export.
const sheetSummary = await wb.inspect({ kind: "sheet", include: "id,name" });
console.log("SHEETS", JSON.stringify(sheetSummary));
for (const name of ["Executive Summary", "Keyword Clusters", "GSC Performance", "Rankings", "Content Gaps", "Competitors", "Technical Audit", "Sources & Limits"]) {
  const preview = await wb.render({ sheetName: name, autoCrop: "all", scale: 0.8, format: "png" });
  await fs.writeFile(path.join(previewDir, `${name.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-")}.png`), new Uint8Array(await preview.arrayBuffer()));
}
const formulaCheck = await wb.inspect({ kind: "formula", sheetId: "Keyword Clusters", range: "H5:I76", maxChars: 12000, options: { maxResults: 200 } });
console.log("FORMULAS", JSON.stringify(formulaCheck));
const keywordCheck = await wb.inspect({ kind: "table", sheetId: "Keyword Clusters", range: "A1:N14", include: "values,formulas", maxChars: 12000 });
console.log("KEYWORDS", JSON.stringify(keywordCheck));
const gscCheck = await wb.inspect({ kind: "table", sheetId: "GSC Performance", range: "A1:J30", include: "values,formulas", maxChars: 12000 });
console.log("GSC", JSON.stringify(gscCheck));

const xlsx = await SpreadsheetFile.exportXlsx(wb);
await xlsx.save(outputPath);
console.log(`OUTPUT ${outputPath}`);
