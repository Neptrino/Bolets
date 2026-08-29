import { UMAMI_EVENT_NAMES } from "@/src/lib/umami-goals";

export const UMAMI_BLOCKED_PATHS = [
  "/admin",
  "/acces",
  "/compte",
  "/les-meves-troballes",
  "/moderacio",
  "/troballes/nova",
] as const;

export function isUmamiBlockedPath(pathname: string) {
  return UMAMI_BLOCKED_PATHS.some(
    (blockedPath) => pathname === blockedPath || pathname.startsWith(`${blockedPath}/`),
  );
}

const serializedBlockedPaths = JSON.stringify(UMAMI_BLOCKED_PATHS);
const serializedEventNames = JSON.stringify(UMAMI_EVENT_NAMES);

// Umami's recorder is separate from its page-view tracker. In v3.3.1 it does
// not apply data-before-send, data-exclude-search or data-exclude-hash, so keep
// this fail-closed filter in front of its heatmap endpoint. Session-replay
// payloads are rejected even if the server configuration is changed by hand.
export const umamiPrivacyGuard = `(function(){
  var blocked=${serializedBlockedPaths};
  var events=${serializedEventNames};
  var analyticsOrigin="https://analytics.bolets.app";
  var publicHosts=["bolets.app","www.bolets.app"];
  function isBlocked(pathname){return blocked.some(function(item){return pathname===item||pathname.indexOf(item+"/")===0})}
  function cleanPublicUrl(value){
    try{
      var url=new URL(value,window.location.origin);
      if(url.protocol!=="https:"||publicHosts.indexOf(url.hostname)===-1||isBlocked(url.pathname))return null;
      return url.origin+url.pathname;
    }catch(error){return null}
  }
  window.boletsUmamiBeforeSend=function(type,payload){
    if(type==="event"&&payload&&events.indexOf(payload.name)!==-1){
      return {website:payload.website,hostname:payload.hostname,language:payload.language,screen:payload.screen,name:payload.name,url:window.location.origin+"/analytics-event",title:"Analytics event"};
    }
    var cleanUrl=cleanPublicUrl(payload&&payload.url||window.location.href);
    if(!cleanUrl)return false;
    if(payload&&payload.url)payload=Object.assign({},payload,{url:cleanUrl});
    return payload;
  };
  var nativeFetch=window.fetch.bind(window);
  window.fetch=function(input,init){
    var requestUrl;
    try{requestUrl=new URL(typeof input==="string"?input:input.url,window.location.href)}catch(error){return nativeFetch(input,init)}
    if(requestUrl.origin!==analyticsOrigin||requestUrl.pathname!=="/api/record")return nativeFetch(input,init);
    function ignored(){return Promise.resolve(new Response(null,{status:204}))}
    if(!init||typeof init.body!=="string"||!cleanPublicUrl(window.location.href))return ignored();
    try{
      var body=JSON.parse(init.body);
      if(body.type!=="heatmap"||!body.payload||!Array.isArray(body.payload.events))return ignored();
      var events=body.payload.events.reduce(function(result,event){
        var url=event&&cleanPublicUrl(event.url);
        if(url)result.push(Object.assign({},event,{url:url}));
        return result;
      },[]);
      if(!events.length)return ignored();
      body=Object.assign({},body,{payload:Object.assign({},body.payload,{events:events})});
      return nativeFetch(input,Object.assign({},init,{body:JSON.stringify(body)}));
    }catch(error){return ignored()}
  };
})()`;
