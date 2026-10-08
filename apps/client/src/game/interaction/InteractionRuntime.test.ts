import { describe, expect, it, vi } from 'vitest';

import { InteractionRuntime } from './InteractionRuntime';

describe('InteractionRuntime', () => {
  it('accepts E, Tab and Escape without an active POI or DOM menu', () => {
    const runtime = new InteractionRuntime({ getActivePoi: () => undefined, menu: undefined });

    expect(() => runtime.handleKey({ key: 'e' } as KeyboardEvent)).not.toThrow();
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

    runtime.handleKey({ key: 'e', preventDefault: vi.fn() } as unknown as KeyboardEvent);
    runtime.handleKey({ key: 'Escape', preventDefault: vi.fn() } as unknown as KeyboardEvent);

    expect(open).toHaveBeenCalledWith('Interaktion für „bank“ ist noch nicht verfügbar.');
    expect(close).toHaveBeenCalledTimes(1);
  });
});
