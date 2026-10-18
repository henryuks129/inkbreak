/** Small deterministic floor grid: rebuilt per arena, searched only on AI planning ticks. */
export class Navigation {
  readonly size=29; readonly step=2; blocked:Uint8Array;
  constructor(isBlocked:(x:number,z:number)=>boolean){this.blocked=new Uint8Array(this.size*this.size);for(let z=0;z<this.size;z++)for(let x=0;x<this.size;x++)this.blocked[z*this.size+x]=Number(isBlocked(x*2-28,z*2-28));}
  path(sx:number,sz:number,tx:number,tz:number):Array<{x:number,z:number}>{
    const cell=(x:number,z:number)=>Math.max(0,Math.min(28,Math.round((z+28)/2)))*29+Math.max(0,Math.min(28,Math.round((x+28)/2)));
    const start=cell(sx,sz),end=cell(tx,tz),queue=[start],seen=new Int32Array(841).fill(-1);seen[start]=start;let best=start,bd=Infinity;
    for(let q=0;q<queue.length;q++){const c=queue[q],x=c%29,z=Math.floor(c/29),dist=(x-end%29)**2+(z-Math.floor(end/29))**2;if(dist<bd){best=c;bd=dist;}if(c===end)break;for(const [dx,dz] of [[0,1],[0,-1],[1,0],[-1,0]]){const nx=x+dx,nz=z+dz,n=nz*29+nx;if(nx<0||nx>28||nz<0||nz>28||seen[n]!==-1||this.blocked[n])continue;seen[n]=c;queue.push(n);}}
    const result=[];for(let c=best;c!==start;c=seen[c]){if(c<0)break;result.push({x:c%29*2-28,z:Math.floor(c/29)*2-28});}return result.reverse();
  }
}
