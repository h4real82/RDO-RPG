import {MusicStream} from './MusicStream';
import {observeYouTube,youtubeError} from './YouTubeBridge';
import {MUSIC_EXAMPLES,resolveMusicSource,type MusicSource} from './MusicSource';
import {text} from './VenueDialog';
import './MusicPlayer.css';

/** Keep the SAME provider iframe visible when controls collapse: reparenting reloads playback. */
export class MusicPlayer {
 readonly panel=document.createElement('section');
 private audio=document.createElement('audio');private stream:MusicStream;
 private events=new AbortController();private frameEvents?:AbortController;private releaseYouTube?:()=>void;private providerError=false;private frame?:HTMLIFrameElement;private timer?:ReturnType<typeof setTimeout>;
 private source?:MusicSource;private expanded=false;private disposed=false;private generation=0;
 private previousFocus:HTMLElement|null=null;private observer?:ResizeObserver;
 private input:HTMLInputElement;private player:HTMLElement;private status:HTMLElement;private note:HTMLElement;
 private external:HTMLAnchorElement;private directControls:HTMLElement;private single:HTMLButtonElement;private fold:HTMLButtonElement;
 constructor(private parent:HTMLElement,private onExpand:()=>void=()=>{}){
  this.audio.hidden=true;this.audio.dataset.saloonMusic='true';parent.append(this.audio);
  this.stream=new MusicStream(this.audio,()=>{if(this.source?.provider==='direct')this.status.textContent=this.stream.status;});
  this.panel.className='rdo-music';this.panel.hidden=true;this.panel.tabIndex=-1;
  const paper=document.createElement('div');paper.className='rdo-music__paper';this.panel.append(paper);
  const header=document.createElement('header');paper.append(header);text('strong','Musik am Klavier',header);
  this.fold=this.button('Zurück zum Raum',()=>this.expanded?this.collapse():this.open(),header);
  const setup=document.createElement('div');setup.className='rdo-music__setup';paper.append(setup);
  text('p','YouTube, Mixcloud, SoundCloud, Suno oder direkter Audio-Stream. Die Wiedergabe ist lokal und endet beim Verlassen des Saloons.',setup);
  const label=text('label','Musik-Link',setup);this.input=document.createElement('input');this.input.type='url';this.input.placeholder='https://www.youtube.com/watch?v=…';label.append(this.input);
  this.button('Player öffnen',()=>this.load(),setup);
  this.single=this.button('Einzelvideo testen',()=>{if(!this.source)return;const url=new URL(this.source.canonicalUrl);url.searchParams.delete('list');this.input.value=url.href;this.load();},setup);this.single.hidden=true;
  const examples=document.createElement('div');examples.className='rdo-music__examples';setup.append(examples);
  text('small','Deine Musiklinks',examples);for(const item of MUSIC_EXAMPLES)this.button(item.label,()=>{this.input.value=item.url;this.load();},examples);
  this.player=document.createElement('div');this.player.className='rdo-music__frame';paper.append(this.player);
  this.note=text('p','',paper);this.note.className='rdo-music__note';
  this.status=text('p','Wähle einen Musiklink und öffne den Player.',paper);this.status.setAttribute('role','status');this.status.setAttribute('aria-live','polite');
  this.directControls=document.createElement('div');this.directControls.className='rdo-music__setup';paper.append(this.directControls);this.directControls.hidden=true;
  const volumeLabel=text('label','Lautstärke',this.directControls),volume=document.createElement('input');volume.type='range';volume.min='0';volume.max='1';volume.step='.05';volume.value=String(this.audio.volume);volumeLabel.append(volume);
  this.listen(volume,'input',()=>{this.audio.volume=Number(volume.value);});this.button('Ton an / aus',()=>{this.audio.muted=!this.audio.muted;this.status.textContent=this.audio.muted?'Ton aus':this.stream.status;},this.directControls);
  const footer=document.createElement('footer');paper.append(footer);this.button('Musik stoppen',()=>this.stop(),footer);
  this.external=text('a','Beim Anbieter öffnen ↗',footer);this.external.target='_blank';this.external.rel='noopener noreferrer';this.external.hidden=true;
  parent.append(this.panel);
  this.listen(window,'keydown',event=>{const key=event as KeyboardEvent;if(!this.expanded)return;
   if(key.key==='Escape'){key.preventDefault();key.stopImmediatePropagation();this.collapse();return;}
   if(key.key==='Tab'){const all=Array.from(this.panel.querySelectorAll<HTMLElement>('button,input,a[href],iframe')).filter(el=>!el.hidden&&el.getClientRects().length>0);
    if(key.shiftKey&&document.activeElement===all[0]){key.preventDefault();all.at(-1)?.focus();}else if(!key.shiftKey&&document.activeElement===all.at(-1)){key.preventDefault();all[0]?.focus();}}
  },true);
  this.listen(document,'visibilitychange',()=>{if(document.hidden&&this.frame)this.stop('Player gestoppt. Öffne ihn erneut, wenn du weiterhören möchtest.');});
  this.listen(window,'resize',()=>this.layout());
  if(typeof ResizeObserver!=='undefined'){this.observer=new ResizeObserver(()=>{try{if(!this.disposed)this.layout();}catch(error){console.error('Music layout failed.',error);}});this.observer.observe(this.panel);}
 }
 private listen(target:EventTarget,name:string,run:(event:Event)=>void,capture=false,signal=this.events.signal){target.addEventListener(name,event=>{try{if(!event||this.disposed||!this.panel.isConnected)return;run(event);}catch(error){this.status.textContent='Die Musiksteuerung konnte nicht ausgeführt werden.';console.error('Music control failed.',error);}},{capture,signal});}
 private button(label:string,run:()=>void,parent:HTMLElement){const button=text('button',label,parent);button.type='button';this.listen(button,'click',event=>{if(!button.isConnected||button.disabled)return;event.preventDefault();run();});return button;}
 get isOpen(){return this.expanded&&!this.disposed;}
 open(){if(this.disposed||!this.parent.isConnected)return;this.onExpand();if(!this.expanded)this.previousFocus=document.activeElement instanceof HTMLElement?document.activeElement:null;
  this.expanded=true;this.panel.hidden=false;this.panel.classList.remove('rdo-music--docked');this.panel.setAttribute('role','dialog');this.panel.setAttribute('aria-modal','true');this.panel.setAttribute('aria-label','Musik am Klavier');this.fold.textContent='Zurück zum Raum';this.layout();this.panel.focus();}
 collapse(){if(this.disposed)return;this.expanded=false;this.panel.classList.add('rdo-music--docked');this.panel.setAttribute('role','region');this.panel.removeAttribute('aria-modal');this.panel.setAttribute('aria-label','Musikplayer');this.fold.textContent='Steuerung öffnen';this.panel.hidden=!this.frame&&!this.audio.hasAttribute('src');this.layout();if(this.previousFocus?.isConnected)this.previousFocus.focus();}
 private load(){
  let source:MusicSource;try{source=resolveMusicSource(this.input.value,location.origin);}catch(error){this.status.textContent=(error as Error).message;return;}
  this.stop();this.source=source;const generation=++this.generation;this.panel.dataset.provider=source.provider;
  this.external.href=source.externalUrl??source.canonicalUrl;this.external.hidden=false;this.directControls.hidden=source.provider!=='direct';this.single.hidden=source.provider!=='youtube'||!new URL(source.canonicalUrl).searchParams.has('list');
  this.note.textContent=source.note??'Starte die Wiedergabe direkt im Anbieterplayer. Lautstärke und Pause findest du dort.';
  if(source.provider==='direct'){this.note.textContent='Direkter Audio-Stream. Lautstärke und Stummschaltung gelten für deinen Browser.';void this.stream.start(source.canonicalUrl);return;}
  const frameEvents=this.frameEvents=new AbortController();this.providerError=false;
  const frame=this.frame=document.createElement('iframe');frame.title=source.label+' Musikplayer';frame.src=source.embedUrl!;frame.allow='autoplay; encrypted-media; fullscreen; picture-in-picture';frame.referrerPolicy='strict-origin-when-cross-origin';frame.allowFullscreen=true;frame.height=String(source.height);frame.style.height=source.height+'px';
  this.status.textContent=source.label+'-Player wird geladen …';
  this.listen(frame,'load',()=>{if(generation!==this.generation||this.frame!==frame||this.providerError)return;clearTimeout(this.timer);this.status.textContent=source.provider==='suno'?'Suno-Player geladen. Im Test war die Audioquelle zeitweise gesperrt; bei 0:00 bitte den Original-Link beim Anbieter öffnen.':'Player geladen. Drücke im Player auf Play. Bei einer Sperre kannst du den Link beim Anbieter öffnen.';this.layout();},false,frameEvents.signal);
  this.listen(frame,'error',()=>{if(generation===this.generation)this.status.textContent='Player nicht erreichbar. Bitte beim Anbieter öffnen oder einen anderen Link wählen.';},false,frameEvents.signal);
  this.player.append(frame);if(source.provider==='youtube')this.releaseYouTube=observeYouTube(frame,code=>{if(generation!==this.generation)return;this.providerError=true;clearTimeout(this.timer);this.status.textContent=youtubeError(code);},()=>{if(generation===this.generation)this.status.textContent='Die YouTube-Steuerung ist nicht erreichbar. Bitte direkt im Player oder beim Anbieter starten.';});
  this.timer=setTimeout(()=>{if(!this.disposed&&generation===this.generation&&!this.providerError)this.status.textContent='Der Anbieter antwortet noch nicht. Du kannst den Link auch beim Anbieter öffnen.';},15000);this.layout();
 }
 stop(message='Gestoppt'){++this.generation;clearTimeout(this.timer);this.frameEvents?.abort();this.frameEvents=undefined;this.releaseYouTube?.();this.releaseYouTube=undefined;this.frame?.remove();this.frame=undefined;this.stream.stop();this.status.textContent=message;if(!this.expanded)this.panel.hidden=true;this.layout();}
 /** System menus cover the world: never leave a hidden provider video playing underneath. */
 setSystemPaused(paused:boolean){if(paused&&this.frame){this.stop('Player wegen Menüwechsel gestoppt. Zum Weiterhören erneut öffnen.');this.collapse();}}
 private layout(){const docked=!this.expanded&&!this.panel.hidden;this.parent.classList.toggle('rdo-has-music-dock',docked);
  if(docked)this.parent.style.setProperty('--rdo-music-dock-space',Math.ceil(this.panel.getBoundingClientRect().height+28)+'px');else this.parent.style.removeProperty('--rdo-music-dock-space');}
 dispose(){if(this.disposed)return;this.events.abort();this.observer?.disconnect();this.stop();this.disposed=true;this.stream.dispose();this.panel.remove();this.audio.remove();this.parent.classList.remove('rdo-has-music-dock');this.parent.style.removeProperty('--rdo-music-dock-space');}
}
