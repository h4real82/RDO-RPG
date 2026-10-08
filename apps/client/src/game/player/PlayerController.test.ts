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
});
