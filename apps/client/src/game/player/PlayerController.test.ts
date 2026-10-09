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

  it('does not jump across a narrow obstacle during a slow frame', () => {
    const player = new PlayerController({ x: 0, y: 0, z: 0 }, 6,
      (position) => position.x < 1 || position.x > 1.5);
    player.setMovement({ forward: 0, right: 1 });

    player.update(0.5);

    expect(player.position.x).toBeLessThan(1);
  });

  it('reports a blocked move only while the player presses into an obstacle', () => {
    const player = new PlayerController({ x: 0, y: 0, z: 0 }, 6, (position) => position.x < 1);
    player.setMovement({ forward: 0, right: 1 });
    player.update(0.5);
    expect(player.blocked).toBe(true);

    player.setMovement({ forward: 0, right: 0 });
    player.update(0.1);
    expect(player.blocked).toBe(false);
  });
});
