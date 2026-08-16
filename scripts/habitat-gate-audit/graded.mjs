import { readFileSync } from "node:fs";
const { points, cells } = JSON.parse(readFileSync("/tmp/gatework/cell-data2.json","utf8"));
const bg = JSON.parse(readFileSync("/tmp/gatework/background.json","utf8"));
const species=new Map(JSON.parse(readFileSync("/tmp/species-gates.json","utf8")).map(s=>[s.speciesId,s]));
const CLASSES={221:['pinedes','boscos de coniferes'],222:['fagedes','rouredes','boscos de planifolis'],
 223:['alzinars','suredes','boscos d esclerofil les'],224:['matollars','clarianes','vores de bosc'],
 225:['pinedes','pinedes obertes','boscos de coniferes'],226:['fagedes','rouredes','boscos de planifolis'],
 227:['alzinars','suredes','boscos d esclerofil les'],
 228:['prats','pastures','gespes','vores de cami','clarianes','vores de bosc'],
 229:['bosc de ribera','boscos humits']};
const pts=points.filter(p=>p.inSource&&cells[p.cellId]&&cells[p.cellId].white<25);
const bySp=new Map(); for(const p of pts) bySp.set(p.speciesId,(bySp.get(p.speciesId)??0)+1);

// altitude taper, mirroring public.habitat_altitude_weight
function altW(a,min,max){ if(a===undefined||max<=min)return 0;
  if(a<=min-100||a>=max+100)return 0;
  const t=Math.min(100,(max-min)/2);
  if(a<min)return 0.75*((a-(min-100))/100);
  if(a<min+t)return 0.75+0.25*((a-min)/t);
  if(a<=max-t)return 1;
  if(a<=max)return 0.75+0.25*((max-a)/t);
  return 0.75*(((max+100)-a)/100); }
// proposed pH taper: full credit inside the declared window, linear ramp to 0
// across MARGIN pH units (SoilGrids' own error floor), instead of a hard cut.
function phW(v,range,margin){ if(!range)return 1; if(v===undefined)return 0;
  const [lo,hi]=range; if(v>=lo&&v<=hi)return 1;
  const d=v<lo?lo-v:v-hi; return d>=margin?0:1-d/margin; }
// cover: full credit for the species' own classes, partial for adjacent
// structural classes (matollar / clarianes-vores de bosc)
function coverW(c,s,edgeCredit){
  const on=new Set(Object.entries(CLASSES).filter(([,a])=>a.some(x=>s.terms.includes(x))).map(([k])=>Number(k)));
  let n=0; for(const [k,v] of Object.entries(c.counts)) if(on.has(Number(k))) n+=v;
  if(edgeCredit>0&&[...on].some(x=>x<=227))
    for(const k of [224,228]) if(!on.has(k)) n+=edgeCredit*(c.counts[k]??0);
  return Math.min(1,n/25); }

function weight(c,s,{phMargin,phBinary,edgeCredit}){
  if(!(c.mappedN>0)||c.altitude===undefined||c.soilPh===undefined)return 0;
  const cw=coverW(c,s,edgeCredit); if(cw<=0)return 0;
  const aw=altW(c.altitude,s.altitude[0],s.altitude[1]); if(aw<=0)return 0;
  const pw=phBinary
    ? (!s.phRange?1:(c.soilPh>=s.phRange[0]&&c.soilPh<=s.phRange[1]?1:0))
    : phW(c.soilPh,s.phRange,phMargin);
  return cw*aw*pw; }

const scen=[
  ["SHIPPED: binary pH, no edge credit",{phBinary:true,phMargin:0,edgeCredit:0}],
  ["pH taper 0.5",                      {phBinary:false,phMargin:0.5,edgeCredit:0}],
  ["pH taper 0.8",                      {phBinary:false,phMargin:0.8,edgeCredit:0}],
  ["pH taper 0.8 + edge credit 0.5",    {phBinary:false,phMargin:0.8,edgeCredit:0.5}],
  ["pH taper 1.0 + edge credit 0.5",    {phBinary:false,phMargin:1.0,edgeCredit:0.5}],
];
console.log("scenario".padEnd(36),"recall","  meanW-occ","meanW-bg"," LIFT(mean)");
for(const [label,cfg] of scen){
  const wo=pts.map(p=>weight(cells[p.cellId],species.get(p.speciesId),cfg));
  const recall=wo.filter(w=>w>0).length/wo.length;
  const mo=wo.reduce((a,b)=>a+b,0)/wo.length;
  let mb=0,tot=0;
  for(const [sid,n] of bySp){ const s=species.get(sid);
    let acc=0; for(const c of bg) acc+=weight(c,s,cfg);
    mb+=n*(acc/bg.length); tot+=n; }
  mb/=tot;
  console.log(label.padEnd(36), `${(recall*100).toFixed(1)}%`.padStart(6), `   ${mo.toFixed(3)}`.padStart(10), `${mb.toFixed(3)}`.padStart(8), `   ${(mo/mb).toFixed(2)}x`);
}
