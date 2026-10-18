import test from 'node:test';
import assert from 'node:assert/strict';
import {getEventListeners} from 'node:events';
import {connectPlatform,validateAppearance,normalizeStyle,normalizeStartNgReply,createStartNgAdapter,signInUrl,START_NG,DEFAULT_STYLE,type HostPlayer} from './platform.ts';
const turn=()=>new Promise(resolve=>setTimeout(resolve,0));
function harness(timeoutMs=40){
 const win=new EventTarget(),doc=Object.assign(new EventTarget(),{visibilityState:'visible'});
 const frames:Array<{onload:null|(()=>void);onerror:null|(()=>void);removed:boolean;remove:()=>void;contentWindow:{postMessage:(message:unknown,origin:string)=>void}}> = [];
 const sent:Array<{message:{type:string;requestId:string};origin:string}>=[];
 Object.assign(doc,{createElement:()=>{const el={onload:null,onerror:null,removed:false,remove(){this.removed=true;},contentWindow:{postMessage:(message:unknown,origin:string)=>sent.push({message:message as {type:string;requestId:string},origin})}};frames.push(el);return el;},body:{append(){}}});
 let id=0;const adapter=createStartNgAdapter({window:win as unknown as Window,document:doc as unknown as Document,timeoutMs,requestId:()=>String(++id)});
 function reply(data:unknown,origin=START_NG,source:unknown=frames.at(-1)?.contentWindow){const event=new Event('message');Object.assign(event,{data,origin,source});win.dispatchEvent(event);}
 return {win,doc,frames,sent,adapter,reply};
}
const user={id:42,name:'Runner Tee',account:'Hamzat',style:{body:'female',primaryColor:'#a55eea',secondaryColor:'#0c6e5a',skinColor:'#8d5524',hairColor:'#17120f',hair:'braids',hat:'crown',accessory:'earrings'},face:'data:image/png;base64,aGVsbG8='};
test('legacy host adapter still validates appearance and player',async()=>{
 const appearance={bodyColor:'#20ddcf',headColor:'#e4ff62',accentColor:'#ffffff'};
 assert.equal(validateAppearance(appearance),true);assert.equal(validateAppearance({bodyColor:'red'}),false);
 await assert.rejects(connectPlatform({getPlayer:async()=>({id:'x',displayName:'A',appearance:null as never})}));
 const result=await connectPlatform({getPlayer:async()=>({id:'x',displayName:'A',appearance})});assert.equal(result.player?.id,'x');assert.equal(result.status,'Playing as A');
 assert.equal((await connectPlatform()).status,'Standalone practice');
});
test('normalizes complete identity, preserves every style option, and safely falls back',()=>{
 const player=normalizeStartNgReply({user});assert.equal(player?.id,'42');assert.deepEqual(player?.style,user.style);assert.equal(player?.face,user.face);assert.equal(player?.account,'Hamzat');
 for(const hair of ['short','afro','braids','bun','ponytail','dreads','bald'])assert.equal(normalizeStyle({hair}).hair,hair);
 for(const hat of ['none','cap','beanie','tophat','crown'])assert.equal(normalizeStyle({hat}).hat,hat);
 for(const accessory of ['none','glasses','earrings','beard','scarf','backpack'])assert.equal(normalizeStyle({accessory}).accessory,accessory);
 assert.deepEqual(normalizeStyle({body:'alien',hair:'future',primaryColor:'red',skinColor:null}),DEFAULT_STYLE);
 const guest=normalizeStartNgReply({user:null,guest:{name:'Guest',style:{hair:'afro',hat:'beanie'},face:'https://bad.invalid/tracker'}});assert.equal(guest?.isGuest,true);assert.equal(guest?.style?.hair,'afro');assert.equal(guest?.face,undefined);
 assert.equal(normalizeStartNgReply({user:null}),null);assert.equal(normalizeStartNgReply([]),null);
 assert.equal(signInUrl({origin:'https://inkbreak.start.ng',pathname:'/play/'}),'https://start.ng/?return_to=https%3A%2F%2Finkbreak.start.ng%2Fplay%2F');
});
test('accepts only exact trusted source, origin, type and request correlation',async()=>{
 const h=harness();try{const pending=h.adapter.getPlayer();h.frames[0].onload!();await turn();const request=h.sent[0];assert.deepEqual(request,{message:{type:'startng:whoami',requestId:'1'},origin:START_NG});
 let settled=false;void pending.then(()=>{settled=true;});const good={type:'startng:user',requestId:'1',user};
 h.reply(good,'https://start.ng.evil.invalid');h.reply(good,START_NG,{});h.reply({...good,type:'wrong'});h.reply({...good,requestId:'old'});await turn();assert.equal(settled,false);
 h.reply(good);assert.equal((await pending)?.displayName,'Runner Tee');
 const next=h.adapter.getPlayer();await turn();assert.equal(h.sent[1].message.requestId,'2');h.reply({...good,requestId:'1'});h.reply({...good,requestId:'2',user:null,guest:{name:'Guest',style:{hat:'cap'}}});assert.equal((await next)?.style?.hat,'cap');
 }finally{h.adapter.dispose!();}
});
test('bounds initial frame loading, recovers after load failure, and bounds unanswered requests',async()=>{
 const h=harness(10);try{assert.equal(await h.adapter.getPlayer(),null);assert.equal(h.frames[0].removed,true);
 const failed=h.adapter.getPlayer();h.frames[1].onerror!();assert.equal(await failed,null);
 const pending=h.adapter.getPlayer();h.frames[2].onload!();assert.equal(await pending,null);assert.equal(h.sent.length,1);
 }finally{h.adapter.dispose!();}
});
test('focus and visibility refresh coalesce and update complete guest identity',async()=>{
 const h=harness();try{const updates:Array<HostPlayer|null>=[];const unsubscribe=h.adapter.subscribePlayer!(p=>updates.push(p));
 const initial=h.adapter.getPlayer();h.frames[0].onload!();await turn();h.reply({type:'startng:user',requestId:'1',user});await initial;
 h.win.dispatchEvent(new Event('focus'));h.doc.dispatchEvent(new Event('visibilitychange'));await turn();assert.equal(h.sent.length,2);
 h.reply({type:'startng:user',requestId:'2',user:null,guest:{name:'Guest',style:{body:'female',accessory:'scarf'}}});await turn();assert.equal(updates.length,1);assert.equal(updates[0]?.isGuest,true);assert.equal(updates[0]?.style?.accessory,'scarf');
 h.doc.visibilityState='hidden';h.win.dispatchEvent(new Event('focus'));await turn();assert.equal(h.sent.length,2);unsubscribe();
 }finally{h.adapter.dispose!();}
});
test('disposal settles pending work, removes the iframe and prevents later refresh',async()=>{
 const h=harness();const pending=h.adapter.getPlayer();h.adapter.dispose!();assert.equal(await pending,null);assert.equal(h.frames[0].removed,true);assert.equal(getEventListeners(h.win,'focus').length,0);assert.equal(getEventListeners(h.doc,'visibilitychange').length,0);h.win.dispatchEvent(new Event('focus'));h.doc.dispatchEvent(new Event('visibilitychange'));await turn();assert.equal(h.frames.length,1);assert.equal(await h.adapter.getPlayer(),null);
 const loaded=harness();const result=loaded.adapter.getPlayer();loaded.frames[0].onload!();await turn();loaded.adapter.dispose!();assert.equal(await result,null);assert.equal(getEventListeners(loaded.win,'message').length,0);loaded.reply({type:'startng:user',requestId:'1',user});assert.equal(loaded.frames[0].removed,true);
});
