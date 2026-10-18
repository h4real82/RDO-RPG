import { describe, expect, it, vi } from 'vitest';

import { bootstrapGame } from './bootstrap';
import { startValentineRuntime } from './ValentineRuntime';
import type { WebGLRenderer } from 'three';

vi.mock('./ValentineRuntime',()=>({startValentineRuntime:vi.fn()}));

describe('bootstrapGame', () => {
  it('exposes validated recovery only after readiness and drops its adapter on dispose',async()=>{
    vi.mocked(startValentineRuntime).mockResolvedValueOnce(vi.fn());
    const renderer={element:{} as HTMLElement,nativeRenderer:{} as WebGLRenderer,dispose:vi.fn()};
    const root={appendChild:vi.fn(),removeChild:vi.fn()} as unknown as HTMLElement;
    const session=bootstrapGame(root,{createRenderer:()=>renderer});
    expect(session.resetToRoad).toBeTypeOf('function');
    const resetToRoad=vi.fn().mockResolvedValue({status:'recovered',message:'checked'});
    vi.mocked(startValentineRuntime).mock.calls.at(-1)?.[2]?.onRoadRecovery?.({resetToRoad});
    expect((await session.resetToRoad()).status).toBe('unavailable');await session.ready;
    expect((await session.resetToRoad()).status).toBe('recovered');expect(resetToRoad).toHaveBeenCalledTimes(1);
    session.dispose();expect((await session.resetToRoad()).status).toBe('unavailable');
  });
  it('coordinates the runtime modal without retaining it after disposal',async()=> {
    vi.mocked(startValentineRuntime).mockResolvedValueOnce(vi.fn());
    const renderer={element:{} as HTMLElement,nativeRenderer:{} as WebGLRenderer,dispose:vi.fn()};
    const root={appendChild:vi.fn(),removeChild:vi.fn()} as unknown as HTMLElement;
    const session=bootstrapGame(root,{createRenderer:()=>renderer});
    const menu={isOpen:true,close:vi.fn()};
    vi.mocked(startValentineRuntime).mock.calls.at(-1)?.[2]?.onInteractionMenu?.(menu);
    await session.ready;
    expect(session.closeInteractionMenu()).toBe(true);expect(menu.close).toHaveBeenCalledTimes(1);
    menu.isOpen=false;expect(session.closeInteractionMenu()).toBe(false);
    session.dispose();expect(session.closeInteractionMenu()).toBe(false);
  });
  it('exposes readiness and aborts late runtime startup without reviving it', async () => {
    let finish!: (stop: ()=>void)=>void;
    vi.mocked(startValentineRuntime).mockReturnValueOnce(new Promise(resolve=>{finish=resolve;}));
    const stop=vi.fn(), element={} as HTMLElement;
    const renderer={element,nativeRenderer:{} as WebGLRenderer,dispose:vi.fn()};
    const root={appendChild:vi.fn(),removeChild:vi.fn()} as unknown as HTMLElement;
    const session=bootstrapGame(root,{createRenderer:()=>renderer});
    expect(session.ready).toBeInstanceOf(Promise);
    const signal=vi.mocked(startValentineRuntime).mock.calls.at(-1)?.[2]?.signal;
    session.dispose();expect(signal?.aborted).toBe(true);
    finish(stop);
    await expect(session.ready).rejects.toMatchObject({name:'AbortError'});
    expect(stop).toHaveBeenCalledTimes(1);expect(renderer.dispose).toHaveBeenCalledTimes(1);
  });
  it('reports startup failure and releases renderer while retaining a handled readiness promise', async () => {
    vi.mocked(startValentineRuntime).mockRejectedValueOnce(new Error('source unavailable'));
    const renderer={element:{} as HTMLElement,nativeRenderer:{} as WebGLRenderer,dispose:vi.fn()};
    const root={appendChild:vi.fn(),removeChild:vi.fn()} as unknown as HTMLElement;
    const failed=vi.fn();const session=bootstrapGame(root,{createRenderer:()=>renderer,onStartupError:failed});
    await expect(session.ready).rejects.toThrow('source unavailable');
    expect(failed).toHaveBeenCalledTimes(1);expect(renderer.dispose).toHaveBeenCalledTimes(1);
    session.dispose();expect(renderer.dispose).toHaveBeenCalledTimes(1);
  });
  it('rejects a missing root with a controlled error', () => {
    expect(() => bootstrapGame(null as unknown as HTMLElement, {})).toThrow('Game root is required');
  });

  it('disposes a session only once', () => {
    const element = {} as HTMLElement;
    const appendChild = vi.fn();
    const removeChild = vi.fn();
    const renderer = { element, dispose: vi.fn() };
    const root = { appendChild, removeChild } as unknown as HTMLElement;
    const session = bootstrapGame(root, { createRenderer: () => renderer });

    session.dispose();
    session.dispose();

    expect(appendChild).toHaveBeenCalledWith(element);
    expect(removeChild).toHaveBeenCalledTimes(1);
    expect(renderer.dispose).toHaveBeenCalledTimes(1);
  });
});
