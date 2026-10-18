type Cue='shot'|'hit'|'splat'|'jump'|'hurt'|'ability'|'switch'|'objective'|'win'|'lose';
/** Local synthesized effects: no downloads, microphone access or account services. */
export class Audio {
  context:AudioContext|null=null;enabled=true;
  private master:GainNode|null=null;private noise:AudioBuffer|null=null;
  start(){
    if(!this.context){const ctx=this.context=new AudioContext();this.master=ctx.createGain();this.master.gain.value=.55;const limiter=ctx.createDynamicsCompressor();limiter.threshold.value=-18;limiter.ratio.value=5;this.master.connect(limiter).connect(ctx.destination);
      this.noise=ctx.createBuffer(1,ctx.sampleRate,ctx.sampleRate);const samples=this.noise.getChannelData(0);for(let i=0;i<samples.length;i++)samples[i]=Math.random()*2-1;
    }void this.context.resume();
  }
  dispose(){if(this.context)void this.context.close();this.context=null;this.master=null;this.noise=null;}
  private output(gain:GainNode,pan:number){if(!this.context||!this.master)return;const panner=this.context.createStereoPanner();panner.pan.value=Math.max(-1,Math.min(1,pan));gain.connect(panner).connect(this.master);return panner;}
  private pulse(frequency:number,end:number,duration:number,volume:number,pan=0,type:OscillatorType='sine',delay=0){
    if(!this.enabled||!this.context||!this.master)return;const ctx=this.context,t=ctx.currentTime+delay,osc=ctx.createOscillator(),gain=ctx.createGain();osc.type=type;osc.frequency.setValueAtTime(frequency,t);osc.frequency.exponentialRampToValueAtTime(Math.max(20,end),t+duration);gain.gain.setValueAtTime(.0001,t);gain.gain.exponentialRampToValueAtTime(volume,t+.006);gain.gain.exponentialRampToValueAtTime(.0001,t+duration);osc.connect(gain);const panner=this.output(gain,pan);osc.onended=()=>{osc.disconnect();gain.disconnect();panner?.disconnect();};osc.start(t);osc.stop(t+duration+.01);
  }
  private splash(duration:number,volume:number,cutoff:number,pan=0){
    if(!this.enabled||!this.context||!this.noise)return;const ctx=this.context,t=ctx.currentTime,source=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain();source.buffer=this.noise;filter.type='lowpass';filter.frequency.setValueAtTime(cutoff,t);filter.frequency.exponentialRampToValueAtTime(180,t+duration);gain.gain.setValueAtTime(volume,t);gain.gain.exponentialRampToValueAtTime(.0001,t+duration);source.connect(filter).connect(gain);const panner=this.output(gain,pan);source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect();panner?.disconnect();};source.start(t,Math.random()*.3,duration);
  }
  shot(hero='runner',pan=0){const heavy=hero==='anchor'||hero==='breacher',precision=hero==='ranger';this.splash(heavy?.14:.075,heavy?.15:.085,precision?3600:1800,pan);this.pulse(heavy?130:precision?310:210,heavy?45:75,heavy?.18:.1,heavy?.13:.075,pan,'triangle');if(precision)this.pulse(1500,650,.08,.025,pan);}
  step(ink=false,pan=0){this.splash(ink?.09:.045,ink?.035:.023,ink?900:1400,pan);this.pulse(ink?180:100,45,.055,.022,pan);}
  tone(kind:Cue,pan=0){
    if(!this.enabled||!this.context)return;
    switch(kind){
      case 'shot':this.shot('runner',pan);break;
      case 'hit':this.splash(.045,.07,2400,pan);this.pulse(720,420,.055,.05,pan,'triangle');break;
      case 'splat':this.splash(.28,.18,1700,pan);this.pulse(260,55,.3,.15,pan);break;
      case 'jump':this.pulse(130,340,.12,.045,pan);break;
      case 'hurt':this.splash(.12,.1,700,pan);this.pulse(90,40,.18,.09,pan);break;
      case 'ability':this.pulse(180,820,.22,.07,pan,'triangle');this.splash(.17,.06,2600,pan);break;
      case 'switch':this.pulse(440,660,.065,.04,pan);this.pulse(660,880,.07,.035,pan,'sine',.065);break;
      case 'objective':this.splash(.55,.24,1400,pan);this.pulse(120,25,.55,.16,pan);break;
      case 'win':for(const [i,note] of [440,554,659,880].entries())this.pulse(note,note,.25,.06,pan,'triangle',i*.1);break;
      case 'lose':this.pulse(220,110,.4,.07,pan,'triangle');break;
    }
  }
}
