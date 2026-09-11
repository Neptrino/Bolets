throw new Error('Cancelled by user: do not create manual-completion Stories.');
import {gql} from '../buffer-spacing-2026-09-08/query.mjs';
import {readFileSync,writeFileSync} from 'node:fs';
const dir='output/interactive-stories-2026-09-08/';
const plan=JSON.parse(readFileSync(dir+'plan.json'));
const query=`query {posts(first:100,input:{organizationId:"6a95fdbaee9698b29f42ea56",filter:{channelIds:["6a960174065799be4662a8f5"],status:[scheduled]}}){edges{node{id text dueAt status schedulingType metadata{... on InstagramPostMetadata{type shouldShareToFeed isAiGenerated stickerFields{text other}}} assets{__typename ... on ImageAsset{source image{altText}} ... on VideoAsset{source}}}} pageInfo{hasNextPage}}}`;
let state=await gql(query);if(state.posts.pageInfo.hasNextPage)throw Error('Incomplete');
writeFileSync(dir+'cleanup-before.json',JSON.stringify(state,null,2));
const changed=[];
for(const {node:p}of state.posts.edges){
if(p.metadata.type!=='story')continue;
let clean=p.text.replace(/\n\nStory de seguiment · [a-f0-9]+\s*$/u,'').replace(/\n\nPlanificació: interactive-[\w-]+\s*$/u,'');
if(p.schedulingType==='notification'&&p.metadata.stickerFields?.text)clean=p.metadata.stickerFields.text;
if(clean===p.text)continue;
const assets=p.assets.map(a=>a.__typename==='ImageAsset'?{image:{url:a.source,metadata:{altText:a.image.altText}}}:{video:{url:a.source}});
const r=await gql(`mutation($input:EditPostInput!){editPost(input:$input){__typename ... on PostActionSuccess{post{id}} ... on MutationError{message}}}`,{input:{id:p.id,text:clean,assets,metadata:{instagram:p.metadata},schedulingType:p.schedulingType}});
if(r.editPost.__typename!=='PostActionSuccess')throw Error(JSON.stringify(r));p.text=clean;changed.push(p.id);writeFileSync(dir+'cleaned-ids.json',JSON.stringify(changed));
}
const receipts=[];
for(const p of plan){
const existing=state.posts.edges.map(e=>e.node).filter(n=>n.metadata.type==='story'&&n.schedulingType==='notification'&&n.dueAt===p.dueAt&&n.metadata.stickerFields?.text===p.prompt);
if(existing.length>1)throw Error('Duplicate');if(existing.length){receipts.push({key:p.key,id:existing[0].id,dueAt:p.dueAt});continue;}
const r=await gql(`mutation($input:CreatePostInput!){createPost(input:$input){__typename ... on PostActionSuccess{post{id}} ... on MutationError{message}}}`,{input:{channelId:'6a960174065799be4662a8f5',mode:'customScheduled',dueAt:p.dueAt,schedulingType:'notification',assets:[{image:{url:p.asset.source,metadata:{altText:p.asset.image.altText||'Fotografia del nostre arxiu de camp; fons per a una pregunta a la comunitat.'}}}],text:p.prompt,metadata:{instagram:{type:'story',shouldShareToFeed:false,isAiGenerated:false,stickerFields:{text:p.prompt,other:p.instructions}}}}});
if(r.createPost.__typename!=='PostActionSuccess')throw Error(JSON.stringify(r));receipts.push({key:p.key,id:r.createPost.post.id,dueAt:p.dueAt});writeFileSync(dir+'receipts-final.json',JSON.stringify(receipts,null,2));console.log('Scheduled '+p.prompt);
}
const final=await gql(query);writeFileSync(dir+'after.json',JSON.stringify(final,null,2));const posts=final.posts.edges.map(e=>e.node);if(final.posts.pageInfo.hasNextPage)throw Error('Incomplete');
for(const p of plan){const m=posts.filter(n=>n.metadata.type==='story'&&n.schedulingType==='notification'&&n.metadata.stickerFields?.text===p.prompt&&n.dueAt===p.dueAt);if(m.length!==1||m[0].metadata.shouldShareToFeed!==false||m[0].metadata.stickerFields.other!==p.instructions)throw Error('Missing or wrong '+p.prompt);}
for(const p of posts){if(/Planificació: interactive-|Story de seguiment · [a-f0-9]+/u.test(p.text+' '+JSON.stringify(p.metadata)))throw Error('Tracking label remains');}
for(const {node:p}of state.posts.edges){const n=posts.find(n=>n.id===p.id);if(!n||n.dueAt!==p.dueAt||n.schedulingType!==p.schedulingType||JSON.stringify(n.assets)!==JSON.stringify(p.assets))throw Error('Existing media or schedule changed');}
writeFileSync(dir+'receipts-final.json',JSON.stringify(receipts,null,2));console.log('VERIFIED '+posts.length+' entries; '+changed.length+' labels cleaned; all 18 interactive reminders scheduled.');
