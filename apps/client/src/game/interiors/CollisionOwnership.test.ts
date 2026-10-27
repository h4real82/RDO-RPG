import{expect,it}from'vitest';import{BUILDINGS}from'../buildings/BuildingRegistry';import{toWorld}from'../buildings/RoomTransform';import{createAuthoredCollisionOwnership}from'./CollisionOwnership';
it('owns rotated floors and their doorway route, but not unrelated streets or other elevations',()=>{
 const c=BUILDINGS.byId.get('val-03-stable-ext')!.floors[0].layout,o=createAuthoredCollisionOwnership([c]),point=(x:number,z:number,y=c.floorY)=>toWorld(c,{x,y,z});
 expect(o.coversTransition(point(c.x,c.z),point(c.x+1,c.z))).toBe(true);expect(o.coversSupport(c.x,c.z)).toBe(true);
 expect(o.coversTransition(point(c.doorX,c.rampStart,c.rampLow),point(c.doorX,c.front))).toBe(true);
 expect(o.coversTransition(point(c.x,c.z,c.floorY+8),point(c.x+1,c.z,c.floorY+8))).toBe(false);
 expect(o.coversSupport(c.x+100,c.z+100)).toBe(false);
});
