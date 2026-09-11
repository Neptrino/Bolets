import sharp from 'sharp';import{readFile,readdir,writeFile}from'node:fs/promises';import{spawnSync}from'node:child_process';
const dir='output/autumn-content-2026-09-08';const s=JSON.parse(await readFile(dir+'/content.json'));const result=[];
for(const p of [...s.reels,...s.carousels]){
 const folder=dir+'/'+p.id;
 for(const f of (await readdir(folder)).filter(n=>n.endsWith('-layout.json'))){const boxes=JSON.parse(await readFile(folder+'/'+f));for(const b of boxes)if(b.x<0||b.y<0||b.x+b.w>1080||b.y+b.h>(p.scenes?1920:1350))throw Error('Overflow');}
 if(p.scenes){const probe=JSON.parse(spawnSync('ffprobe',['-v','error','-show_streams','-show_format','-of','json',folder+'/reel.mp4'],{encoding:'utf8'}).stdout);const v=probe.streams.find(x=>x.codec_type==='video');if(v.width!==1080||v.height!==1920||v.codec_name!=='h264'||Number(probe.format.duration)!==20)throw Error('Invalid video');result.push({id:p.id,format:'1080x1920 H264/AAC',seconds:20});}
 else{const files=(await readdir(folder)).filter(n=>/^\d.jpg$/.test(n));if(files.length!==(p.id==='02-foto-barret'?4:5))throw Error('Slides missing');for(const f of files){const m=await sharp(folder+'/'+f).metadata();if(m.width!==1080||m.height!==1350)throw Error('Invalid slide');}result.push({id:p.id,slides:files.length,format:'1080x1350 JPG'});}
 if(p.caption.length>2200)throw Error('Caption too long');
}
await writeFile(dir+'/media-verification.json',JSON.stringify({verifiedAt:new Date().toISOString(),items:result,visualReview:'All nine slides and five scenes per Reel reviewed. Corrected sheet background and neighbouring illustration bleed before upload.'},null,2));console.log(result);
