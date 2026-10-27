import {expect,it} from 'vitest';
import {RaceSimulation,makeCourse,parseRaceVariant} from './RaceSimulation';
import actualCourse from '../../../../../../data/reference/minigames/horse-race/course.json';
const points=Array.from({length:120},(_,i)=>({x:Math.sin(i/120*Math.PI*2)*45,y:0,z:Math.cos(i/120*Math.PI*2)*45}));
const variant=parseRaceVariant({mode:'time-trial',laps:1,rivals:0,halfWidth:4});
const input={throttle:1,steer:0,brake:false,gallop:false,drift:false,item:false};
it('requires a countdown; held throttle cannot move before the start',()=>{
 const s=new RaceSimulation(makeCourse(points),variant);const x=s.player.x;s.start();s.step(input,1/60);expect(s.phase).toBe('countdown');expect(s.player.x).toBe(x);expect(s.elapsed).toBe(0);
});
it('finishes only after physically traversing an ordered complete lap',()=>{
 const s=new RaceSimulation(makeCourse(points),variant);s.start();
 for(let i=0;i<60*75&&s.phase!=='finished';i++)s.step(s.pilot(s.player),1/60);
 expect(s.phase).toBe('finished');expect(s.player.gates).toBe(s.course.gateCount);expect(s.elapsed).toBeGreaterThan(12);
});
it('rejects remote jumps and does not award a skipped checkpoint',()=>{
 const s=new RaceSimulation(makeCourse(points),variant);s.start();for(let i=0;i<181;i++)s.step({...input,throttle:0},1/60);
 const far=s.course.at(s.course.length*.7);s.player.x=far.x;s.player.z=far.z;s.step(input,1/60);
 expect(s.player.gates).toBe(0);expect(s.player.penalty).toBeGreaterThan(0);
});
it('pause freezes race time and restart clears previous results and effects',()=>{
 const s=new RaceSimulation(makeCourse(points),variant);s.start();for(let i=0;i<250;i++)s.step(s.pilot(s.player),1/60);s.pause();const t=s.elapsed;s.step(input,.02);expect(s.elapsed).toBe(t);s.start();expect(s.elapsed).toBe(0);expect(s.player.gates).toBe(0);expect(s.player.boost).toBe(0);
});
it('time trial has no item economy; malformed variants fail safely',()=>{
 const s=new RaceSimulation(makeCourse(points),variant);expect(s.pickups).toHaveLength(0);expect(()=>parseRaceVariant({mode:'arcade',laps:-1})).toThrow();expect(()=>makeCourse([{x:0,y:0,z:0}])).toThrow();
});
it.each(['time-trial','arcade'] as const)('finishes the actual source-street adapted course in %s',mode=>{
 const s=new RaceSimulation(makeCourse(actualCourse.points),parseRaceVariant({mode,laps:mode==='arcade'?3:1,rivals:mode==='arcade'?3:0,halfWidth:4}));s.start();
 for(let i=0;i<60*240&&s.phase!=='finished';i++)s.step(s.pilot(s.player),1/60);
 expect(s.phase,JSON.stringify({progress:s.player.progress,gates:s.player.gates,penalty:s.player.penalty})).toBe('finished');expect(s.player.penalty).toBe(0);
});
it('can recover in the third lap without triggering repeated relocation penalties',()=>{
 const s=new RaceSimulation(makeCourse(points),parseRaceVariant({mode:'arcade',laps:3,rivals:0,halfWidth:4}));s.start();for(let i=0;i<181;i++)s.step(input,1/60);
 s.player.gates=s.course.gateCount*2+5;s.recover();const progress=s.player.progress;s.step({...input,throttle:0},1/60);expect(s.player.penalty).toBe(5);expect(s.player.progress).toBeCloseTo(progress,3);
});
it('recovers a missed ordered passage with a penalty instead of running forever',()=>{
 const s=new RaceSimulation(makeCourse(points),variant);s.start();for(let i=0;i<181;i++)s.step({...input,throttle:0},1/60);
 const distance=s.course.gateSpacing+9,p=s.course.at(distance);Object.assign(s.player,p,{progress:distance,lastS:distance});s.step({...input,throttle:0},1/60);
 expect(s.player.gates).toBe(0);expect(s.player.progress).toBeCloseTo(0);expect(s.player.penalty).toBe(5);expect(s.message).toMatch(/passage|tor/i);
});
