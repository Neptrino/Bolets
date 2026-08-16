import { readFileSync } from "node:fs";
const { points, cells } = JSON.parse(readFileSync("/tmp/gatework/cell-data2.json","utf8"));
const bg = JSON.parse(readFileSync("/tmp/gatework/background.json","utf8"));
const speciesList = JSON.parse(readFileSync("/tmp/species-gates.json","utf8"));
const species=new Map(speciesList.map(s=>[s.speciesId,s]));
const CLASSES={221:['pinedes','boscos de coniferes'],222:['fagedes','rouredes','boscos de planifolis'],
 223:['alzinars','suredes','boscos d esclerofil les'],224:['matollars','clarianes','vores de bosc'],
 225:['pinedes','pinedes obertes','boscos de coniferes'],226:['fagedes','rouredes','boscos de planifolis'],
 227:['alzinars','suredes','boscos d esclerofil les'],
 228:['prats','pastures','gespes','vores de cami','clarianes','vores de bosc'],
 229:['bosc de ribera','boscos humits']};
const pts=points.filter(p=>p.inSource&&cells[p.cellId]&&cells[p.cellId].white<25);
const onFor=(s,edge)=>{const on=new Set(Object.entries(CLASSES).filter(([,a])=>a.some(x=>s.terms.includes(x))).map(([k])=>Number(k)));
  if(edge&&[...on].some(x=>x<=227)){on.add(224);on.add(228);} return on;};
function pass(c,s,tol,edge){
  if(!(c.mappedN>0)||c.altitude===undefined||c.soilPh===undefined)return false;
  const on=onFor(s,edge);
  const comp=Object.entries(c.counts).filter(([k])=>on.has(Number(k))).reduce((a,[,n])=>a+n,0);
  if(!(comp>0))return false;
  if(!(c.altitude>s.altitude[0]-100&&c.altitude<s.altitude[1]+100))return false;
  if(s.phRange&&!(c.soilPh>=s.phRange[0]-tol&&c.soilPh<=s.phRange[1]+tol))return false;
  return true;
}
// weight the background by each species' share of occurrences so the two
// populations are comparable species-for-species
const bySp=new Map(); for(const p of pts) bySp.set(p.speciesId,(bySp.get(p.speciesId)??0)+1);
const scen=[["baseline (shipped)",0,false],["pH +/-0.5",0.5,false],["pH +/-1.0",1.0,false],
 ["edge classes 224/228",0,true],["pH +/-0.5 + edge",0.5,true],["pH +/-1.0 + edge",1.0,true],
 ["pH gate REMOVED entirely",99,false],["all gates removed except ingest",99,true]];
console.log("scenario".padEnd(34),"occ-pass","bg-pass","  LIFT");
for(const [label,tol,edge] of scen){
  const occ=pts.filter(p=>pass(cells[p.cellId],species.get(p.speciesId),tol,edge)).length/pts.length;
  let bgw=0,tot=0;
  for(const [sid,n] of bySp){ const s=species.get(sid);
    let k=0; for(const c of bg) if(pass(c,s,tol,edge))k++;
    bgw+=n*(k/bg.length); tot+=n; }
  const bgp=bgw/tot;
  console.log(label.padEnd(34), `${(occ*100).toFixed(1)}%`.padStart(7), `${(bgp*100).toFixed(1)}%`.padStart(7), `  ${(occ/bgp).toFixed(2)}x`);
}
