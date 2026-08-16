import { readFileSync } from "node:fs";
const { points, cells } = JSON.parse(readFileSync("/tmp/gatework/cell-data2.json","utf8"));
const species=new Map(JSON.parse(readFileSync("/tmp/species-gates.json","utf8")).map(s=>[s.speciesId,s]));
const CLASSES={221:['pinedes','boscos de coniferes'],222:['fagedes','rouredes','boscos de planifolis'],
 223:['alzinars','suredes','boscos d esclerofil les'],224:['matollars','clarianes','vores de bosc'],
 225:['pinedes','pinedes obertes','boscos de coniferes'],226:['fagedes','rouredes','boscos de planifolis'],
 227:['alzinars','suredes','boscos d esclerofil les'],
 228:['prats','pastures','gespes','vores de cami','clarianes','vores de bosc'],
 229:['bosc de ribera','boscos humits']};
const pts=points.filter(p=>p.inSource&&cells[p.cellId]&&cells[p.cellId].white<25);

function gates(p, phTol=0, treatEdgeAsCompatible=false){
  const s=species.get(p.speciesId), c=cells[p.cellId];
  const on=new Set(Object.entries(CLASSES).filter(([,a])=>a.some(x=>s.terms.includes(x))).map(([k])=>Number(k)));
  if(treatEdgeAsCompatible&&[...on].some(x=>x<=227)) { on.add(224); on.add(228); }
  const comp=Object.entries(c.counts).filter(([code])=>on.has(Number(code))).reduce((a,[,n])=>a+n,0);
  const coverOk=comp>0;
  const altOk=c.altitude!==undefined&&c.altitude>s.altitude[0]-100&&c.altitude<s.altitude[1]+100;
  const phOk=!s.phRange||(c.soilPh!==undefined&&c.soilPh>=s.phRange[0]-phTol&&c.soilPh<=s.phRange[1]+phTol);
  return {coverOk,altOk,phOk,pass:coverOk&&altOk&&phOk&&c.mappedN>0&&c.altitude!==undefined&&c.soilPh!==undefined};
}

console.log("=== A. Is the cover failure a GBIF-precision artefact? ===");
for(const [label,f] of [["all points",()=>true],
   ["uncertainty <= 250 m",p=>p.uncertainty!==null&&p.uncertainty<=250],
   ["uncertainty <= 100 m",p=>p.uncertainty!==null&&p.uncertainty<=100],
   ["uncertainty unknown",p=>p.uncertainty===null]]){
  const sub=pts.filter(f); if(!sub.length){console.log(`  ${label}: none`);continue;}
  const g=sub.map(p=>gates(p));
  console.log(`  ${label.padEnd(22)} n=${String(sub.length).padStart(4)}  excl=${((1-g.filter(x=>x.pass).length/sub.length)*100).toFixed(0)}%  coverFail=${(g.filter(x=>!x.coverOk).length/sub.length*100).toFixed(0)}%  phFail=${(g.filter(x=>!x.phOk).length/sub.length*100).toFixed(0)}%  altFail=${(g.filter(x=>!x.altOk).length/sub.length*100).toFixed(0)}%`);
}

console.log("\n=== B. What is actually in the cells the cover gate rejects? ===");
let noMapped=0, mappedButIncompatible=0, mostlyOther=0;
for(const p of pts){ const c=cells[p.cellId]; if(gates(p).coverOk) continue;
  if(c.mappedN===0) { noMapped++; if(c.otherN>=20) mostlyOther++; } else mappedButIncompatible++; }
const cf=pts.filter(p=>!gates(p).coverOk).length;
console.log(`  cover-rejected points: ${cf}`);
console.log(`    cell has NO land-cover class 221-229 at all : ${noMapped} (${(noMapped/cf*100).toFixed(0)}%)  [of which >=80% non-natural: ${mostlyOther}]`);
console.log(`    cell HAS forest/grass, but not this species' type: ${mappedButIncompatible} (${(mappedButIncompatible/cf*100).toFixed(0)}%)`);

console.log("\n=== C. Counterfactual: what does each fix recover? ===");
const base=pts.filter(p=>gates(p).pass).length;
const scen=[["baseline (shipped)",0,false],["pH tolerance +/-0.5",0.5,false],["pH tolerance +/-1.0",1.0,false],
  ["edge classes 224/228 compatible for forest species",0,true],
  ["pH +/-0.5 AND edge classes",0.5,true],["pH +/-1.0 AND edge classes",1.0,true]];
for(const [label,tol,edge] of scen){
  const n=pts.filter(p=>gates(p,tol,edge).pass).length;
  console.log(`  ${label.padEnd(52)} pass=${String(n).padStart(4)} (${(n/pts.length*100).toFixed(1)}%)  recovered=+${n-base} (+${((n-base)/pts.length*100).toFixed(1)} pp)`);
}
