import {it,expect} from 'vitest';
import {resolveMusicSource,MUSIC_EXAMPLES} from './MusicSource';
it('recognizes all four supplied links, preserves the Youtube mix and resolves the verified Suno share',()=>{
 const sources=MUSIC_EXAMPLES.map(item=>resolveMusicSource(item.url,'http://127.0.0.1:4180'));
 expect(sources.map(s=>s.provider)).toEqual(['youtube','mixcloud','soundcloud','suno']);
 const youtube=new URL(sources[0].embedUrl!);expect(youtube.pathname).toBe('/embed/4hVdpAk-K3E');expect(youtube.searchParams.get('list')).toBe('RD4hVdpAk-K3E');expect(youtube.searchParams.get('origin')).toBe('http://127.0.0.1:4180');
 expect(sources[1].canonicalUrl).toBe('https://www.mixcloud.com/h4real/hear-the-beauty/');
 expect(sources[2].canonicalUrl).not.toContain('utm_');expect(sources[2].embedUrl).toContain('w.soundcloud.com/player/');
 expect(sources[3].embedUrl).toBe('https://suno.com/embed/d3dea5eb-2c97-4676-9d90-766edb369aae');expect(sources[3].externalUrl).toBe(MUSIC_EXAMPLES[3].url);
});
it('supports short/mobile Youtube URLs, direct audio and canonical Suno song links',()=>{
 expect(resolveMusicSource('https://youtu.be/4hVdpAk-K3E').provider).toBe('youtube');
 expect(resolveMusicSource('https://m.youtube.com/watch?v=4hVdpAk-K3E').provider).toBe('youtube');
 expect(resolveMusicSource('https://radio.example.org/live').provider).toBe('direct');
 expect(resolveMusicSource('https://suno.com/song/d3dea5eb-2c97-4676-9d90-766edb369aae').provider).toBe('suno');
});
it('rejects active schemes, provider credentials, malformed embeds and unresolved Suno share tokens',()=>{
 for(const url of ['javascript:alert(1)','http://youtube.com/watch?v=4hVdpAk-K3E','https://user:pass@youtube.com/watch?v=4hVdpAk-K3E','https://www.youtube.com/watch?v=bad','https://www.mixcloud.com/h4real/','https://suno.com/s/unknown','https://open.spotify.com/track/example','https://soundcloud.com/'])expect(()=>resolveMusicSource(url)).toThrow();
});
