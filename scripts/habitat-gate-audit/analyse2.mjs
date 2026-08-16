import { readFileSync } from "node:fs";
const { points, cells } = JSON.parse(readFileSync("/tmp/gatework/cell-data2.json","utf8"));
const species=new Map(JSON.parse(readFileSync("/tmp/species-gates.json","utf8")).map(s=>[s.speciesId,s]));
const CLASSES={221:['pinedes','boscos de coniferes'],222:['fagedes','rouredes','boscos de planifolis'],
 223:['alzinars','suredes','boscos d esclerofil les'],224:['matollars','clarianes','vores de bosc'],
 225:['pinedes','pinedes obertes','boscos de coniferes'],226:['fagedes','rouredes','boscos de planifolis'],
 227:['alzinars','suredes','boscos d esclerofil les'],
 228:['prats','pastures','gespes','vores de cami','clarianes','vores de bosc'],
 229:['bosc de ribera','boscos humits']};

const all=points.filter(p=>p.inSource&&cells[p.cellId]);
const outside=all.filter(p=>cells[p.cellId].white===25);
const pts=all.filter(p=>cells[p.cellId].white<25);   // inside ICGC land-cover coverage
console.log(`GBIF points in source bbox: ${all.length}`);
console.log(`  outside ICGC coverage (all 25 samples no-data, i.e. not Catalonia): ${outside.length}`);
console.log(`  INSIDE ICGC coverage -> the population the habitat gate actually judges: ${pts.length}\n`);

const t={n:pts.length,notIngested:0,cover:0,alt:0,ph:0,phMissing:0,pass:0};
const sole={ingest:0,cover:0,alt:0,ph:0,multi:0};
const per=new Map(); const phDelta=[];
for(const p of pts){
  const s=species.get(p.speciesId), c=cells[p.cellId];
  const ingested=c.mappedN>0&&c.altitude!==undefined&&c.soilPh!==undefined;
  const on=new Set(Object.entries(CLASSES).filter(([,a])=>a.some(x=>s.terms.includes(x))).map(([k])=>Number(k)));
  const comp=Object.entries(c.counts).filter(([code])=>on.has(Number(code))).reduce((a,[,n])=>a+n,0);
  const coverOk=comp>0;
  const altOk=c.altitude!==undefined&&c.altitude>s.altitude[0]-100&&c.altitude<s.altitude[1]+100;
  const phOk=!s.phRange||(c.soilPh!==undefined&&c.soilPh>=s.phRange[0]&&c.soilPh<=s.phRange[1]);
  if(s.phRange&&c.soilPh!==undefined&&!phOk){
    phDelta.push(c.soilPh<s.phRange[0]?s.phRange[0]-c.soilPh:c.soilPh-s.phRange[1]);
  }
  if(!ingested)t.notIngested++; if(!coverOk)t.cover++; if(!altOk)t.alt++; if(!phOk)t.ph++;
  if(c.soilPh===undefined)t.phMissing++;
  const f=[!ingested&&"ingest",!coverOk&&"cover",!altOk&&"alt",!phOk&&"ph"].filter(Boolean);
  if(!f.length)t.pass++; else if(f.length===1)sole[f[0]]++; else sole.multi++;
  const e=per.get(p.speciesId)??{n:0,cover:0,alt:0,ph:0,pass:0}; per.set(p.speciesId,e);
  e.n++; if(!coverOk)e.cover++; if(!altOk)e.alt++; if(!phOk)e.ph++; if(!f.length)e.pass++;
}
const pc=n=>`${(n/t.n*100).toFixed(1)}%`;
console.log(`=== ${t.n} points where the species demonstrably fruits, inside product coverage ===`);
console.log(`EXCLUDED: ${t.n-t.pass} (${pc(t.n-t.pass)})    PASS: ${t.pass} (${pc(t.pass)})\n`);
console.log(`--- gate rejection rate, measured independently ---`);
console.log(`  soil pH out of range : ${String(t.ph).padStart(4)}  ${pc(t.ph)}`);
console.log(`  cover_score = 0      : ${String(t.cover).padStart(4)}  ${pc(t.cover)}`);
console.log(`  altitude weight = 0  : ${String(t.alt).padStart(4)}  ${pc(t.alt)}`);
console.log(`  never ingested       : ${String(t.notIngested).padStart(4)}  ${pc(t.notIngested)}   (pH raster gap: ${t.phMissing})`);
console.log(`\n--- SOLE cause: relaxing ONLY this gate recovers the point ---`);
for(const k of ["ph","cover","alt","ingest","multi"])
  console.log(`  ${k.padEnd(8)}: ${String(sole[k]).padStart(4)}  ${pc(sole[k])}`);
phDelta.sort((a,b)=>a-b);
const q=(p)=>phDelta[Math.floor(phDelta.length*p)];
console.log(`\n--- how far outside the pH window are the rejected points? (pH units) ---`);
console.log(`  n=${phDelta.length}  median=${q(.5).toFixed(2)}  p25=${q(.25).toFixed(2)}  p75=${q(.75).toFixed(2)}  p90=${q(.9).toFixed(2)}`);
console.log(`  within 0.5 of the window: ${(phDelta.filter(d=>d<=0.5).length/phDelta.length*100).toFixed(0)}%   within 1.0: ${(phDelta.filter(d=>d<=1.0).length/phDelta.length*100).toFixed(0)}%`);
console.log(`\n--- worst species ---`);
[...per.entries()].map(([k,v])=>({k,...v,e:(v.n-v.pass)/v.n})).filter(v=>v.n>=20)
 .sort((a,b)=>b.e-a.e).slice(0,15)
 .forEach(v=>console.log(`  ${v.k.padEnd(28)} n=${String(v.n).padStart(4)} excl=${(v.e*100).toFixed(0)}%  ph=${(v.ph/v.n*100).toFixed(0)}% cover=${(v.cover/v.n*100).toFixed(0)}% alt=${(v.alt/v.n*100).toFixed(0)}%`));
