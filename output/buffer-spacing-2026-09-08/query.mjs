import {readFileSync} from 'node:fs';
const env=Object.fromEntries(readFileSync('.env.local','utf8').split('\n').filter(l=>l.includes('=')&&!l.startsWith('#')).map(l=>{let i=l.indexOf('=');return [l.slice(0,i).trim(),l.slice(i+1).trim().replace(/^["']|["']$/g,'')]}));
export async function gql(query,variables={}){let r=await fetch('https://api.buffer.com',{method:'POST',headers:{Authorization:`Bearer ${env.BUFFER_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({query,variables})});let p=await r.json();if(p.errors)throw Error(JSON.stringify(p.errors));return p.data;}
if(process.argv[2]) console.log(JSON.stringify(await gql(process.argv[2]),null,2));
