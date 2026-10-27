import { expect, it } from 'vitest';
import { placementRoles } from './PlacementRoles';
import {BUILDINGS} from '../buildings/BuildingRegistry';

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

it('keeps imported building surfaces visual when authored collision owns the building',()=>{
 expect(placementRoles({layer:'buildings'},true)).toEqual({obstacle:false,occluder:true,support:false});
 expect(placementRoles({layer:'terrain'},true)).toEqual({obstacle:false,occluder:false,support:true});
});
it('does not let decorative barrels or trees become walking support',()=>{
 expect(placementRoles({layer:'buildings',tags:['role:dressing','collision:none']})).toEqual({obstacle:false,occluder:true,support:false});
});

it('gives the hotel porch the same physical owner as its authored entrance',()=>{
 const building=BUILDINGS.byPlacement.get('valentine:6ebd826b625bcb3b');
 expect(building?.id).toBe('hotel');
 expect(placementRoles({layer:'buildings'},Boolean(building?.floors.length))).toEqual({obstacle:false,occluder:true,support:false});
 expect(building?.floors[0].layout.porch?.stairs.length).toBeGreaterThan(0);
});
