export function streamUrl(value:string):string {
 const url=new URL(value.trim());
 if(url.protocol!=='https:' || url.username || url.password || /(^|\.)(youtube\.com|youtu\.be|spotify\.com)$/.test(url.hostname))throw new Error('Bitte eine direkte HTTPS-Audio-URL verwenden.');
 return url.href;
}
/** Playback belongs to the current saloon visit, not the lifetime of its controls. */
export class MusicStream {
 status='Gestoppt';private generation=0;private events=new AbortController();
 constructor(readonly audio:HTMLAudioElement,private changed:()=>void=()=>{}){audio.volume=.35;audio.preload='none';
  for(const type of ['playing','waiting','ended','error'])audio.addEventListener?.(type,event=>{try{
   if(!event || !audio.hasAttribute('src'))return;
   if(type==='error'){this.stop();this.status='Audioquelle ist nicht erreichbar oder wird nicht unterstützt.';}
   else this.status=type==='playing'?'Musik läuft':type==='waiting'?'Stream puffert …':'Stream beendet';
   this.changed();
  }catch(error){console.error('Music event failed.',error);}},{signal:this.events.signal});
 }

 async start(url:string):Promise<void>{
  const current=++this.generation;
  try{this.audio.pause();this.audio.src=streamUrl(url);this.status='Verbinden …';this.changed();await this.audio.play();
   if(current!==this.generation)return;this.status='Musik läuft';
  }catch{if(current!==this.generation)return;this.audio.pause();this.status='Stream konnte nicht gestartet werden. URL, Format oder Browserfreigabe prüfen.';}
  this.changed();
 }
 dispose():void{this.events.abort();this.stop();}
 stop():void{++this.generation;this.audio.pause();this.audio.removeAttribute('src');this.audio.load();this.status='Gestoppt';this.changed();}
}
