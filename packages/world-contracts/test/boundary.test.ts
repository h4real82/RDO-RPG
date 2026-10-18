import { describe, expect, it } from 'vitest';
import { createPlayableBoundary } from '../src/boundary.js';
import { VALENTINE_BOUNDARY } from '../src/valentine-boundary.js';

const polygon = [[0,0],[10,0],[10,10],[6,10],[6,4],[4,4],[4,10],[0,10]] as const;
describe('playable boundary', () => {
  it('blocks outside, crossing concave notches, and a grazing player capsule', () => {
    const b = createPlayableBoundary(polygon, .25);
    expect(b.allowsMove({x:2,z:8}, {x:8,z:8})).toBe(false);
    expect(b.allowsMove({x:2,z:2}, {x:8,z:2})).toBe(true);
    expect(b.contains({x:.2,z:2})).toBe(false);
    expect(b.contains({x:.3,z:2})).toBe(true);
    expect(b.allowsMove({x:2,z:2}, {x:-2,z:2})).toBe(false);
    expect(b.allowsMove({x:-2,z:2}, {x:2,z:2})).toBe(false);
  });
  it('rejects nonfinite positions and malformed polygons', () => {
    const b = createPlayableBoundary(polygon);
    expect(b.contains({x:NaN,z:2})).toBe(false);
    expect(b.allowsMove({x:2,z:2}, {x:Infinity,z:2})).toBe(false);
    expect(() => createPlayableBoundary([[0,0],[1,1],[0,1],[1,0]])).toThrow();
    expect(() => createPlayableBoundary([[0,0],[1,0],[1,0],[0,1]])).toThrow();
    expect(() => createPlayableBoundary([[0,0],[1,0],[0,1]], -1)).toThrow();
  });
  it('validates the generated Valentine outline and keeps known houses and spawn inside', () => {
    const b = createPlayableBoundary(VALENTINE_BOUNDARY.polygon, VALENTINE_BOUNDARY.playerRadiusMetres);
    for (const p of [{x:-310.1441,z:-788.7001},{x:-246.110651,z:-962.686792},{x:-177.0218,z:-633.8562},{x:-378.769816,z:-920.142698}]) {
      expect(b.contains(p)).toBe(true);
    }
    expect(b.contains({x:-550,z:-800})).toBe(false);
  });
});
