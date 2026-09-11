import {gql} from './query.mjs';
import {writeFileSync} from 'node:fs';
export const query=`query {posts(first:100,input:{organizationId:"6a95fdbaee9698b29f42ea56",filter:{channelIds:["6a960174065799be4662a8f5"],status:[scheduled]}}){edges{node{id text dueAt status schedulingType metadata{... on InstagramPostMetadata{type shouldShareToFeed isAiGenerated firstComment link geolocation{__typename} stickerFields{__typename}}} assets{__typename ... on ImageAsset{source thumbnail image{altText animatedThumbnail userTags{__typename}}} ... on VideoAsset{source}}}} pageInfo{hasNextPage}}}`;
const data=await gql(query);writeFileSync('output/buffer-spacing-2026-09-08/before.json',JSON.stringify(data,null,2));
console.log(JSON.stringify(data.posts.edges.map(({node:p})=>({id:p.id,time:p.dueAt,title:p.text.split('\n')[0]})),null,2));
