// Suspect #2: does the 25-sample / 50 m grid miss compatible patches that a
// finer sample would find? Re-sample cover-REJECTED cells at 10 m (625 samples).
import { readFileSync, existsSync } from "node:fs"; import { writeFile } from "node:fs/promises";
import { join } from "node:path"; import sharp from "sharp";
const CACHE="/tmp/gate-audit-cache/fine"; import { mkdirSync } from "node:fs"; mkdirSync(CACHE,{recursive:true});
const rgbToCode=new Map([["51,204,51",221],["102,255,51",222],["104,144,24",223],["150,125,95",224],
  ["25,230,30",225],["180,255,155",226],["170,165,0",227],["195,195,160",228],["0,255,155",229]]);
const CLASSES={221:['pinedes','boscos de coniferes'],222:['fagedes','rouredes','boscos de planifolis'],
 223:['alzinars','suredes','boscos d esclerofil les'],224:['matollars','clarianes','vores de bosc'],
 225:['pinedes','pinedes obertes','boscos de coniferes'],226:['fagedes','rouredes','boscos de planifolis'],
 227:['alzinars','suredes','boscos d esclerofil les'],
 228:['prats','pastures','gespes','vores de cami','clarianes','vores de bosc'],
 229:['bosc de ribera','boscos humits']};
const {points,cells}=JSON.parse(readFileSync("/tmp/gatework/cell-data2.json","utf8"));
const species=new Map(JSON.parse(readFileSync("/tmp/species-gates.json","utf8")).map(s=>[s.speciesId,s]));
const onFor=s=>new Set(Object.entries(CLASSES).filter(([,a])=>a.some(x=>s.terms.includes(x))).map(([k])=>Number(k)));
const rejected=[];
const seen=new Set();
for(const p of points){ if(!p.inSource)continue; const c=cells[p.cellId]; if(!c||c.white===25)continue;
  const on=onFor(species.get(p.speciesId));
  const comp=Object.entries(c.counts).filter(([k])=>on.has(Number(k))).reduce((a,[,n])=>a+n,0);
  if(comp>0)continue; const key=`${p.cellId}|${p.speciesId}`; if(seen.has(key))continue; seen.add(key);
  rejected.push(p); }
const sample=rejected.filter((_,i)=>i%Math.ceil(rejected.length/300)===0).slice(0,300);
console.error(`cover-rejected (cell,species) pairs: ${rejected.length}; testing ${sample.length}`);
let recovered=0, done=0;
const q=[...sample];
async function work(){ while(q.length){ const p=q.pop();
  const x0=p.cellX*250, y0=p.cellY*250;
  const f=join(CACHE,`f-${p.cellX}-${p.cellY}.tif`);
  if(!existsSync(f)){
    const u=new URL("https://geoserveis.icgc.cat/servei/catalunya/cobertes-sol/wms");
    Object.entries({SERVICE:"WMS",VERSION:"1.1.1",REQUEST:"GetMap",LAYERS:"cobertes_2024",STYLES:"",
      FORMAT:"image/tiff",SRS:"EPSG:25831",BBOX:`${x0},${y0},${x0+250},${y0+250}`,WIDTH:"25",HEIGHT:"25"})
      .forEach(([k,v])=>u.searchParams.set(k,v));
    try{ const r=await fetch(u); if(!r.ok)throw new Error(r.status);
      await writeFile(f,Buffer.from(await r.arrayBuffer())); }catch{ done++; continue; } }
  const img=await sharp(f).raw().toBuffer({resolveWithObject:true});
  const on=onFor(species.get(p.speciesId)); let comp=0;
  for(let i=0;i<img.info.width*img.info.height;i++){ const o=i*img.info.channels;
    const code=rgbToCode.get(`${img.data[o]},${img.data[o+1]},${img.data[o+2]}`);
    if(code&&on.has(code))comp++; }
  if(comp>0)recovered++;
  done++; if(done%50===0)console.error(`  ${done}/${sample.length}`); } }
await Promise.all(Array.from({length:6},work));
console.log(`\n10 m re-sample of cells the 50 m grid rejected:`);
console.log(`  ${recovered}/${sample.length} (${(recovered/sample.length*100).toFixed(1)}%) contain a compatible patch that the 25-sample grid missed`);
