// Fetch SoilGrids' own published prediction interval for pH (Q0.05/Q0.95)
// so the proposed tolerance is justified by the data, not by assumption.
import { existsSync } from "node:fs"; import { writeFile } from "node:fs/promises";
import { join } from "node:path"; import { fromFile } from "geotiff"; import proj4 from "proj4";
import { readFileSync } from "node:fs";
proj4.defs("EPSG:25831","+proj=utm +zone=31 +ellps=GRS80 +units=m +no_defs +type=crs");
const toWgs=proj4("EPSG:25831","EPSG:4326");
const CACHE="/tmp/gate-audit-cache", SOIL=[0,40.35,3.45,43.05];
async function load(cov){
  const p=join(CACHE,`${cov}.tif`);
  if(!existsSync(p)){
    const u=new URL("https://maps.isric.org/mapserv");
    u.searchParams.set("map","/map/phh2o.map"); u.searchParams.set("SERVICE","WCS");
    u.searchParams.set("VERSION","2.0.1"); u.searchParams.set("REQUEST","GetCoverage");
    u.searchParams.set("COVERAGEID",cov); u.searchParams.set("FORMAT","GEOTIFF_INT16");
    u.searchParams.append("SUBSET",`x(${SOIL[0]},${SOIL[2]})`); u.searchParams.append("SUBSET",`y(${SOIL[1]},${SOIL[3]})`);
    u.searchParams.set("SUBSETTINGCRS","http://www.opengis.net/def/crs/EPSG/0/4326");
    u.searchParams.set("OUTPUTCRS","http://www.opengis.net/def/crs/EPSG/0/4326");
    const r=await fetch(u); if(!r.ok) throw new Error(`${cov}: HTTP ${r.status}`);
    await writeFile(p,Buffer.from(await r.arrayBuffer()));
  }
  const im=await (await fromFile(p)).getImage();
  return {data:await im.readRasters({interleave:true}),width:im.getWidth(),height:im.getHeight(),
    bounds:im.getBoundingBox(),noData:Number(im.getGDALNoData())};
}
function val(r,lon,lat){const[w,s,e,n]=r.bounds;
  const x=Math.floor(((lon-w)/(e-w))*r.width),y=Math.floor(((n-lat)/(n-s))*r.height);
  if(x<0||x>=r.width||y<0||y>=r.height)return undefined;
  const v=Number(r.data[y*r.width+x]); return !Number.isFinite(v)||v===r.noData||v<=0?undefined:v/10;}
const lo=await load("phh2o_0-5cm_Q0.05"), hi=await load("phh2o_0-5cm_Q0.95");
const {points,cells}=JSON.parse(readFileSync("/tmp/gatework/cell-data2.json","utf8"));
const seen=new Set(); const widths=[];
for(const p of points){ if(!p.inSource||!cells[p.cellId]||cells[p.cellId].white===25)continue;
  if(seen.has(p.cellId))continue; seen.add(p.cellId);
  const [lon,lat]=toWgs.forward([p.cellX*250+125,p.cellY*250+125]);
  const a=val(lo,lon,lat), b=val(hi,lon,lat);
  if(a!==undefined&&b!==undefined) widths.push(b-a); }
widths.sort((a,b)=>a-b);
const q=(x)=>widths[Math.floor(widths.length*x)];
console.log(`SoilGrids 90% prediction interval for pH at ${widths.length} occurrence cells:`);
console.log(`  median width = ${q(.5).toFixed(2)} pH units  (p25=${q(.25).toFixed(2)}, p75=${q(.75).toFixed(2)}, p90=${q(.9).toFixed(2)})`);
console.log(`  => one-sided 90% margin around the mean is about +/-${(q(.5)/2).toFixed(2)} pH units`);
