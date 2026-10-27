import { expect,it } from 'vitest';
import { BUILDINGS } from '../buildings/BuildingRegistry';
import { resolveContextCamera } from './ContextCamera';

const building=BUILDINGS.byId.get('smithfields-saloon')!,floor=building.floors[0],player={x:floor.layout.doorX,y:117.35,z:-790};
it('keeps the street wide, approaches smoothly and fits the active floor at any aspect/yaw',()=>{
  const wide=resolveContextCamera({mode:'outdoor',approach:0},player,1.6,0);
  const near=resolveContextCamera({mode:'approach',building,floor,approach:.9},player,1.6,0);
  expect(wide.visibleHeight).toBe(42);expect(near.visibleHeight).toBeLessThan(wide.visibleHeight);
  const inside=resolveContextCamera({mode:'indoor',building,floor,approach:1},player,1.6,0);
  const portrait=resolveContextCamera({mode:'indoor',building,floor,approach:1},player,.45,Math.PI/2);
  expect(inside.target.z).toBe(floor.layout.z);expect(inside.visibleHeight).toBeLessThan(42);
  expect(portrait.visibleHeight).toBeGreaterThan(inside.visibleHeight);
});

it('frames a small ticket booth at a useful size instead of leaving a tiny floor in empty space',()=>{
 const building=BUILDINGS.byId.get('val-07-magic-ticketbooth')!,floor=building.floors[0],p={x:floor.layout.x,y:floor.layout.floorY,z:floor.layout.z};
 const goal=resolveContextCamera({mode:'indoor',building,floor,approach:1},p,1.5,0);expect(goal.visibleHeight).toBeGreaterThanOrEqual(5);expect(goal.visibleHeight).toBeLessThanOrEqual(8);
});
