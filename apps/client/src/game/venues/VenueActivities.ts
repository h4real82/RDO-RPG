import {MusicStream} from './MusicStream';
import {VenueDialog,text} from './VenueDialog';
import {BankDesk} from './BankDesk';
export class VenueActivities {
 private dialog?:VenueDialog;private bank:BankDesk;private audio=document.createElement('audio');
 private music=new MusicStream(this.audio,()=>{if(this.dialog?.panel.dataset.venue==='music')this.dialog.status.textContent=this.music.status;});
 private url='';private saloon=false;
 constructor(private parent:HTMLElement,changed:()=>void=()=>{}){this.bank=new BankDesk(changed);this.audio.hidden=true;this.audio.dataset.saloonMusic='true';parent.append(this.audio);}
 get isOpen(){return Boolean(this.dialog?.isOpen);}
 supports(kind?:string){return kind==='music'||kind==='drinks'||kind==='bank';}
 open(kind?:string){
  this.close();
  if(kind==='bank'){this.dialog=this.bank.open(this.parent);return;}
  const d=this.dialog=new VenueDialog(this.parent,kind==='music'?'Musik am Klavier':kind==='drinks'?'Barkeeper':'Interaktion');d.panel.dataset.venue=kind??'unknown';
  if(kind==='music'){
   text('p','Dein lokaler Musikstream. Die Musik endet beim Verlassen des Saloons. Kein gemeinsamer Session-Player.',d.content);
   const input=d.input('Direkte HTTPS-Audio-URL','url',this.url);input.placeholder='https://…/stream.mp3';
   d.button('Stream starten',()=>{this.url=input.value;return this.music.start(input.value);});d.button('Musik stoppen',()=>this.music.stop());
   const volume=d.input('Lautstärke','range',String(this.audio.volume));volume.min='0';volume.max='1';volume.step='.05';d.listen(volume,'input',()=>{this.audio.volume=Number(volume.value);});
   d.button('Ton an / aus',()=>{this.audio.muted=!this.audio.muted;d.status.textContent=this.audio.muted?'Ton aus':this.music.status;});
   d.status.textContent=this.music.status;
  }else if(kind==='drinks'){
   text('p','Was darf es sein? Die Bestellung ist in dieser lokalen Vorschau kostenlos und kosmetisch.',d.content);
   for(const drink of ['Bier','Whiskey','Kaffee','Wasser'])d.button(drink+' bestellen',()=>{d.status.textContent=`Der Barkeeper serviert dir ${drink}. Zum Wohl!`;});
  }else text('p','Diese Interaktion ist derzeit nicht verfügbar.',d.content);
 }
 setBuilding(id?:string){const inside=id==='smithfields-saloon';if(this.saloon&&!inside){this.music.stop();this.close();}this.saloon=inside;}
 close(){this.dialog?.close();this.dialog=undefined;}
 dispose(){this.close();this.music.dispose();this.audio.remove();this.bank.dispose();}
}
