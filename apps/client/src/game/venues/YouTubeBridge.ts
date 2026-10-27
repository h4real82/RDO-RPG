type Player={destroy():void};
type Api={Player:new(frame:HTMLIFrameElement,options:{events:{onError(event:{data:number}):void}})=>Player};
type YouTubeWindow=Window&{YT?:Api;onYouTubeIframeAPIReady?:()=>void};
let pending:Promise<Api>|undefined;
function loadApi():Promise<Api>{
 const host=window as YouTubeWindow;if(host.YT?.Player)return Promise.resolve(host.YT);if(pending)return pending;
 pending=new Promise<Api>((resolve,reject)=>{
  const previous=host.onYouTubeIframeAPIReady;let finished=false;
  const finish=(error?:Error)=>{if(finished)return;finished=true;clearTimeout(timer);script.removeEventListener('error',failed);
   if(host.onYouTubeIframeAPIReady===ready)host.onYouTubeIframeAPIReady=previous;
   if(error){pending=undefined;script.remove();reject(error);}else if(host.YT?.Player)resolve(host.YT);else{pending=undefined;reject(new Error('YouTube API fehlt'));}};
  const ready=()=>{try{previous?.();}catch(error){console.error('Previous YouTube callback failed.',error);}finally{finish();}};
  const failed=(event:Event)=>{try{if(event)finish(new Error('YouTube API nicht erreichbar'));}catch(error){console.error('YouTube loader failed.',error);}};
  const script=document.createElement('script');script.src='https://www.youtube.com/iframe_api';script.async=true;
  const timer=setTimeout(()=>finish(new Error('YouTube API Zeitüberschreitung')),10000);
  host.onYouTubeIframeAPIReady=ready;script.addEventListener('error',failed);document.head.append(script);
 });return pending;
}
/** Official iframe events only; never inspect/extract provider media URLs. */
export function observeYouTube(frame:HTMLIFrameElement,onError:(code:number)=>void,onUnavailable:()=>void):()=>void {
 let disposed=false,player:Player|undefined;
 void loadApi().then(api=>{if(disposed||!frame.isConnected)return;player=new api.Player(frame,{events:{onError(event){try{
  if(!event||disposed||!frame.isConnected||!Number.isFinite(event.data))return;onError(event.data);
 }catch(error){console.error('YouTube player event failed.',error);}}}});}).catch(()=>{if(!disposed&&frame.isConnected)onUnavailable();});
 return ()=>{disposed=true;try{player?.destroy();}catch(error){console.error('Could not release YouTube player.',error);}};
}
export function youtubeError(code:number):string {
 if(code===101||code===150)return `YouTube sperrt die Einbettung dieses Videos (Fehler ${code}). Bitte ein anderes Video wählen oder „Beim Anbieter öffnen“ nutzen.`;
 if(code===153)return 'YouTube kann die Website nicht zuordnen (Fehler 153). Bitte beim Anbieter öffnen.';
 if(code===100)return 'Dieses YouTube-Video ist nicht verfügbar (Fehler 100).';
 return `YouTube kann dieses Video nicht abspielen (Fehler ${code}). Bitte beim Anbieter öffnen oder ein anderes Video wählen.`;
}
