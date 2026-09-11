import {gql} from '../buffer-spacing-2026-09-08/query.mjs';
import {readFileSync,writeFileSync} from 'node:fs';
const dir='output/followup-stories-2026-09-08/';
const plan=JSON.parse(readFileSync(dir+'plan.json'));
const before=JSON.parse(readFileSync(dir+'before.json'));
const query=`query {posts(first:100,input:{organizationId:"6a95fdbaee9698b29f42ea56",filter:{channelIds:["6a960174065799be4662a8f5"],status:[scheduled]}}){edges{node{id text dueAt status schedulingType metadata{... on InstagramPostMetadata{type shouldShareToFeed isAiGenerated}} assets{__typename ... on ImageAsset{source image{altText}} ... on VideoAsset{source}}}} pageInfo{hasNextPage}}}`;
const current=await gql(query);if(current.posts.pageInfo.hasNextPage)throw Error('Incomplete queue');
const receipts=[];
for(const item of plan){
const marker=`Story de seguiment · ${item.sourcePostId}`;
const existing=current.posts.edges.map(e=>e.node).filter(p=>p.metadata.type==='story'&&p.text.includes(marker));
if(existing.length){if(existing.length!==1||existing[0].dueAt!==item.dueAt)throw Error('Unexpected existing story');receipts.push({sourcePostId:item.sourcePostId,storyId:existing[0].id,dueAt:item.dueAt});continue;}
const source=before.posts.edges.find(e=>e.node.id===item.sourcePostId).node;
const asset=item.asset.__typename==='ImageAsset'?{image:{url:item.asset.source,metadata:{altText:item.asset.image.altText}}}:{video:{url:item.asset.source}};
const result=await gql(`mutation($input:CreatePostInput!){createPost(input:$input){__typename ... on PostActionSuccess{post{id dueAt status}} ... on MutationError{message}}}`,{input:{channelId:'6a960174065799be4662a8f5',mode:'customScheduled',dueAt:item.dueAt,schedulingType:'automatic',text:source.text+'\n\n'+marker,assets:[asset],metadata:{instagram:{type:'story',shouldShareToFeed:false,isAiGenerated:item.isAiGenerated}}}});
if(result.createPost.__typename!=='PostActionSuccess')throw Error(JSON.stringify(result));
receipts.push({sourcePostId:item.sourcePostId,storyId:result.createPost.post.id,dueAt:item.dueAt});writeFileSync(dir+'receipts.json',JSON.stringify(receipts,null,2));console.log(`${receipts.length}/30 ${item.title.slice(0,55)} -> ${item.dueAt}`);
}
const after=await gql(query);writeFileSync(dir+'after.json',JSON.stringify(after,null,2));if(after.posts.pageInfo.hasNextPage)throw Error('Incomplete verification');
const posts=after.posts.edges.map(e=>e.node);
for(const item of plan){const m=posts.filter(p=>p.metadata.type==='story'&&p.text.includes(`Story de seguiment · ${item.sourcePostId}`));if(m.length!==1||m[0].dueAt!==item.dueAt||m[0].assets.length!==1||m[0].assets[0].source!==item.asset.source||m[0].schedulingType!=='automatic'||m[0].metadata.shouldShareToFeed!==false)throw Error('Story verification failed '+item.sourcePostId);const original=posts.find(p=>p.id===item.sourcePostId);const b=before.posts.edges.find(e=>e.node.id===item.sourcePostId).node;if(!original||original.dueAt!==b.dueAt||original.text!==b.text)throw Error('Original changed');}
console.log('VERIFIED '+posts.filter(p=>p.metadata.type==='story').length+' stories; '+posts.filter(p=>p.metadata.type!=='story').length+' feed posts.');
