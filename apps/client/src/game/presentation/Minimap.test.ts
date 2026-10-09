import { describe, expect, it } from 'vitest';
import { toGameCoordinates } from '@rdo-rpg/world-contracts';

import { Minimap } from './Minimap';

describe('Minimap', () => {
  const minimap = new Minimap();

  it('projects the contract CRS origin without a second coordinate transform', () => {
    expect(minimap.project(toGameCoordinates(111.29, -63.6))).toEqual({ x: 0, y: 0 });
  });

  it('projects a known CRS reference point from the contract core', () => {
    const point = minimap.project(toGameCoordinates(111.30552, -63.58448));
    expect(point.x).toBeCloseTo(1, 10);
    expect(point.y).toBeCloseTo(-1, 10);
  });

  it('preserves negative game coordinates deterministically', () => {
    expect(minimap.project({ x: -250, z: -500 })).toEqual({ x: -250, y: -500 });
  });
});
