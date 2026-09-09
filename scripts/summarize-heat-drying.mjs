import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { externalAbsolutePath, parseCliArguments } from "./lib/private-io.mjs";

const args = parseCliArguments();
if (args.has("help")) {
  console.log("Aggregate offline heat/drying replay: --input=<external candidate root> --thermal-inputs=<external inputs.jsonl>. Writes private comparison.json and finding-scores.csv. Groups bootstrap resamples by canonical cell, not species rows.");
  process.exit(0);
}
const root = externalAbsolutePath(args.get("input"), "--input");
const inputsPath = externalAbsolutePath(args.get("thermal-inputs"), "--thermal-inputs");
const jsonl = (file) => readFileSync(file, "utf8").trim().split("\n").map(JSON.parse);
const manifest = JSON.parse(readFileSync(join(root, "summary.json"), "utf8"));
const inputsText = readFileSync(inputsPath, "utf8");
if (createHash("sha256").update(inputsText).digest("hex") !== manifest.inputsSha256) throw new Error("Thermal inputs changed");
const groups = new Map();
for (const input of jsonl(inputsPath)) {
  const centre = JSON.stringify(input.centre);
  if (groups.has(input.record.location) && groups.get(input.record.location) !== centre) throw new Error("Location spans cells");
  groups.set(input.record.location, centre);
}
const fields = ["fruitingConditionsScore", "opportunityIndex"];
const mean = (xs) => xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
const pairWin = (a, b) => a > b ? 1 : a === b ? 0.5 : 0;
function auc(events, controls, field) {
  const a = events.filter((r) => Number.isFinite(r[field]));
  const b = controls.filter((r) => Number.isFinite(r[field]));
  return a.length && b.length ? a.reduce((sum, e) => sum + b.reduce((n, c) => n + pairWin(e[field], c[field]), 0), 0) / a.length / b.length : null;
}
function collapse(records) {
  const rows = new Map();
  for (const record of records) {
    const key = JSON.stringify([record.location, record.date, record.kind]);
    const previous = rows.get(key);
    if (!previous) rows.set(key, { ...record });
    else for (const field of fields) {
      previous[field] = [previous[field], record[field]].filter(Number.isFinite).length
        ? Math.max(...[previous[field], record[field]].filter(Number.isFinite)) : null;
    }
  }
  return [...rows.values()];
}
function metrics(rows) {
  const positive = rows.filter((r) => r.kind === "event");
  const control = rows.filter((r) => r.kind === "control");
  const negative = rows.filter((r) => r.kind === "observed-negative");
  const result = { events: positive.length, backgrounds: control.length, unsuccessfulSearches: negative.length };
  for (const field of fields) {
    result[field] = {
      aucBackground: auc(positive, control, field),
      aucAllControls: auc(positive, [...control, ...negative], field),
      aucUnsuccessful: auc(positive, negative, field),
      positiveMean: mean(positive.map((r) => r[field]).filter(Number.isFinite)),
      negativeMean: mean(negative.map((r) => r[field]).filter(Number.isFinite)),
      positiveAtLeast60: positive.filter((r) => r[field] >= 60).length,
      sameLocationAuc: mean(positive.map((r) => auc([r], control.filter((c) => c.location === r.location), field)).filter(Number.isFinite)),
    };
  }
  return result;
}
const variants = manifest.candidates.map((candidate) => {
  const raw = jsonl(join(root, candidate.name, "evaluation-records.jsonl"));
  const primary = raw.filter((r) => r.kind !== "event" || r.offsetDaysFromFinding === 0);
  return { candidate, primary, collapsed: collapse(primary) };
});
const baseline = variants[0];
const cellKeys = [...new Set(baseline.collapsed.filter((r) => r.kind === "event").map((r) => groups.get(r.location)))];
if (cellKeys.includes(undefined)) throw new Error("Missing bootstrap cell");
const count = cellKeys.length;
// The same draw is used for baseline and every candidate. Whole cell histories,
// all reports and matched dates move together; unsuccessful-only cells are
// reported separately and are not sampled as seasonal backgrounds.
function matrix(rows, field) {
  return cellKeys.flatMap((a) => cellKeys.map((b) => {
    const events = rows.filter((r) => r.kind === "event" && groups.get(r.location) === a && Number.isFinite(r[field]));
    const controls = rows.filter((r) => r.kind === "control" && groups.get(r.location) === b && Number.isFinite(r[field]));
    return [events.reduce((n, e) => n + controls.reduce((s, c) => s + pairWin(e[field], c[field]), 0), 0), events.length * controls.length];
  }));
}
const matrices = variants.map((v) => fields.map((f) => matrix(v.collapsed, f)));
const intervals = variants.map(() => fields.map(() => []));
let state = 20260909;
const random = () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296; };
for (let iteration = 0; iteration < 10000; iteration++) {
  const weights = Array(count).fill(0);
  for (let i = 0; i < count; i++) weights[Math.floor(random() * count)]++;
  const scores = matrices.map((byField) => byField.map((pairs) => {
    let wins = 0, total = 0;
    for (let a = 0; a < count; a++) for (let b = 0; b < count; b++) {
      const w = weights[a] * weights[b];
      wins += w * pairs[a * count + b][0]; total += w * pairs[a * count + b][1];
    }
    return total ? wins / total : null;
  }));
  scores.forEach((byField, v) => byField.forEach((score, f) => {
    if (score !== null && scores[0][f] !== null) intervals[v][f].push(score - scores[0][f]);
  }));
}
const report = {
  methodology: { exploratory: true, evaluationRole: "Supplementary historical whole-report comparison; use weather:evaluate-findings with original taxon grouping for primary metrics", collapsedBy: "maximum per report/date/kind", bootstrapCellCount: count,
    bootstrapIterations: 10000, seed: 20260909, confidence: "paired cell-cluster percentile interval, 95%",
    limitations: ["Previously inspected calibration data; not a held-out test", "Seasonal backgrounds are not observed absences",
      "Repeated species alternatives are not independent findings", "Very few unsuccessful searches", "No boundary validation in this experiment"] },
  provenance: manifest,
  variants: variants.map((v, i) => ({
    ...v.candidate,
    expanded: metrics(v.primary), collapsed: metrics(v.collapsed),
    august: metrics(v.collapsed.filter((r) => r.date.slice(5, 7) === "08")),
    byYear: Object.fromEntries([...new Set(v.collapsed.map((r) => r.date.slice(0, 4)))].sort().map((year) =>
      [year, metrics(v.collapsed.filter((r) => r.date.startsWith(year)))])),
    pairedAucDelta95: Object.fromEntries(fields.map((field, f) => {
      const sorted = intervals[i][f].sort((a, b) => a - b);
      return [field, [sorted[Math.floor(sorted.length * 0.025)], sorted[Math.floor(sorted.length * 0.975)]]];
    })),
  })),
};
const encoded = JSON.stringify(report, null, 2);
if (/latitude|longitude|cellId|weatherGrid|soilGrid/i.test(encoded)) throw new Error("Private geometry in aggregate report");
writeFileSync(join(root, "comparison.json"), encoded + "\n", { mode: 0o600 });
const header = ["date", "report", "kind", ...variants.flatMap((v) => fields.map((f) => `${v.candidate.name}:${f}`))];
const rows = baseline.collapsed.filter((r) => r.kind !== "control").sort((a, b) => a.date.localeCompare(b.date)).map((row) => [
  row.date, row.location, row.kind, ...variants.flatMap((v) => {
    const match = v.collapsed.find((r) => r.location === row.location && r.date === row.date && r.kind === row.kind);
    if (!match) throw new Error("Candidate missing a report");
    return fields.map((f) => match[f]);
  }),
]);
writeFileSync(join(root, "finding-scores.csv"), [header, ...rows].map((r) => r.join(",")).join("\n") + "\n", { mode: 0o600 });
console.log(JSON.stringify({ methodology: report.methodology, variants: report.variants.map((v) => ({
  name: v.name, collapsed: v.collapsed, august: v.august, pairedAucDelta95: v.pairedAucDelta95,
})) }, null, 2));
