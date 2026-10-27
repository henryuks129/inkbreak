import test from 'node:test';
import assert from 'node:assert/strict';
import {StartNgCompetition,matchStats,normalizeBoard,shareResultUrl} from './startng-competition.ts';
import type {HostPlayer} from './platform.ts';

const player:HostPlayer={id:'7',displayName:'Trini',appearance:{bodyColor:'#20ddcf',headColor:'#17120f',accentColor:'#c9ff67'},isGuest:false};
function host(){
  const win=Object.assign(new EventTarget(),{location:{hostname:'inkbreak.start.ng'},crypto:{randomUUID:()=> 'req-7'}});
  const sent:Array<Record<string,unknown>>=[];
  const frame={hidden:false,title:'',src:'',onload:null as (()=>void)|null,onerror:null as (()=>void)|null,removed:false,remove(){this.removed=true;},contentWindow:{postMessage(message:Record<string,unknown>,origin:string){assert.equal(origin,'https://start.ng');sent.push(message);}}};
  const doc={createElement(tag:string){assert.equal(tag,'iframe');return frame;},body:{append(){queueMicrotask(()=>frame.onload?.());}}};
  const emit=(origin:string,source:unknown,data:unknown)=>win.dispatchEvent(Object.assign(new Event('message'),{origin,source,data}));
  return {win,doc,frame,sent,emit};
}
test('leaderboard metadata validates whole-number columns and share points at game page',()=>{
  assert.deepEqual(matchStats({points:125,splats:3,paint:42}),{points:125,splats:3,paint:42});
  assert.equal(matchStats({points:1.5,splats:3,paint:42}),null);
  assert.equal(matchStats({points:1,splats:-1,paint:42}),null);
  const share=new URL(shareResultUrl({points:125,splats:3,paint:42}));
  assert.equal(share.hostname,'twitter.com');assert.equal(share.searchParams.get('url'),'https://inkbreak.start.ng/');
});
test('board parsing keeps only valid ranked entries and bounded names',()=>{
  const board=normalizeBoard({ok:true,entries:[{rank:1,player_id:7,name:'Trini',color:'#4b7bec',stats:{points:125,splats:3,paint:42}},{rank:2,name:'broken',stats:{points:0,splats:0,paint:0}}]});
  assert.deepEqual(board,[{rank:1,playerId:'7',name:'Trini',color:'#4b7bec',stats:{points:125,splats:3,paint:42}}]);
  assert.equal(normalizeBoard({ok:false,entries:[]}),null);
});
test('score and board accept only exact start.ng origin, frame source, reply and request ID',async()=>{
  const h=host();const api=new StartNgCompetition({window:h.win as unknown as Window,document:h.doc as unknown as Document,player:()=>player,requestId:()=> 'req-7',timeoutMs:300});
  const save=api.saveRun({points:125,splats:3,paint:42});await new Promise(resolve=>setTimeout(resolve,0));
  assert.deepEqual(h.sent[0],{type:'startng:score',stats:{points:125,splats:3,paint:42},requestId:'req-7'});
  const payload={type:'startng:scoreSaved',requestId:'req-7',ok:true,result:{best:125,rank:2,improved:true}};
  h.emit('https://evil.example',h.frame.contentWindow,payload);h.emit('https://start.ng',{},payload);h.emit('https://start.ng',h.frame.contentWindow,{...payload,requestId:'wrong'});
  let settled=false;void save.then(()=>{settled=true;});await new Promise(resolve=>setTimeout(resolve,0));assert.equal(settled,false);
  h.emit('https://start.ng',h.frame.contentWindow,payload);assert.deepEqual(await save,{ok:true,best:125,rank:2,improved:true});
  const board=api.leaderboard(500);await new Promise(resolve=>setTimeout(resolve,0));assert.deepEqual(h.sent[1],{type:'startng:leaderboard',limit:50,requestId:'req-7'});
  h.emit('https://start.ng',h.frame.contentWindow,{type:'startng:leaderboardData',requestId:'req-7',ok:true,entries:[{rank:1,player_id:7,name:'Trini',color:'#4b7bec',stats:{points:125,splats:3,paint:42}}]});
  assert.equal((await board)?.[0].name,'Trini');api.dispose();assert.equal(h.frame.removed,true);
});
test('guest and standalone runs cannot submit scores, but hosted guests can read the board',async()=>{
  const h=host();let current:HostPlayer={...player,isGuest:true};const api=new StartNgCompetition({window:h.win as unknown as Window,document:h.doc as unknown as Document,player:()=>current,requestId:()=> 'req-7',timeoutMs:300});
  assert.match((await api.saveRun({points:1,splats:0,paint:1})).error??'',/Sign in/);assert.equal(h.sent.length,0);
  const board=api.leaderboard();await new Promise(resolve=>setTimeout(resolve,0));h.emit('https://start.ng',h.frame.contentWindow,{type:'startng:leaderboardData',requestId:'req-7',ok:true,entries:[]});assert.deepEqual(await board,[]);
  api.dispose();current=player;
  const local=host();local.win.location.hostname='localhost';const standalone=new StartNgCompetition({window:local.win as unknown as Window,document:local.doc as unknown as Document,player:()=>current});
  assert.equal(await standalone.leaderboard(),null);assert.equal(local.sent.length,0);
});
