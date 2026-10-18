import { describe, expect, it, vi } from 'vitest';
import { AppSessionController } from './AppSessionController';

function deferred() {
  let resolve!: () => void, reject!: (error: unknown) => void;
  const ready = new Promise<void>((yes,no)=>{resolve=yes;reject=no;});
  return {ready,resolve,reject,dispose:vi.fn(),setPixelRatioCap:vi.fn()};
}
describe('app session lifecycle',()=> {
  it('allows one paused recovery, contains failure, and ignores late results after leave',async()=>{
    let finish!:(value:{status:'recovered';message:string})=>void;
    const resetToRoad=vi.fn(()=>new Promise<{status:'recovered';message:string}>(resolve=>{finish=resolve;}));
    const session={...deferred(),resetToRoad};const controller=new AppSessionController(()=>session);
    expect(controller.resetToRoad).toBeTypeOf('function');
    expect((await controller.resetToRoad()).status).toBe('unavailable');
    const start=controller.start();session.resolve();await start;
    expect((await controller.resetToRoad()).status).toBe('unavailable');expect(resetToRoad).not.toHaveBeenCalled();
    controller.pause();const first=controller.resetToRoad();void controller.resetToRoad();
    expect(resetToRoad).toHaveBeenCalledTimes(1);expect(controller.recovering).toBe(true);
    controller.resume();expect(controller.state).toBe('paused');controller.leave();
    finish({status:'recovered',message:'done'});expect((await first).status).toBe('cancelled');
    expect(controller.state).toBe('menu');expect(controller.recoveryResult).toBeUndefined();
  });
  it('shows a recovery failure without destroying the paused session and can retry',async()=>{
    const session={...deferred(),resetToRoad:vi.fn().mockRejectedValueOnce(Error('failed')).mockResolvedValueOnce({status:'recovered',message:'safe'})};
    const controller=new AppSessionController(()=>session);expect(controller.resetToRoad).toBeTypeOf('function');
    const start=controller.start();session.resolve();await start;controller.pause();
    expect((await controller.resetToRoad()).status).toBe('error');expect(controller.recovering).toBe(false);expect(controller.hasSession).toBe(true);
    expect((await controller.resetToRoad()).status).toBe('recovered');expect(controller.state).toBe('paused');
  });
  it('dismisses the world modal before pausing or releasing the session',async()=> {
    const session={...deferred(),closeInteractionMenu:vi.fn(()=>true)};
    const controller=new AppSessionController(()=>session);
    const start=controller.start();session.resolve();await start;
    expect(controller.closeInteractionMenu()).toBe(true);
    expect(controller.state).toBe('playing');
    controller.pause();expect(session.closeInteractionMenu).toHaveBeenCalledTimes(2);
    controller.leave();expect(controller.closeInteractionMenu()).toBe(false);
  });
  it('starts one session, waits for real readiness and gates paused input',async()=> {
    const session=deferred(), create=vi.fn(()=>session), controller=new AppSessionController(create);
    const start=controller.start(); void controller.start();
    expect(create).toHaveBeenCalledTimes(1); expect(controller.state).toBe('loading');expect(controller.inputCaptured).toBe(true);
    session.resolve();await start;
    expect(controller.state).toBe('playing');expect(controller.inputCaptured).toBe(false);
    controller.pause();expect(controller.inputCaptured).toBe(true);
    controller.resume();expect(controller.state).toBe('playing');
    controller.leave();controller.leave();expect(session.dispose).toHaveBeenCalledTimes(1);
  });
  it('ignores an old ready result after cancel and a newer start',async()=> {
    const old=deferred(),current=deferred();let count=0;
    const controller=new AppSessionController(()=>count++?current:old);
    const first=controller.start();controller.leave();const second=controller.start();
    old.resolve();await first;
    expect(controller.state).toBe('loading');expect(old.dispose).toHaveBeenCalledTimes(1);
    current.resolve();await second;expect(controller.state).toBe('playing');
  });
  it('reports load failures, disposes and supports retry',async()=> {
    const bad=deferred(),good=deferred();let count=0;
    const controller=new AppSessionController(()=>count++?good:bad);
    const first=controller.start();bad.reject(new Error('Missing source'));await first;
    expect(controller.state).toBe('error');expect(controller.error).toContain('Missing source');expect(bad.dispose).toHaveBeenCalledTimes(1);
    const retry=controller.start();good.resolve();await retry;expect(controller.state).toBe('playing');
  });
  it('keeps a canceled rejection from replacing a newer session',async()=> {
    const old=deferred(),current=deferred();let count=0;
    const controller=new AppSessionController(()=>count++?current:old);
    const first=controller.start();controller.leave();const second=controller.start();
    current.resolve();await second;old.reject(new Error('late'));await first;
    expect(controller.state).toBe('playing');expect(controller.error).toBeUndefined();
  });
});
