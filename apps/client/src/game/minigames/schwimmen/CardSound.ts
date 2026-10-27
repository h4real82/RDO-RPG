/** Optional paper/wood cues; enabled only by an explicit game gesture. */
export class CardSound{
 private context?:AudioContext;private master?:GainNode;private paper?:AudioBuffer;muted=false;
 enable(){try{if(!this.context){const c=this.context=new AudioContext();this.master=c.createGain();this.master.gain.value=10**(-20/20);this.master.connect(c.destination);this.paper=c.createBuffer(1,Math.floor(c.sampleRate*.09),c.sampleRate);const data=this.paper.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*(1-i/data.length);}void this.context.resume().catch(()=>{});}catch{/* The table remains playable without audio. */}}
 toggle(){this.muted=!this.muted;if(this.master)this.master.gain.value=this.muted?0:10**(-20/20);}
 play(knock=false){const c=this.context,m=this.master;if(!c||!m||c.state!=='running'||this.muted)return;try{const gain=c.createGain();gain.gain.setValueAtTime(knock?.8:.3,c.currentTime);gain.gain.exponentialRampToValueAtTime(.001,c.currentTime+.13);gain.connect(m);
  if(knock){const o=c.createOscillator();o.type='sine';o.frequency.setValueAtTime(170,c.currentTime);o.frequency.exponentialRampToValueAtTime(60,c.currentTime+.11);o.connect(gain);o.start();o.stop(c.currentTime+.14);o.onended=()=>{try{o.disconnect();gain.disconnect();}catch{/* Released. */}};}
  else if(this.paper){const source=c.createBufferSource(),filter=c.createBiquadFilter();source.buffer=this.paper;source.playbackRate.value=.9+Math.random()*.2;filter.type='highpass';filter.frequency.value=850;source.connect(filter);filter.connect(gain);source.start();source.onended=()=>{try{source.disconnect();filter.disconnect();gain.disconnect();}catch{/* Released. */}};}
 }catch{/* Sound cannot interrupt a turn. */}}
 dispose(){if(this.context)void this.context.close().catch(()=>{});this.context=undefined;this.master=undefined;this.paper=undefined;}
}
