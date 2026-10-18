import { expect, it } from 'vitest';
import { placementRoles } from './PlacementRoles';

it('keeps flat decals out of obstruction, support and camera collision', () => {
  expect(placementRoles({ layer: 'roadsAndRails', tags: ['role:decal', 'collision:none', 'occlusion:none'] }))
    .toEqual({ obstacle: false, occluder: false, support: false });
});

it('keeps terrain walkable and building walls solid', () => {
  expect(placementRoles({ layer: 'terrain' })).toEqual({ obstacle: false, occluder: false, support: true });
  expect(placementRoles({ layer: 'buildings', tags: ['exterior', 'source:root-ymap'] }))
    .toEqual({ obstacle: true, occluder: true, support: true });
});

it('does not turn emissive and shadow details into invisible walls or floors', () => {
  for (const role of ['role:emissive-detail', 'role:shadow-detail']) {
    expect(placementRoles({ layer: 'buildings', tags: [role] }))
      .toEqual({ obstacle: false, occluder: false, support: false });
  }
});
