import { describe, expect, it } from 'vitest';

import { PlayerController } from './PlayerController';

describe('PlayerController', () => {
  it('publishes deterministic position and facing without creating world objects', () => {
    const player = new PlayerController({ x: 0, y: 0, z: 0 });
    player.setMovement({ forward: 1, right: 0 });

    player.update(1);

    expect(player.position.z).toBe(-6);
    expect(player.facing.z).toBe(-1);
  });

  it('slides along a source-derived obstacle instead of moving through it', () => {
    const CollidingPlayerController = PlayerController as unknown as new (
      position: { x: number; y: number; z: number },
      speed: number,
      canOccupy: (position: { x: number; y: number; z: number }) => boolean,
    ) => PlayerController;
    const player = new CollidingPlayerController({ x: 0, y: 0, z: 0 }, 6, (position) => position.x <= 0);
    player.setMovement({ forward: 1, right: 1 });

    player.update(1);

    expect(player.position.x).toBe(0);
    expect(player.position.z).toBeCloseTo(-Math.SQRT1_2 * 6);
  });
});
