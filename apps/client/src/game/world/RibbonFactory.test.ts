import { describe, expect, it } from 'vitest';

import { createRibbon } from './RibbonFactory';

describe('createRibbon', () => {
  it('builds a quad strip on the prescribed road layer', () => {
    const geometry = createRibbon([{ x: 0, y: 10, z: 0 }, { x: 5, y: 20, z: 0 }], 'roadsAndRails', 4);

    const positions = geometry.getAttribute('position');
    expect(positions.count).toBe(4);
    Array.from({ length: positions.count }, (_, index) => positions.getY(index)).forEach((y) => expect(y).toBeCloseTo(0.002, 6));
    expect(Array.from(geometry.getIndex()!.array)).toEqual([0, 2, 1, 1, 2, 3]);
  });
});
