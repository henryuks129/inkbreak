import type {AvatarStyle} from './character.ts';
export interface HostPlayer {id:string;displayName:string;appearance:{bodyColor:string;headColor:string;accentColor:string};style?:AvatarStyle;account?:string;face?:string;isGuest?:boolean}
export interface PlatformAdapter {
 getPlayer():Promise<HostPlayer|null>;
 subscribeAppearance?(handler:(appearance:HostPlayer['appearance'])=>void):()=>void;
 subscribePlayer?(handler:(player:HostPlayer|null)=>void):()=>void;
 dispose?():void;
}
declare global {interface Window {inkbreakHost?:PlatformAdapter}}
export const START_NG='https://start.ng';
export const DEFAULT_STYLE:AvatarStyle={body:'male',primaryColor:'#20ddcf',secondaryColor:'#192e3b',skinColor:'#e4ae8a',hairColor:'#17120f',hair:'short',hat:'none',accessory:'none'};
const record=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const color=(v:unknown):v is string=>typeof v==='string'&&/^#[0-9a-f]{6}$/i.test(v);
export function validateAppearance(value:unknown):value is HostPlayer['appearance'] {return record(value)&&['bodyColor','headColor','accentColor'].every(key=>color(value[key]));}
export function normalizeStyle(value:unknown):AvatarStyle {
 const v=record(value)?value:{};
 const choice=<T extends string>(key:string,values:readonly T[],fallback:T):T=>typeof v[key]==='string'&&values.includes(v[key] as T)?v[key] as T:fallback;
 return {body:choice('body',['male','female'],DEFAULT_STYLE.body),primaryColor:color(v.primaryColor)?v.primaryColor:DEFAULT_STYLE.primaryColor,secondaryColor:color(v.secondaryColor)?v.secondaryColor:DEFAULT_STYLE.secondaryColor,skinColor:color(v.skinColor)?v.skinColor:DEFAULT_STYLE.skinColor,hairColor:color(v.hairColor)?v.hairColor:DEFAULT_STYLE.hairColor,hair:choice('hair',['short','afro','braids','bun','ponytail','dreads','bald'],DEFAULT_STYLE.hair),hat:choice('hat',['none','cap','beanie','tophat','crown'],DEFAULT_STYLE.hat),accessory:choice('accessory',['none','glasses','earrings','beard','scarf','backpack'],DEFAULT_STYLE.accessory)};
}
export function normalizeStartNgReply(reply:unknown):HostPlayer|null {
 if(!record(reply))return null;
 const signed=record(reply.user)&&((typeof reply.user.id==='number'&&Number.isSafeInteger(reply.user.id)&&reply.user.id>0)||(typeof reply.user.id==='string'&&reply.user.id.trim().length>0));
 const player=signed?reply.user:reply.guest;if(!record(player))return null;
 const style=normalizeStyle(player.style),text=(v:unknown,limit:number)=>typeof v==='string'?v.trim().slice(0,limit):'';
 const face=typeof player.face==='string'&&player.face.length<2000000&&/^data:image\/png;base64,[A-Za-z0-9+/]+=*$/.test(player.face)?player.face:undefined;
 return {id:signed?String(player.id):'startng:guest',displayName:text(player.name,80)||(signed?'Player':'Guest'),account:signed?text(player.account,80):undefined,isGuest:!signed,style,face,appearance:{bodyColor:style.primaryColor,headColor:style.hairColor,accentColor:style.secondaryColor}};
}
export function signInUrl(location:Pick<Location,'origin'|'pathname'>):string {return START_NG+'/?return_to='+encodeURIComponent(location.origin+location.pathname);}
export interface StartNgEnvironment {window:Window;document:Document;requestId?:()=>string;timeoutMs?:number}
export function createStartNgAdapter(env:StartNgEnvironment={window,document}):PlatformAdapter {
 const win=env.window,doc=env.document,timeout=env.timeoutMs??5000;
 let frame:HTMLIFrameElement|undefined,loading:Promise<HTMLIFrameElement|null>|undefined,inflight:Promise<HostPlayer|null>|undefined,disposed=false;
 const listeners=new Set<(player:HostPlayer|null)=>void>(),cancelPending=new Set<()=>void>();
 function load():Promise<HTMLIFrameElement|null>{
  if(disposed)return Promise.resolve(null);if(loading)return loading;
  loading=new Promise(resolve=>{const el=doc.createElement('iframe');frame=el;el.hidden=true;el.title='start.ng player connection';
   const done=(value:HTMLIFrameElement|null)=>{clearTimeout(timer);el.onload=null;el.onerror=null;cancelPending.delete(cancel);if(!value){el.remove();if(frame===el)frame=undefined;loading=undefined;}resolve(value);};
   const cancel=()=>done(null),timer=setTimeout(cancel,timeout);cancelPending.add(cancel);el.onload=()=>done(el);el.onerror=cancel;el.src=START_NG+'/connect';doc.body.append(el);
  });return loading;
 }
 async function ask():Promise<HostPlayer|null>{
  const el=await load();if(!el||disposed||!el.contentWindow)return null;
  return new Promise(resolve=>{const requestId=env.requestId?.()??win.crypto.randomUUID();
   const done=(value:HostPlayer|null)=>{clearTimeout(timer);win.removeEventListener('message',onMessage);cancelPending.delete(cancel);resolve(value);};
   const cancel=()=>done(null),timer=setTimeout(cancel,timeout);cancelPending.add(cancel);
   function onMessage(event:MessageEvent){if(event.origin!==START_NG||event.source!==el!.contentWindow||!record(event.data)||event.data.type!=='startng:user'||event.data.requestId!==requestId)return;done(normalizeStartNgReply(event.data));}
   win.addEventListener('message',onMessage);
   try{el!.contentWindow!.postMessage({type:'startng:whoami',requestId},START_NG);}catch{cancel();}
  });
 }
 function getPlayer(){if(disposed)return Promise.resolve(null);if(inflight)return inflight;inflight=ask().catch(()=>null).finally(()=>{inflight=undefined;});return inflight;}
 let refreshing=false;
 function refresh(){if(disposed||doc.visibilityState==='hidden'||refreshing)return;refreshing=true;void getPlayer().then(player=>{if(!disposed)for(const listener of listeners)listener(player);}).finally(()=>{refreshing=false;});}
 win.addEventListener('focus',refresh);doc.addEventListener('visibilitychange',refresh);
 return {getPlayer,subscribePlayer(handler){listeners.add(handler);return ()=>listeners.delete(handler);},dispose(){if(disposed)return;disposed=true;win.removeEventListener('focus',refresh);doc.removeEventListener('visibilitychange',refresh);for(const cancel of [...cancelPending])cancel();listeners.clear();frame?.remove();frame=undefined;}};
}
export async function connectPlatform(adapter?:PlatformAdapter) {
 const host=adapter??(typeof window!=='undefined'?window.inkbreakHost:undefined);
 const official=!host&&typeof window!=='undefined'&&window.location.hostname.endsWith('.start.ng');
 const selected=host??(official?createStartNgAdapter():undefined);
 if(!selected)return {player:null,adapter:null,status:'Standalone practice',dispose:()=>{}};
 const player=await selected.getPlayer();
 if(player&&(typeof player.id!=='string'||!player.id.trim()||typeof player.displayName!=='string'||!player.displayName.trim()||!validateAppearance(player.appearance))){selected.dispose?.();throw new Error('Host did not provide a valid player and appearance.');}
 return {player,adapter:selected,status:player?(player.isGuest?'Playing as Guest':'Playing as '+player.displayName):'start.ng connection unavailable',dispose:()=>selected.dispose?.()};
}
