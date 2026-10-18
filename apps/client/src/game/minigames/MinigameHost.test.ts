import {expect,it,vi} from 'vitest';
import {MinigameHost} from './MinigameHost';
const parent={isConnected:true} as HTMLElement;
const venue={buildingId:'saloon',floorId:'ground',actionId:'darts'};
it('owns loading, cancellation, disposal and reopening without resurrecting cancelled games',async()=>{
  let resolve!:(value:any)=>void;
  const game={isOpen:false,open:vi.fn(function(){game.isOpen=true;}),dispose:vi.fn()};
  const create=vi.fn(()=>game), errors:string[]=[];
  const registry={resolve:()=>({variant:{},load:()=>new Promise<any>(r=>resolve=r)})};
  const host=new MinigameHost(parent,registry,error=>errors.push(error));
  const pending=host.open('darts','v',venue);expect(host.isOpen).toBe(true);expect(host.state).toBe('loading');
  host.close();resolve({create});await pending;expect(create).not.toHaveBeenCalled();expect(host.state).toBe('idle');
  const reopened=host.open('darts','v',venue);resolve({create});await reopened;expect(game.open).toHaveBeenCalledOnce();expect(host.state).toBe('active');
  host.close();expect(game.dispose).toHaveBeenCalledOnce();expect(host.isOpen).toBe(false);expect(errors).toEqual([]);
  const late=host.open('darts','v',venue);host.dispose();resolve({create});await late;expect(create).toHaveBeenCalledOnce();
});
it('reports unavailable games and lazy module failures through a safe host error callback',async()=>{
  const errors:string[]=[];
  const host=new MinigameHost(parent,{resolve:()=>{throw new Error('Nicht verfügbar');}},e=>errors.push(e));
  await host.open('poker','v',venue);expect(host.state).toBe('error');expect(host.isOpen).toBe(false);expect(errors).toEqual(['Nicht verfügbar']);
  const failed=new MinigameHost(parent,{resolve:()=>({variant:{},load:async()=>{throw new Error('Offline');}})},e=>errors.push(e));
  await failed.open('darts','v',venue);expect(failed.state).toBe('error');expect(errors).toContain('Offline');
});
