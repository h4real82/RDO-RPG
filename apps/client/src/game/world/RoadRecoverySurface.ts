import type {BoundaryPoint} from '@rdo-rpg/world-contracts';
import type {PlayerPosition} from '../player/PlayerController';
import {TerrainGround} from './TerrainGround';
import {VisibleMeshCollision} from './VisibleMeshCollision';
import {SourceTraversal} from './SourceTraversal';

/** A source hint is usable only with current support, clearance, boundary and a way out. */
export function validateRoadSurface(point:BoundaryPoint,ground:TerrainGround,collision:VisibleMeshCollision,
  boundary:{allowsMove(from:BoundaryPoint,to:BoundaryPoint):boolean}):PlayerPosition|undefined {
  const {x,z}=point,y=ground.heightAt(x,z);
  if(y===undefined) return undefined;
  const position={x,y,z};
  if(!boundary.allowsMove(position,position) || collision.overlapsBody(position)) return undefined;
  const traversal=new SourceTraversal(ground,collision,boundary);
  const exits=[[0.5,0],[-0.5,0],[0,0.5],[0,-0.5]].map(([dx,dz])=>traversal.resolve(position,{x:x+dx,y,z:z+dz}));
  return (exits[0]&&exits[1]) || (exits[2]&&exits[3])?position:undefined;
}
