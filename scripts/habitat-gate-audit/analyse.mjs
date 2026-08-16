import { readFileSync } from "node:fs";
const { points, cells, unmappedRgb } = JSON.parse(readFileSync("/tmp/gatework/cell-data.json", "utf8"));
const species = new Map(JSON.parse(readFileSync("/tmp/species-gates.json","utf8")).map(s=>[s.speciesId,s]));
const CLASSES = {
  221:['pinedes','boscos de coniferes'], 222:['fagedes','rouredes','boscos de planifolis'],
  223:['alzinars','suredes','boscos d esclerofil les'], 224:['matollars','clarianes','vores de bosc'],
  225:['pinedes','pinedes obertes','boscos de coniferes'], 226:['fagedes','rouredes','boscos de planifolis'],
  227:['alzinars','suredes','boscos d esclerofil les'],
  228:['prats','pastures','gespes','vores de cami','clarianes','vores de bosc'],
  229:['bosc de ribera','boscos humits'],
};
const usable = points.filter(p => p.inSource);
const tally = { total: usable.length, noCellIngested: 0, cover0: 0, alt0: 0, ph0: 0, phMissing: 0, pass: 0 };
const sole = { ingest: 0, cover: 0, alt: 0, ph: 0, multi: 0 };
const perSpecies = new Map();
for (const p of usable) {
  const s = species.get(p.speciesId); const c = cells[p.cellId];
  if (!c) continue;
  const mapped = Object.values(c.counts).reduce((a,b)=>a+b,0);
  // (A) ingestion: builder writes nothing when no mapped land-cover class, no altitude, or no soil value
  const ingested = mapped > 0 && c.altitude !== undefined && c.soilPh !== undefined;
  // (B) cover gate
  const on = new Set(Object.entries(CLASSES).filter(([,a])=>a.some(t=>s.terms.includes(t))).map(([k])=>Number(k)));
  const compatible = Object.entries(c.counts).filter(([code])=>on.has(Number(code))).reduce((a,[,n])=>a+n,0);
  const coverOk = compatible > 0;
  // (C) altitude gate: strictly inside (coreMin-100, coreMax+100)
  const altOk = c.altitude !== undefined && c.altitude > s.altitude[0]-100 && c.altitude < s.altitude[1]+100;
  // (D) pH gate
  const phOk = !s.phRange || (c.soilPh !== undefined && c.soilPh >= s.phRange[0] && c.soilPh <= s.phRange[1]);

  if (!ingested) tally.noCellIngested++;
  if (!coverOk) tally.cover0++;
  if (!altOk) tally.alt0++;
  if (!phOk) tally.ph0++;
  if (c.soilPh === undefined) tally.phMissing++;
  const fails = [!ingested&&"ingest", !coverOk&&"cover", !altOk&&"alt", !phOk&&"ph"].filter(Boolean);
  if (!fails.length) tally.pass++;
  else if (fails.length === 1) sole[fails[0]]++;
  else sole.multi++;

  const k = p.speciesId;
  if (!perSpecies.has(k)) perSpecies.set(k, { n:0, cover:0, alt:0, ph:0, pass:0 });
  const e = perSpecies.get(k); e.n++;
  if (!coverOk) e.cover++; if (!altOk) e.alt++; if (!phOk) e.ph++;
  if (!fails.length) e.pass++;
}
const pct = (n) => `${(n/tally.total*100).toFixed(1)}%`;
console.log(`=== ${tally.total} GBIF occurrence points inside the builder's source bounds ===`);
console.log(`EXCLUDED overall : ${tally.total-tally.pass} (${pct(tally.total-tally.pass)})   PASS: ${tally.pass} (${pct(tally.pass)})`);
console.log(`\n--- each gate independently (how many observed points it rejects) ---`);
console.log(`  cover_score = 0        : ${String(tally.cover0).padStart(4)}  ${pct(tally.cover0)}`);
console.log(`  altitude weight = 0    : ${String(tally.alt0).padStart(4)}  ${pct(tally.alt0)}`);
console.log(`  soil pH out of range   : ${String(tally.ph0).padStart(4)}  ${pct(tally.ph0)}`);
console.log(`  never ingested at all  : ${String(tally.noCellIngested).padStart(4)}  ${pct(tally.noCellIngested)}`);
console.log(`\n--- SOLE cause (this gate alone rejects the point; fixing it alone recovers the point) ---`);
console.log(`  soil pH  : ${String(sole.ph).padStart(4)}  ${pct(sole.ph)}`);
console.log(`  cover    : ${String(sole.cover).padStart(4)}  ${pct(sole.cover)}`);
console.log(`  altitude : ${String(sole.alt).padStart(4)}  ${pct(sole.alt)}`);
console.log(`  ingest   : ${String(sole.ingest).padStart(4)}  ${pct(sole.ingest)}`);
console.log(`  multiple : ${String(sole.multi).padStart(4)}  ${pct(sole.multi)}`);

console.log(`\n--- worst species (excluded % of their own observations) ---`);
[...perSpecies.entries()].map(([k,v])=>({k,...v,excl:(v.n-v.pass)/v.n}))
  .filter(v=>v.n>=20).sort((a,b)=>b.excl-a.excl).slice(0,18)
  .forEach(v=>console.log(`  ${v.k.padEnd(28)} n=${String(v.n).padStart(4)}  excluded=${(v.excl*100).toFixed(0)}%   byPh=${(v.ph/v.n*100).toFixed(0)}%  byCover=${(v.cover/v.n*100).toFixed(0)}%  byAlt=${(v.alt/v.n*100).toFixed(0)}%`));

const totalUnmapped = unmappedRgb.reduce((a,[,n])=>a+n,0);
const totalSamples = Object.values(cells).length * 25;
console.log(`\n--- land-cover samples at occurrence cells ---`);
console.log(`  unmapped (outside classes 221-229): ${totalUnmapped}/${totalSamples} = ${(totalUnmapped/totalSamples*100).toFixed(1)}%`);
console.log(`  top unmapped colours:`, unmappedRgb.slice(0,8).map(([k,n])=>`${k}:${n}`).join("  "));
