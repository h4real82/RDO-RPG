import { expect,it } from 'vitest';
import { BoxGeometry,Group,Mesh,MeshBasicMaterial } from 'three';
import { BUILDINGS } from '../buildings/BuildingRegistry';
import { createAuthoredBank } from '../world/AuthoredBank';
import { InteriorPresentation } from './InteriorPresentation';
import { VisibleMeshCollision } from '../world/VisibleMeshCollision';

it('hides scenery rather than physics, shows only the active floor, and restores original visibility',()=>{
  const b=BUILDINGS.byId.get('bank')!,room=createAuthoredBank(),source=new Group(),alreadyHidden=new Group();alreadyHidden.visible=false;
  source.add(new Mesh(new BoxGeometry(1,3,1),new MeshBasicMaterial()));source.updateWorldMatrix(true,true);
  const collision=new VisibleMeshCollision();collision.add(source);
  const presentation=new InteriorPresentation();presentation.trackSource(source);presentation.trackSource(alreadyHidden);presentation.registerRoom('bank/ground',room);
  presentation.apply({mode:'indoor',building:b,floor:b.floors[0],approach:1});
  expect(source.visible).toBe(false);expect(room.interior.visible).toBe(true);expect(room.support.visible).toBe(true);
  expect(collision.blocksTransition({x:-2,y:0,z:0},{x:2,y:0,z:0})).toBe(true);
  presentation.apply({mode:'outdoor',approach:0});expect(source.visible).toBe(true);expect(alreadyHidden.visible).toBe(false);expect(room.interior.visible).toBe(true);
  presentation.dispose();room.dispose();
});

it('keeps ground-floor furniture visible through exterior openings while hiding cutaway walls',()=>{
  const room=createAuthoredBank(),presentation=new InteriorPresentation();presentation.registerRoom('bank/ground',room);
  const ramp=room.support.children.find(c=>c.userData.physicsOnly)!;
  expect(room.interior.visible).toBe(true);expect(ramp.visible).toBe(false);
  const wall=room.interior.children.find(c=>c.name.endsWith('-cutaway'))!;expect(wall.visible).toBe(false);
  const b=BUILDINGS.byId.get('bank')!;presentation.apply({mode:'indoor',building:b,floor:b.floors[0],approach:1});
  expect(room.interior.visible).toBe(true);expect(wall.visible).toBe(true);
  presentation.apply({mode:'outdoor',approach:0});expect(room.interior.visible).toBe(true);expect(wall.visible).toBe(false);
  presentation.dispose();room.dispose();
});

it('preserves fixture visibility across entry, exit, and a second entry without reviving replaced fixtures',()=>{
 const room=createAuthoredBank(),presentation=new InteriorPresentation(),b=BUILDINGS.byId.get('bank')!;
 const fixture=new Group(),replaced=new Group();fixture.name='counter';replaced.name='replaced-counter';replaced.visible=false;
 room.interior.add(fixture,replaced);presentation.registerRoom('bank/ground',room);
 for(let pass=0;pass<2;pass++){
  presentation.apply({mode:'indoor',building:b,floor:b.floors[0],approach:1});
  expect(fixture.visible).toBe(true);expect(replaced.visible).toBe(false);
  presentation.apply({mode:'outdoor',approach:0});
 }
 presentation.dispose();room.dispose();
});

it('shows a connecting staircase from the active upper floor without showing the lower floor',()=>{
 const b=BUILDINGS.byId.get('bank')!,lower=createAuthoredBank(),upper=createAuthoredBank(),presentation=new InteriorPresentation();
 const stairs=new Group();stairs.userData.stairConnector=true;lower.support.add(stairs);
 presentation.registerRoom('bank/ground',lower);presentation.registerRoom('bank/upper',upper);
 presentation.apply({mode:'indoor',building:b,floor:{...b.floors[0],id:'upper'},approach:1});
 expect(lower.support.visible).toBe(true);expect(stairs.visible).toBe(true);
 expect(lower.support.children.find(c=>c.name.includes('-floor'))!.visible).toBe(false);expect(lower.interior.visible).toBe(false);
 presentation.unregisterRoom('bank/ground');expect(lower.support.children.find(c=>c.name.includes('-floor'))!.visible).toBe(true);
 presentation.dispose();lower.dispose();upper.dispose();
});

it('culls distant outdoor furniture while retaining floor support and nearby views through doors',()=>{
 const b=BUILDINGS.byId.get('bank')!,room=createAuthoredBank(),presentation=new InteriorPresentation(),outdoor={mode:'outdoor' as const,approach:0};presentation.registerRoom('bank/ground',room);
 presentation.apply(outdoor,{x:1000,z:1000});expect(room.interior.visible).toBe(false);expect(room.support.visible).toBe(true);
 presentation.apply(outdoor,{x:b.floors[0].layout.x,z:b.floors[0].layout.z});expect(room.interior.visible).toBe(true);
 presentation.apply({mode:'indoor',building:b,floor:b.floors[0],approach:1},{x:1000,z:1000});expect(room.interior.visible).toBe(true);presentation.dispose();room.dispose();
});
