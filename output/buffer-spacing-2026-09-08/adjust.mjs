import {gql} from './query.mjs';
import {readFileSync,writeFileSync} from 'node:fs';
const path='output/buffer-spacing-2026-09-08/';
const before=JSON.parse(readFileSync(path+'before.json','utf8'));
const changes=[
['6aa07bb006c021630288ba68','2026-09-09T18:30:00.000Z'],
['6aa06cb727069569231fb42a','2026-09-12T16:00:00.000Z'],
['6a9f213a7e178ae863213803','2026-09-13T16:00:00.000Z'],
['6aa06d171b4f0210e34232bd','2026-09-20T10:00:00.000Z'],
['6aa06ce627069569231fbec2','2026-09-19T16:00:00.000Z'],
['6aa06d2c1b4f0210e3423443','2026-09-17T10:00:00.000Z']];
const results=[];
for(const [id,dueAt]of changes){
const original=before.posts.edges.find(e=>e.node.id===id).node;
if(original.metadata.geolocation||original.metadata.stickerFields||original.assets.some(a=>a.__typename!=='ImageAsset'||a.image.userTags?.length))throw Error('Unsupported metadata');
const {geolocation,stickerFields,...instagram}=original.metadata;
const r=await gql(`mutation($input:EditPostInput!){editPost(input:$input){__typename ... on PostActionSuccess{post{id dueAt status}} ... on InvalidInputError{message} ... on UnexpectedError{message}}}`,{input:{id,dueAt,mode:'customScheduled',text:original.text,schedulingType:original.schedulingType,metadata:{instagram},assets:original.assets.map(a=>({image:{url:a.source,thumbnailUrl:a.thumbnail,metadata:{altText:a.image.altText,animatedThumbnail:a.image.animatedThumbnail,userTags:[]}}}))}});
results.push(r);writeFileSync(path+'changes.json',JSON.stringify(results,null,2));
if(r.editPost.__typename!=='PostActionSuccess')throw Error(JSON.stringify(r));
console.log(JSON.stringify(r.editPost.post));
}
const after=await gql(`query {posts(first:100,input:{organizationId:"6a95fdbaee9698b29f42ea56",filter:{channelIds:["6a960174065799be4662a8f5"],status:[scheduled]}}){edges{node{id text dueAt status schedulingType metadata{... on InstagramPostMetadata{type shouldShareToFeed isAiGenerated firstComment link geolocation{__typename} stickerFields{__typename}}} assets{__typename ... on ImageAsset{source thumbnail image{altText animatedThumbnail userTags{__typename}}} ... on VideoAsset{source}}}} pageInfo{hasNextPage}}}`);
writeFileSync(path+'after.json',JSON.stringify(after,null,2));
if(after.posts.pageInfo.hasNextPage||after.posts.edges.length!==before.posts.edges.length)throw Error('Queue count mismatch');
for(const {node:p}of before.posts.edges){const next=after.posts.edges.find(e=>e.node.id===p.id)?.node;const expected=changes.find(c=>c[0]===p.id)?.[1]??p.dueAt;if(!next||next.dueAt!==expected||next.text!==p.text||JSON.stringify(next.assets.map(a=>({...a,image:a.image?{...a.image,userTags:a.image.userTags??[]}:undefined})))!==JSON.stringify(p.assets.map(a=>({...a,image:a.image?{...a.image,userTags:a.image.userTags??[]}:undefined}))))throw Error('Verification mismatch '+p.id);}
const schedule=after.posts.edges.map(e=>({id:e.node.id,due:e.node.dueAt}));
for(const d of ['11','18'])schedule.push({id:'reserved-friday-reel',due:`2026-09-${d}T16:00:00.000Z`});
schedule.sort((a,b)=>Date.parse(a.due)-Date.parse(b.due));
const min=Math.min(...schedule.slice(1).map((p,i)=>(Date.parse(p.due)-Date.parse(schedule[i].due))/3600000));
if(min<4)throw Error('Spacing too close '+min);
console.log('Verified: 22 posts, captions/media preserved, minimum gap including Friday reservations: '+min.toFixed(2)+' hours');
