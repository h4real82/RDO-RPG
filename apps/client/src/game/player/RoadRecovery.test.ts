import {describe,expect,it,vi} from 'vitest';

async function load() {
  const path='./RoadRecovery';
  const module=await import(path).catch(()=>undefined);
  expect(module?.RoadRecovery).toBeTypeOf('function');
  return module as typeof import('./RoadRecovery');
}
const target=(id:string,x:number)=>({id,position:{x,z:0},source:{path:'road.json',traceId:'road:1',pointIndex:x}});

describe('source-bounded road recovery',()=>{
  it('uses a freshly checked last road point, copies inputs, then falls back when it becomes unsafe',async()=>{
    const {RoadRecovery}=await load();const last=target('last',10),spawn=target('spawn',0),apply=vi.fn();let blocked=false;
    const recovery=new RoadRecovery([last],spawn,{prepare:async()=>{},isActive:()=>true,
      validate:t=>t.id==='last'&&blocked?undefined:{...t.position,y:7},apply});
    recovery.observe({x:10,y:7,z:0});last.position.x=999;
    expect((await recovery.reset()).position).toEqual({x:10,y:7,z:0});
    blocked=true;expect((await recovery.reset()).target?.id).toBe('spawn');
    expect(apply).toHaveBeenLastCalledWith({x:0,y:7,z:0});
  });
  it('does not invent a target if neither source point has free supported ground',async()=>{
    const {RoadRecovery}=await load(),apply=vi.fn();
    const recovery=new RoadRecovery([],target('spawn',0),{prepare:async()=>{},isActive:()=>true,validate:()=>undefined,apply});
    expect((await recovery.reset()).status).toBe('unavailable');expect(apply).not.toHaveBeenCalled();
  });
  it('serializes repeated requests and cannot apply a late reset after the session is disposed',async()=>{
    const {RoadRecovery}=await load();let finish!:()=>void,active=true;const apply=vi.fn(),prepare=vi.fn(()=>new Promise<void>(r=>{finish=r;}));
    const recovery=new RoadRecovery([],target('spawn',0),{prepare,isActive:()=>active,validate:t=>({...t.position,y:2}),apply});
    const first=recovery.reset(),second=recovery.reset();expect(prepare).toHaveBeenCalledTimes(1);
    active=false;finish();expect((await first).status).toBe('cancelled');expect((await second).status).toBe('cancelled');expect(apply).not.toHaveBeenCalled();
  });
  it('rejects malformed and distant observations and contains preparation errors',async()=>{
    const {RoadRecovery,parseSourceRoadTargets}=await load();
    expect(parseSourceRoadTargets({coordinateSpace:'game-xyz',traces:[]})).toEqual([]);
    const roads=parseSourceRoadTargets({coordinateSpace:'three-right-handed',traces:[
      {id:'rail',kind:'rail',source:{path:'r'},points:[{x:5,z:0}]},
      {id:'road',kind:'road',source:{path:'original-road.json'},points:[{x:10,z:0},{x:NaN,z:0}]},
    ]});expect(roads).toHaveLength(1);expect(roads[0].source.pointIndex).toBe(0);
    const recovery=new RoadRecovery(roads,target('spawn',0),{prepare:async()=>{throw Error('unloaded');},isActive:()=>true,validate:t=>({...t.position,y:2}),apply:vi.fn()});
    recovery.observe({x:100,y:2,z:0});expect(recovery.lastSafeTarget).toBeUndefined();
    recovery.observe({x:10,y:100,z:0});expect(recovery.lastSafeTarget).toBeUndefined();
    expect((await recovery.reset()).status).toBe('error');
  });
});
