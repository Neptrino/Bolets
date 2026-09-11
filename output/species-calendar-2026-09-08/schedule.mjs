import {gql} from '../buffer-spacing-2026-09-08/query.mjs';
import {writeFileSync} from 'node:fs';
const query=`query {posts(first:100,input:{organizationId:"6a95fdbaee9698b29f42ea56",filter:{channelIds:["6a960174065799be4662a8f5"],status:[scheduled]}}){edges{node{id text dueAt status schedulingType metadata{... on InstagramPostMetadata{type shouldShareToFeed isAiGenerated firstComment link geolocation{__typename} stickerFields{__typename}}} assets{__typename ... on ImageAsset{source thumbnail image{altText animatedThumbnail userTags{__typename}}} ... on VideoAsset{source}}}} pageInfo{hasNextPage}}}`;
const target={'Cep negre':'2026-09-21','Farinera borda':'2026-09-23','Llengua de bou':'2026-09-26','Reig bord':'2026-09-28','Carlet':'2026-09-30','Fredolic':'2026-10-03','Pimpinella morada':'2026-10-05','Bolet d’olivera':'2026-10-07'};
const before=await gql(query);
writeFileSync('output/species-calendar-2026-09-08/latest-before.json',JSON.stringify(before,null,2));
for(const [name,date]of Object.entries(target)){
const matches=before.posts.edges.map(e=>e.node).filter(p=>p.text.startsWith(name+' ('));
if(matches.length!==1){console.log(name+': '+matches.length+' matches; skipped');continue;}
const p=matches[0],dueAt=date+'T10:00:00.000Z';
if(p.dueAt===dueAt){console.log(name+': already correct');continue;}
if(p.assets.length!==5||p.metadata.geolocation||p.metadata.stickerFields||p.assets.some(a=>a.__typename!=='ImageAsset'||a.image.userTags?.length))throw Error('Unexpected assets');
const {geolocation,stickerFields,...instagram}=p.metadata;
const result=await gql(`mutation($input:EditPostInput!){editPost(input:$input){__typename ... on PostActionSuccess{post{id dueAt}} ... on InvalidInputError{message}}}`,{input:{id:p.id,dueAt,mode:'customScheduled',text:p.text,schedulingType:p.schedulingType,metadata:{instagram},assets:p.assets.map(a=>({image:{url:a.source,thumbnailUrl:a.thumbnail,metadata:{altText:a.image.altText,animatedThumbnail:a.image.animatedThumbnail,userTags:[]}}}))}});
if(result.editPost.__typename!=='PostActionSuccess')throw Error(JSON.stringify(result));
console.log(name+': '+dueAt);
}
const after=await gql(query);writeFileSync('output/species-calendar-2026-09-08/latest-after.json',JSON.stringify(after,null,2));
for(const {node:p}of before.posts.edges){const n=after.posts.edges.find(e=>e.node.id===p.id)?.node;if(!n||n.text!==p.text||JSON.stringify(n.assets.map(a=>a.source))!==JSON.stringify(p.assets.map(a=>a.source)))throw Error('Content changed');}
console.log('Queue total '+after.posts.edges.length);
