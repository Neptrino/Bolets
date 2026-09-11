import{readFile,writeFile}from'node:fs/promises';import{spawnSync}from'node:child_process';
const dir='output/autumn-reels-v2';const targets=JSON.parse(await readFile(dir+'/uploads.json'));const ids=['01-pluja','03-abans-sortir','05-poc-senyal','06-el-meu-bosc'];const receipts=[];
for(let i=0;i<4;i++){
 const video=`${dir}/${ids[i]}-final.mp4`;const cover=`${dir}/${ids[i]}-cover.jpg`;const r=spawnSync('ffmpeg',['-y','-loglevel','error','-ss','1.2','-i',video,'-frames:v','1',cover]);if(r.status)throw Error('Cover failed');
 for(const [kind,file]of [['videos',video],['covers',cover]]){const t=targets[kind][i];const r=await fetch(t.proxyUploadUrl,{method:'PUT',headers:{'Content-Type':t.mimeType},body:await readFile(file)});if(!r.ok)throw Error(`Upload failed ${r.status}; request fresh URL before retry`);receipts.push({id:ids[i],kind,path:t.path});await writeFile(dir+'/uploaded.json',JSON.stringify(receipts,null,2));console.log('Uploaded '+ids[i]+' '+kind);}
}
