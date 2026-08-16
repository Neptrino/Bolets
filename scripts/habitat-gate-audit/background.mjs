// Background sample: every cell in the cached tiles (same regions as the
// occurrences, so geography is controlled for). Used to measure whether a
// loosened gate still discriminates habitat from not-habitat.
import { writeFileSync, readdirSync, existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import proj4 from "proj4"; import sharp from "sharp"; import { fromFile } from "geotiff";
proj4.defs("EPSG:25831","+proj=utm +zone=31 +ellps=GRS80 +units=m +no_defs +type=crs");
const toWgs=proj4("EPSG:25831","EPSG:4326");
const CACHE="/tmp/gate-audit-cache", GRID_M=250, SAMPLE_M=50, TILE_M=10000;
const rgbToCode=new Map([["51,204,51",221],["102,255,51",222],["104,144,24",223],["150,125,95",224],
  ["25,230,30",225],["180,255,155",226],["170,165,0",227],["195,195,160",228],["0,255,155",229]]);
const image=await (await fromFile(join(CACHE,"phh2o.tif"))).getImage();
const soil={data:await image.readRasters({interleave:true}),width:image.getWidth(),height:image.getHeight(),
  bounds:image.getBoundingBox(),noData:Number(image.getGDALNoData())};
function ph(lon,lat){const[w,s,e,n]=soil.bounds;
  const x=Math.floor(((lon-w)/(e-w))*soil.width), y=Math.floor(((n-lat)/(n-s))*soil.height);
  if(x<0||x>=soil.width||y<0||y>=soil.height)return undefined;
  const v=Number(soil.data[y*soil.width+x]); return !Number.isFinite(v)||v===soil.noData||v<=0?undefined:Number((v/10).toFixed(1));}
function parseArc(text){const L=text.trim().split(/\r?\n/);
  const H=Object.fromEntries(L.slice(0,6).map(l=>{const[k,...v]=l.trim().split(/\s+/);return[k.toUpperCase(),Number(v.join(" "))];}));
  return {values:L.slice(6).flatMap(l=>l.trim().split(/\s+/).map(Number)),noData:H.NODATA_VALUE};}

const tiles=readdirSync(CACHE).filter(f=>f.startsWith("land-")&&f.endsWith(".tif"));
const out=[]; const STRIDE=3;   // subsample cells to keep this tractable
for(const f of tiles){
  const [,tx,ty]=f.match(/land-(\d+)-(\d+)\.tif/).map(Number);
  const tp=join(CACHE,`terr-${tx}-${ty}.asc`); if(!existsSync(tp))continue;
  const land=await sharp(join(CACHE,f)).raw().toBuffer({resolveWithObject:true});
  const terr=parseArc(await readFile(tp,"utf8"),TILE_M/GRID_M,TILE_M/GRID_M);
  const spc=GRID_M/SAMPLE_M, cpt=TILE_M/GRID_M;
  for(let ly=0;ly<cpt;ly+=STRIDE)for(let lx=0;lx<cpt;lx+=STRIDE){
    const counts={}; let white=0,mapped=0;
    for(let sy=0;sy<spc;sy++)for(let sx=0;sx<spc;sx++){
      const px=lx*spc+sx, py=land.info.height-1-(ly*spc+sy);
      const o=(py*land.info.width+px)*land.info.channels;
      const key=`${land.data[o]},${land.data[o+1]},${land.data[o+2]}`;
      if(key==="255,255,255"){white++;continue;}
      const code=rgbToCode.get(key); if(code){counts[code]=(counts[code]??0)+1;mapped++;}
    }
    if(white===25)continue;
    const trow=cpt-1-ly, a=terr.values[trow*cpt+lx];
    const altitude=Number.isFinite(a)&&a!==terr.noData&&a>=-50?a:undefined;
    const cx=tx/GRID_M+lx, cy=ty/GRID_M+ly;
    const [lon,lat]=toWgs.forward([cx*GRID_M+GRID_M/2, cy*GRID_M+GRID_M/2]);
    out.push({counts,mappedN:mapped,altitude,soilPh:ph(lon,lat)});
  }
}
writeFileSync("/tmp/gatework/background.json",JSON.stringify(out));
console.error("background cells:",out.length);
