import{expect,it}from'vitest';import{planExitRoute,WaypointMovement}from'./ExitRoute';
import type{RoomLayout}from'../buildings/BuildingTypes';import{toWorld}from'../buildings/RoomTransform';
const c:RoomLayout={key:'test',placementId:'test',x:0,z:0,width:8,depth:8,floorY:3,front:4,doorX:0,doorWidth:2,rampStart:10,rampLow:0,frontDirection:1,yaw:.4};
it('routes through the actual ramp foot to sampled terrain, including rotated buildings',()=>{
 const route=planExitRoute(c,toWorld(c,{x:0,y:3,z:3}),()=>.1,()=>true)!;
 expect(route).toHaveLength(3);expect(route[1]).toEqual(toWorld(c,{x:0,y:0,z:10}));expect(route[2].y).toBe(.1);expect(route[2].x).toBeCloseTo(Math.sin(.4)*10.6);
});
it('uses explicit veranda stair landings instead of walking diagonally off a high deck',()=>{
 const layout={...c,porch:{x:0,z:6,width:8,depth:4,stairs:[{id:'east',from:{x:7,y:0,z:6},to:{x:4,y:3,z:6},width:2}]}};
 const route=planExitRoute(layout,toWorld(c,{x:0,y:3,z:3}),()=>0,()=>true)!;expect(route[1]).toEqual(toWorld(c,{x:4,y:3,z:6}));expect(route[2]).toEqual(toWorld(c,{x:7,y:0,z:6}));
});
it('refuses missing terrain, blocked segments and floors without exterior access',()=>{
 const player={x:0,y:3,z:3};expect(planExitRoute(c,player,()=>undefined,()=>true)).toBeUndefined();expect(planExitRoute(c,player,()=>0,()=>false)).toBeUndefined();expect(planExitRoute({...c,exteriorEntrance:false},player,()=>0,()=>true)).toBeUndefined();
});
it('cancels queued motion on any direct input/capture assignment',()=>{
 const motion=new WaypointMovement(),a={x:0,y:0,z:0},b={x:1,y:0,z:0};motion.start([a,b]);expect(motion.target).toEqual(a);motion.advance();expect(motion.target).toEqual(b);motion.start([a,b]);motion.target=undefined;motion.advance();expect(motion.target).toBeUndefined();motion.start([a,b]);motion.target=b;motion.advance();expect(motion.target).toBeUndefined();
});
