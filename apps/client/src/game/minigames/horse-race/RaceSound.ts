/** Optional local synthesis, enabled by the start gesture. */
export class RaceSound{
 private context?:AudioContext;private master?:GainNode;private lastHoof=0;muted=false;
 async enable(){try{this.context??=new AudioContext();if(!this.master){this.master=this.context.createGain();this.master.gain.value=10**(-18/20);this.master.connect(this.context.destination);}await this.context.resume();}catch{/* Audio is optional. */}}
 toggle(){this.muted=!this.muted;if(this.master)this.master.gain.value=this.muted?0:10**(-18/20);}
 cue(high=false){const c=this.context,m=this.master;if(!c||!m||c.state!=='running'||this.muted)return;const o=c.createOscillator(),gain=c.createGain();o.type=high?'sine':'triangle';o.frequency.setValueAtTime(high?880:240,c.currentTime);o.frequency.exponentialRampToValueAtTime(high?1320:80,c.currentTime+.13);gain.gain.setValueAtTime(.35,c.currentTime);gain.gain.exponentialRampToValueAtTime(.001,c.currentTime+.18);o.connect(gain);gain.connect(m);o.start();o.stop(c.currentTime+.2);o.onended=()=>{try{o.disconnect();gain.disconnect();}catch{/* Already disposed. */}};}
 hoof(time:number,speed:number){if(speed<2||time-this.lastHoof<Math.max(.11,.35-speed*.01))return;this.lastHoof=time;this.cue();}
 dispose(){if(this.context)void this.context.close().catch(()=>{});this.context=undefined;this.master=undefined;}
}
