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
let phOutOfRange=0, noPhValue=0, noAlt=0, noMapped=0, coverFail=0, altFail=0, pass=0;
const sole={cover:0,ph:0,alt:0,gap:0,multi:0};
for(const p of pts){
  const s=species.get(p.speciesId), c=cells[p.cellId];
  const gap = !(c.mappedN>0) || c.altitude===undefined || c.soilPh===undefined;  // cell never written
  if(c.soilPh===undefined) noPhValue++;
  if(c.altitude===undefined) noAlt++;
  if(!(c.mappedN>0)) noMapped++;
  const on=new Set(Object.entries(CLASSES).filter(([,a])=>a.some(x=>s.terms.includes(x))).map(([k])=>Number(k)));
  const comp=Object.entries(c.counts).filter(([k])=>on.has(Number(k))).reduce((a,[,n])=>a+n,0);
  const coverOk=comp>0; if(!coverOk)coverFail++;
  const altOk=c.altitude!==undefined&&c.altitude>s.altitude[0]-100&&c.altitude<s.altitude[1]+100;
  if(!altOk)altFail++;
  const phOk = !s.phRange ? true : (c.soilPh===undefined ? false
    : (c.soilPh>=s.phRange[0]&&c.soilPh<=s.phRange[1]));
  if(s.phRange&&c.soilPh!==undefined&&!phOk) phOutOfRange++;
  const f=[gap&&"gap",!coverOk&&"cover",!altOk&&"alt",(s.phRange&&c.soilPh!==undefined&&!phOk)&&"ph"].filter(Boolean);
  if(!f.length)pass++; else if(f.length===1)sole[f[0]]++; else sole.multi++;
}
const n=pts.length, pc=x=>`${(x/n*100).toFixed(1)}%`;
console.log(`n = ${n} occurrence points inside ICGC coverage`);
console.log(`PASS ${pass} (${pc(pass)})   EXCLUDED ${n-pass} (${pc(n-pass)})\n`);
console.log(`independent rejection:`);
console.log(`  cover_score = 0            ${String(coverFail).padStart(4)}  ${pc(coverFail)}`);
console.log(`  soil pH outside window     ${String(phOutOfRange).padStart(4)}  ${pc(phOutOfRange)}`);
console.log(`  altitude weight = 0        ${String(altFail).padStart(4)}  ${pc(altFail)}`);
console.log(`  cell never written (gap)   ${String(noMapped+0).padStart(4)}  noMapped=${noMapped} noAlt=${noAlt} noSoilGridsPh=${noPhValue}`);
console.log(`\nsole cause:`);
for(const k of ["cover","ph","alt","gap","multi"]) console.log(`  ${k.padEnd(6)} ${String(sole[k]).padStart(4)}  ${pc(sole[k])}`);
