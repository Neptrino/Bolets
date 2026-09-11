throw new Error('Cancelled by user: do not create manual-completion Stories.');
import {gql} from '../buffer-spacing-2026-09-08/query.mjs';
import {readFileSync,writeFileSync} from 'node:fs';
const dir='output/interactive-stories-2026-09-08/';
const plan=JSON.parse(readFileSync(dir+'plan.json'));
const query=`query {posts(first:100,input:{organizationId:"6a95fdbaee9698b29f42ea56",filter:{channelIds:["6a960174065799be4662a8f5"],status:[scheduled]}}){edges{node{id text dueAt schedulingType metadata{... on InstagramPostMetadata{type shouldShareToFeed stickerFields{text other}}} assets{__typename ... on ImageAsset{source}}}} pageInfo{hasNextPage}}}`;
const before=await gql(query);if(before.posts.pageInfo.hasNextPage)throw Error('Incomplete');const receipts=[];
for(const p of plan){
const matches=before.posts.edges.map(e=>e.node).filter(n=>n.text.includes(p.key));if(matches.length>1)throw Error('Duplicate');if(matches.length===1){receipts.push({key:p.key,id:matches[0].id,dueAt:matches[0].dueAt});continue;}
const r=await gql(`mutation($input:CreatePostInput!){createPost(input:$input){__typename ... on PostActionSuccess{post{id dueAt status schedulingType}} ... on MutationError{message}}}`,{input:{channelId:'6a960174065799be4662a8f5',mode:'customScheduled',dueAt:p.dueAt,schedulingType:'notification',assets:[{image:{url:p.asset.source,metadata:{altText:p.asset.image.altText||'Fotografia del nostre arxiu de camp; fons per a una pregunta a la comunitat.'}}}],text:p.prompt+'\n\n'+p.instructions+'\n\nPlanificació: '+p.key,metadata:{instagram:{type:'story',shouldShareToFeed:false,isAiGenerated:false,stickerFields:{text:p.prompt,other:p.instructions}}}}});
if(r.createPost.__typename!=='PostActionSuccess')throw Error(JSON.stringify(r));receipts.push({key:p.key,id:r.createPost.post.id,dueAt:r.createPost.post.dueAt});writeFileSync(dir+'receipts.json',JSON.stringify(receipts,null,2));console.log(`${receipts.length}/18 ${p.prompt}`);
}
const after=await gql(query);writeFileSync(dir+'after.json',JSON.stringify(after,null,2));if(after.posts.pageInfo.hasNextPage)throw Error('Incomplete verification');
for(const p of plan){const m=after.posts.edges.map(e=>e.node).filter(n=>n.text.includes(p.key));if(m.length!==1||m[0].dueAt!==p.dueAt||m[0].schedulingType!=='notification'||m[0].metadata.type!=='story'||m[0].metadata.shouldShareToFeed!==false||m[0].metadata.stickerFields?.other!==p.instructions)throw Error('Verification failed '+p.key);}
for(const {node:p}of before.posts.edges){const n=after.posts.edges.find(e=>e.node.id===p.id)?.node;if(!n||n.dueAt!==p.dueAt||n.text!==p.text||n.schedulingType!==p.schedulingType)throw Error('Existing entry changed');}
console.log('Verified all 18 notification Stories; queue total '+after.posts.edges.length);
