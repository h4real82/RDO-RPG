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
  presentation.apply({mode:'outdoor',approach:0});expect(source.visible).toBe(true);expect(alreadyHidden.visible).toBe(false);expect(room.interior.visible).toBe(false);
  presentation.dispose();room.dispose();
});
