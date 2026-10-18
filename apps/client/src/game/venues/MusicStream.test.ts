import {it,expect,vi} from 'vitest';
import {MusicStream,streamUrl} from './MusicStream';
it('accepts credential-free HTTPS audio sources and rejects provider pages and active schemes',()=>{
 expect(streamUrl('https://radio.example.org/live')).toBe('https://radio.example.org/live');
 for(const url of ['http://radio.test/a','javascript:alert(1)','https://user:pass@radio.test/a','https://www.youtube.com/watch?v=abc','https://open.spotify.com/track/a'])expect(()=>streamUrl(url)).toThrow();
});
it('cancels pending playback on room leave and reports rejected play without unhandled rejection',async()=>{
 let release!:()=>void;const audio={pause:vi.fn(),removeAttribute:vi.fn(),load:vi.fn(),play:()=>new Promise<void>(r=>release=r),src:'',volume:1,muted:false};
 const music=new MusicStream(audio as unknown as HTMLAudioElement);const pending=music.start('https://radio.example.org/live');music.stop();release();await pending;expect(music.status).toBe('Gestoppt');expect(audio.pause).toHaveBeenCalled();
 audio.play=()=>Promise.reject(new Error('blocked'));await music.start('https://radio.example.org/live');expect(music.status).toContain('nicht');
});

it('reports media errors even after the controls are closed and releases listeners',()=>{
 const audio=Object.assign(new EventTarget(),{pause:vi.fn(),removeAttribute:vi.fn(),load:vi.fn(),hasAttribute:()=>true,src:'https://radio.example.org/live',volume:1});
 const music=new MusicStream(audio as unknown as HTMLAudioElement);audio.dispatchEvent(new Event('playing'));expect(music.status).toBe('Musik läuft');
 audio.dispatchEvent(new Event('error'));expect(music.status).toContain('nicht');music.dispose();audio.dispatchEvent(new Event('playing'));expect(music.status).toBe('Gestoppt');
});
