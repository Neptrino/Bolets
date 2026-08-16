// Re-derive per-cell sample composition including the white/no-data count,
// so points outside ICGC coverage can be separated from real gate exclusions.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import proj4 from "proj4";
import sharp from "sharp";
proj4.defs("EPSG:25831","+proj=utm +zone=31 +ellps=GRS80 +units=m +no_defs +type=crs");
const CACHE="/tmp/gate-audit-cache", GRID_M=250, SAMPLE_M=50, TILE_M=10000;
const rgbToCode=new Map([["51,204,51",221],["102,255,51",222],["104,144,24",223],["150,125,95",224],
  ["25,230,30",225],["180,255,155",226],["170,165,0",227],["195,195,160",228],["0,255,155",229]]);
const { points, cells } = JSON.parse(readFileSync("/tmp/gatework/cell-data.json","utf8"));
const usable = points.filter(p=>p.inSource);
const byTile=new Map();
for(const p of usable){
  const tx=Math.floor(p.cellX*GRID_M/TILE_M)*TILE_M, ty=Math.floor(p.cellY*GRID_M/TILE_M)*TILE_M;
  const k=`${tx}:${ty}`; if(!byTile.has(k)) byTile.set(k,{tx,ty,cells:new Map()});
  byTile.get(k).cells.set(p.cellId,{cellX:p.cellX,cellY:p.cellY});
}
let missing=0;
for(const t of byTile.values()){
  const f=join(CACHE,`land-${t.tx}-${t.ty}.tif`);
  if(!existsSync(f)){missing++;continue;}
  const land=await sharp(f).raw().toBuffer({resolveWithObject:true});
  const spc=GRID_M/SAMPLE_M;
  for(const [id,c] of t.cells){
    const lx=c.cellX-t.tx/GRID_M, ly=c.cellY-t.ty/GRID_M;
    let white=0, mapped=0, other=0;
    for(let sy=0;sy<spc;sy++)for(let sx=0;sx<spc;sx++){
      const px=lx*spc+sx, py=land.info.height-1-(ly*spc+sy);
      const o=(py*land.info.width+px)*land.info.channels;
      const key=`${land.data[o]},${land.data[o+1]},${land.data[o+2]}`;
      if(key==="255,255,255") white++;
      else if(rgbToCode.has(key)) mapped++;
      else other++;
    }
    cells[id].white=white; cells[id].mappedN=mapped; cells[id].otherN=other;
  }
}
console.error("tiles missing:",missing);
writeFileSync("/tmp/gatework/cell-data2.json",JSON.stringify({points,cells}));
const arr=Object.values(cells).filter(c=>c.white!==undefined);
console.error("cells:",arr.length,"allWhite:",arr.filter(c=>c.white===25).length,
  "someWhite:",arr.filter(c=>c.white>0&&c.white<25).length);
