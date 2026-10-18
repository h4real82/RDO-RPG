import {toWorld} from '../buildings/RoomTransform';
import {expect,it} from 'vitest';
import {BUILDINGS} from '../buildings/BuildingRegistry';
import {resolveProximityHints} from './ProximityHints';
const b=BUILDINGS.byId.get('smithfields-saloon')!,f=b.floors[0],c=f.layout,context={mode:'indoor' as const,building:b,floor:f,approach:1};
it('only offers nearby reachable hints on the active floor and prioritizes exits',()=>{
  const atDoor=toWorld(c,{x:c.doorX,y:c.floorY,z:c.front-.6});
  expect(resolveProximityHints(context,atDoor,()=>true,()=>true)[0].kind).toBe('exit');
  expect(resolveProximityHints(context,toWorld(c,{x:c.x,y:c.floorY,z:c.z-4}),()=>true,()=>true).find(h=>h.kind==='exit')).toBeUndefined();
  expect(resolveProximityHints(context,atDoor,()=>false,()=>true)).toEqual([]);
  expect(resolveProximityHints({...context,mode:'outdoor'},atDoor,()=>true,()=>true)).toEqual([]);
  const atAction=toWorld(c,b.actions[0].interactionPosition!);
  expect(resolveProximityHints(context,atAction,()=>true,()=>false).some(h=>h.kind==='action')).toBe(false);
  expect(resolveProximityHints(context,atAction,()=>true,()=>true).some(h=>h.actionId==='darts')).toBe(true);
});

it('offers Darts only inside 1.8 metres of the board, never on the veranda',()=>{
 const action=b.actions[0],anchor=action.position!;
 const near=toWorld(c,{...anchor,y:c.floorY,z:anchor.z+1.7});
 const far=toWorld(c,{...anchor,y:c.floorY,z:anchor.z+1.9});
 const hasDarts=(ctx:Omit<typeof context,'mode'> & {mode:'indoor'|'approach'},p:typeof near)=>resolveProximityHints(ctx,p,()=>true,()=>true).some(h=>h.actionId==='darts');
 expect(hasDarts(context,near)).toBe(true);expect(hasDarts(context,far)).toBe(false);
 expect(hasDarts({...context,mode:'approach'},near)).toBe(false);
});
