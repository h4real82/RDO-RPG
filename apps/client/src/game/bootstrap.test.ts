import { describe, expect, it, vi } from 'vitest';

import { bootstrapGame } from './bootstrap';

describe('bootstrapGame', () => {
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
