import {gql} from '../buffer-spacing-2026-09-08/query.mjs';
import {readFileSync,writeFileSync} from 'node:fs';
const dir='output/interactive-stories-2026-09-08/';
const plan=JSON.parse(readFileSync(dir+'plan.json'));
const query=`query {posts(first:100,input:{organizationId:"6a95fdbaee9698b29f42ea56",filter:{channelIds:["6a960174065799be4662a8f5"],status:[scheduled]}}){edges{node{id text dueAt status schedulingType metadata{... on InstagramPostMetadata{type shouldShareToFeed isAiGenerated stickerFields{text other}}} assets{__typename ... on ImageAsset{source image{altText}} ... on VideoAsset{source}}}} pageInfo{hasNextPage}}}`;
let state=await gql(query);if(state.posts.pageInfo.hasNextPage)throw Error('Incomplete');
writeFileSync(dir+'cleanup-before.json',JSON.stringify(state,null,2));
const ids=new Set(JSON.parse(readFileSync(dir+'receipts.json')).map(p=>p.id));
const targets=state.posts.edges.map(e=>e.node).filter(p=>ids.has(p.id)||(p.schedulingType==='notification'&&p.metadata.type==='story'&&plan.some(x=>x.prompt===p.metadata.stickerFields?.text)));
for(const p of targets){
if(p.schedulingType!=='notification'||p.metadata.type!=='story')throw Error('Unexpected target');
const r=await gql(`mutation($input:DeletePostInput!){deletePost(input:$input){__typename ... on MutationError{message}}}`,{input:{id:p.id}});
console.log('Deleted',p.id,JSON.stringify(r));
}
state.posts.edges=state.posts.edges.filter(e=>!targets.some(p=>p.id===e.node.id));
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
const final=await gql(query);writeFileSync(dir+'cancelled-after.json',JSON.stringify(final,null,2));
const posts=final.posts.edges.map(e=>e.node);
if(final.posts.pageInfo.hasNextPage||posts.length!==60||posts.some(p=>p.schedulingType==='notification'||ids.has(p.id)))throw Error('Unexpected remaining queue');
for(const {node:p} of state.posts.edges){const n=posts.find(n=>n.id===p.id);if(!n||n.text!==p.text||n.dueAt!==p.dueAt||n.schedulingType!==p.schedulingType||JSON.stringify(n.assets)!==JSON.stringify(p.assets))throw Error('Unexpected change '+p.id);}
if(posts.some(p=>/Planificació: interactive-|Story de seguiment · [a-f0-9]+/u.test(p.text)))throw Error('Label remains');
writeFileSync(dir+'cancellation.json',JSON.stringify({removed:targets.map(p=>p.id),cleaned:changed,remaining:posts.length},null,2));
console.log('VERIFIED removed '+targets.length+' manual Stories; cleaned '+changed.length+' labels; retained '+posts.length+' automatic posts.');
