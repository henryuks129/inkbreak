import type {HostPlayer} from './platform.ts';

const START_NG='https://start.ng';
const GAME_PAGE='https://inkbreak.start.ng/';
export interface MatchStats {points:number;splats:number;paint:number}
export interface LeaderboardEntry {rank:number;playerId:string;name:string;color:string;stats:MatchStats}
export interface SaveResult {ok:boolean;best?:number;improved?:boolean;rank?:number;error?:string}
type HostReply=Record<string,unknown>;
const isRecord=(value:unknown):value is HostReply=>!!value&&typeof value==='object'&&!Array.isArray(value);
const whole=(value:unknown)=>typeof value==='number'&&Number.isInteger(value)&&value>=0&&value<=1_000_000_000;
export function matchStats(value:unknown):MatchStats|null {
  if(!isRecord(value)||!whole(value.points)||!whole(value.splats)||!whole(value.paint))return null;
  return {points:value.points as number,splats:value.splats as number,paint:value.paint as number};
}
export function normalizeBoard(value:unknown):LeaderboardEntry[]|null {
  if(!isRecord(value)||value.ok!==true||!Array.isArray(value.entries))return null;
  return value.entries.slice(0,50).flatMap((row:unknown)=>{
    if(!isRecord(row)||!whole(row.rank)||!matchStats(row.stats)||typeof row.name!=='string')return [];
    const id=row.player_id;
    if(!(typeof id==='string'||typeof id==='number'))return [];
    return [{rank:row.rank as number,playerId:String(id),name:row.name.trim().slice(0,80),color:typeof row.color==='string'&&/^#[0-9a-f]{6}$/i.test(row.color)?row.color:'#20ddcf',stats:matchStats(row.stats)!}];
  });
}
export function shareResultUrl(stats:MatchStats):string {
  const safe=matchStats(stats);if(!safe)throw new RangeError('Match stats must be whole numbers.');
  const text=`I scored ${safe.points} points and ${safe.splats} splats in Inkbreak. Can you beat me?`;
  return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(GAME_PAGE)}`;
}

export interface CompetitionEnvironment {
  window:Window;document:Document;player:()=>HostPlayer|null;requestId?:()=>string;timeoutMs?:number;
}
/** The connect frame accepts scores and returns the public board only for hosted games. */
export class StartNgCompetition {
  private frame:HTMLIFrameElement|undefined;
  private loading:Promise<HTMLIFrameElement|null>|undefined;
  private disposed=false;
  private pending=new Set<()=>void>();
  constructor(private readonly env:CompetitionEnvironment){}
  get available(){return !this.disposed&&this.env.window.location.hostname.endsWith('.start.ng');}
  private load():Promise<HTMLIFrameElement|null>{
    if(!this.available)return Promise.resolve(null);
    if(this.frame)return Promise.resolve(this.frame);
    if(this.loading)return this.loading;
    const {document:doc}=this.env,timeout=this.env.timeoutMs??5000;
    this.loading=new Promise(resolve=>{
      const frame=doc.createElement('iframe');frame.hidden=true;frame.title='start.ng leaderboard connection';
      const done=(value:HTMLIFrameElement|null)=>{clearTimeout(timer);this.pending.delete(cancel);frame.onload=null;frame.onerror=null;if(!value){frame.remove();this.loading=undefined;}else this.frame=frame;resolve(value);};
      const cancel=()=>done(null),timer=setTimeout(cancel,timeout);this.pending.add(cancel);
      frame.onload=()=>done(frame);frame.onerror=cancel;frame.src=START_NG+'/connect';doc.body.append(frame);
    });return this.loading;
  }
  private async request(message:HostReply,replyType:string):Promise<HostReply|null>{
    const frame=await this.load();if(!frame||this.disposed||!frame.contentWindow)return null;
    const target=frame.contentWindow;
    const {window:win}=this.env,timeout=this.env.timeoutMs??5000;
    return new Promise(resolve=>{
      const requestId=this.env.requestId?.()??win.crypto.randomUUID();
      const done=(reply:HostReply|null)=>{clearTimeout(timer);win.removeEventListener('message',onMessage);this.pending.delete(cancel);resolve(reply);};
      const cancel=()=>done(null),timer=setTimeout(cancel,timeout);this.pending.add(cancel);
      const onMessage=(event:MessageEvent)=>{if(event.origin!==START_NG||event.source!==target||!isRecord(event.data)||event.data.type!==replyType||event.data.requestId!==requestId)return;done(event.data);};
      win.addEventListener('message',onMessage);
      try{target.postMessage({...message,requestId},START_NG);}catch{cancel();}
    });
  }
  async saveRun(stats:MatchStats):Promise<SaveResult>{
    const safe=matchStats(stats);if(!safe)throw new RangeError('Match stats must be whole numbers.');
    if(!this.available)return {ok:false,error:'Leaderboard is available on inkbreak.start.ng.'};
    const player=this.env.player();
    if(!player||player.isGuest)return {ok:false,error:'Sign in to save your best run.'};
    const reply=await this.request({type:'startng:score',stats:safe},'startng:scoreSaved');
    if(!reply)return {ok:false,error:'start.ng did not answer. Try again later.'};
    if(reply.ok!==true)return {ok:false,error:typeof reply.error==='string'?reply.error.slice(0,160):'The run was not saved.'};
    const result=isRecord(reply.result)?reply.result:{};
    return {ok:true,best:whole(result.best)?result.best as number:undefined,improved:result.improved===true,rank:whole(result.rank)?result.rank as number:undefined};
  }
  async leaderboard(limit=10):Promise<LeaderboardEntry[]|null>{
    if(!this.available)return null;
    const reply=await this.request({type:'startng:leaderboard',limit:Math.max(1,Math.min(50,Math.trunc(limit)||10))},'startng:leaderboardData');
    return normalizeBoard(reply);
  }
  dispose(){if(this.disposed)return;this.disposed=true;for(const cancel of [...this.pending])cancel();this.frame?.remove();this.frame=undefined;this.loading=undefined;}
}
export function createCompetition(player:()=>HostPlayer|null,env?:Partial<Omit<CompetitionEnvironment,'player'>>){
  return new StartNgCompetition({window:env?.window??window,document:env?.document??document,player,requestId:env?.requestId,timeoutMs:env?.timeoutMs});
}
