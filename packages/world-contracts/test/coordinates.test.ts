import { describe, expect, it } from 'vitest';
import { CHUNK_SIZE, WORLD_LAYERS, getChunkId, toGameCoordinates } from '../src';

describe('world coordinates', () => {
  it('maps the Jean Ropke origin to the Three.js origin', () => {
    expect(toGameCoordinates(111.29, -63.6)).toEqual({ x: 0, z: 0 });
  });

  it('uses floor-based chunk indices on both sides of the origin', () => {
    expect(CHUNK_SIZE).toBe(250);
    expect(getChunkId(250, -0.001)).toBe('1:-1');
    expect(getChunkId(-0.001, -250)).toBe('-1:-1');
  });

  it('exports the fixed world rendering layers', () => {
    expect(WORLD_LAYERS).toEqual({
      terrain: 0,
      roadsAndRails: 0.002,
      boardwalks: 0.0035,
      buildings: 0.005,
    });
  });
});
