import { describe, expect, it, vi } from 'vitest';

import { InteractionRuntime } from './InteractionRuntime';

describe('InteractionRuntime', () => {
  it('leaves modified, composing, consumed and repeated F to their owner', () => {
    const open=vi.fn(),close=vi.fn();
    const runtime=new InteractionRuntime({getActivePoi:()=>({id:'unknown',category:'unknown'}),menu:{open,close}});
    for(const flags of [{ctrlKey:true},{metaKey:true},{altKey:true},{isComposing:true},{defaultPrevented:true},{repeat:true}]) {
      runtime.handleKey({key:'f',preventDefault:vi.fn(),...flags} as unknown as KeyboardEvent);
    }
    expect(open).not.toHaveBeenCalled();expect(close).not.toHaveBeenCalled();
  });
  it('does not swallow consumed Escape from a higher input layer', () => {
    const close=vi.fn();
    new InteractionRuntime({getActivePoi:()=>undefined,menu:{open:vi.fn(),close}})
      .handleKey({key:'Escape',defaultPrevented:true,preventDefault:vi.fn()} as unknown as KeyboardEvent);
    expect(close).not.toHaveBeenCalled();
  });
  it('preserves native Tab navigation inside interaction dialogs', () => {
    const preventDefault=vi.fn();
    new InteractionRuntime({getActivePoi:()=>undefined,menu:undefined})
      .handleKey({key:'Tab',preventDefault} as unknown as KeyboardEvent);
    expect(preventDefault).not.toHaveBeenCalled();
  });
  it('accepts F, Tab and Escape without an active POI or DOM menu', () => {
    const runtime = new InteractionRuntime({ getActivePoi: () => undefined, menu: undefined });

    expect(() => runtime.handleKey({ key: 'f' } as KeyboardEvent)).not.toThrow();
    expect(() => runtime.handleKey({ key: 'Tab' } as KeyboardEvent)).not.toThrow();
    expect(() => runtime.handleKey({ key: 'Escape' } as KeyboardEvent)).not.toThrow();
  });

  it('opens a closable fallback for an unknown POI category', () => {
    const open = vi.fn();
    const close = vi.fn();
    const runtime = new InteractionRuntime({
      getActivePoi: () => ({ id: 'bank', category: 'unknown' }),
      menu: { open, close },
    });

    runtime.handleKey({ key: 'f', preventDefault: vi.fn() } as unknown as KeyboardEvent);
    runtime.handleKey({ key: 'Escape', preventDefault: vi.fn() } as unknown as KeyboardEvent);

    expect(open).toHaveBeenCalledWith('Interaktion für „bank“ ist noch nicht verfügbar.');
    expect(close).toHaveBeenCalledTimes(1);
  });
});
