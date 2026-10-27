export type MusicProvider='youtube'|'mixcloud'|'soundcloud'|'suno'|'direct';
export interface MusicSource {provider:MusicProvider;label:string;canonicalUrl:string;externalUrl?:string;embedUrl?:string;height?:number;note?:string}
/** Share redirect verified in a real browser on 2026-10-19; never guessed from its token. */
const sunoShares:Readonly<Record<string,string>>={'0iq6xnxi2vxV6GYq':'d3dea5eb-2c97-4676-9d90-766edb369aae'};
export const MUSIC_EXAMPLES=[
 {label:'YouTube · Aio Live Set',url:'https://www.youtube.com/watch?v=4hVdpAk-K3E&list=RD4hVdpAk-K3E&start_radio=1'},
 {label:'Mixcloud · Hear the Beauty',url:'https://www.mixcloud.com/h4real/hear-the-beauty/'},
 {label:'SoundCloud · Mystic Creatures',url:'https://soundcloud.com/aio-music/mystic-creatures-festival-2026-mystic-ground-dj-set'},
 {label:'Suno · Free Drich Scherz',url:'https://suno.com/s/0iq6xnxi2vxV6GYq'},
] as const;
export function resolveMusicSource(value:string,origin?:string):MusicSource {
 const url=new URL(value.trim());
 if(url.protocol!=='https:'||url.username||url.password||url.port)throw new Error('Bitte einen HTTPS-Musiklink ohne Zugangsdaten verwenden.');
 const host=url.hostname.toLowerCase(),parts=url.pathname.split('/').filter(Boolean);
 if(['youtube.com','www.youtube.com','m.youtube.com','youtu.be','www.youtube-nocookie.com'].includes(host)){
  const id=host==='youtu.be'?parts[0]:['embed','shorts','live'].includes(parts[0])?parts[1]:url.searchParams.get('v');
  if(!id||!/^[-_a-zA-Z0-9]{11}$/.test(id))throw new Error('Dieser YouTube-Link enthält keine gültige Video-ID.');
  const canonical=new URL('https://www.youtube.com/watch');canonical.searchParams.set('v',id);
  const embed=new URL('https://www.youtube.com/embed/'+id);embed.searchParams.set('enablejsapi','1');embed.searchParams.set('playsinline','1');embed.searchParams.set('autoplay','0');
  if(origin){const o=new URL(origin);if(['http:','https:'].includes(o.protocol))embed.searchParams.set('origin',o.origin);}
  const list=url.searchParams.get('list');if(list&&/^[-_a-zA-Z0-9]{1,100}$/.test(list)){canonical.searchParams.set('list',list);embed.searchParams.set('list',list);}
  return {provider:'youtube',label:'YouTube',canonicalUrl:canonical.href,embedUrl:embed.href,height:220,
   note:list?.startsWith('RD')?'YouTube-Mix aus deinem Link. Falls die Einbettung nicht verfügbar ist: Einzelvideo testen oder auf YouTube öffnen.':'YouTube spielt im sichtbaren Videoplayer. Bei einer Einbettsperre bitte auf YouTube öffnen.'};
 }
 if(['mixcloud.com','www.mixcloud.com'].includes(host)){
  if(parts.length!==2||parts.some(p=>!/^[-_a-zA-Z0-9]+$/.test(p)))throw new Error('Bitte einen Mixcloud-Link zu einer konkreten Show verwenden.');
  const feed='/'+parts.join('/')+'/',embed=new URL('https://www.mixcloud.com/widget/iframe/');embed.searchParams.set('feed',feed);embed.searchParams.set('hide_cover','1');embed.searchParams.set('light','0');
  return {provider:'mixcloud',label:'Mixcloud',canonicalUrl:'https://www.mixcloud.com'+feed,embedUrl:embed.href,height:180};
 }
 if(['soundcloud.com','www.soundcloud.com','m.soundcloud.com'].includes(host)){
  if(parts.length<2||parts.length>3)throw new Error('Bitte einen SoundCloud-Link zu einem Track oder Set verwenden.');
  const canonical=new URL('https://soundcloud.com/'+parts.join('/'));const token=url.searchParams.get('secret_token');if(token)canonical.searchParams.set('secret_token',token);
  const embed=new URL('https://w.soundcloud.com/player/');embed.searchParams.set('url',canonical.href);embed.searchParams.set('auto_play','false');embed.searchParams.set('show_artwork','true');
  return {provider:'soundcloud',label:'SoundCloud',canonicalUrl:canonical.href,embedUrl:embed.href,height:180};
 }
 if(['suno.com','www.suno.com'].includes(host)){
  const id=parts[0]==='s'&&Object.prototype.hasOwnProperty.call(sunoShares,parts[1])?sunoShares[parts[1]]:['song','embed'].includes(parts[0])?parts[1]:undefined;
  if(!id||!/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(id))throw new Error('Diesen Suno-Kurzlink kenne ich noch nicht. Bitte den vollständigen /song/-Link aus der Browseradresse einsetzen.');
  return {provider:'suno',label:'Suno',canonicalUrl:'https://suno.com/song/'+id,externalUrl:url.href,embedUrl:'https://suno.com/embed/'+id,height:200,
   note:'Suno hat die Audioquelle im Test zeitweise gesperrt. Wenn 0:00 stehen bleibt, bitte den Original-Link bei Suno öffnen.'};
 }
 if(/(^|\.)spotify\.com$/.test(host))throw new Error('Spotify ist hier nicht als Spiele-Player verfügbar. Bitte einen anderen Anbieter wählen.');
 return {provider:'direct',label:'Audio-Stream',canonicalUrl:url.href};
}
