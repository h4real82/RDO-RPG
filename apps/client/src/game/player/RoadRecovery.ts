import type { PlayerPosition } from './PlayerController';

export interface RoadTarget {
  id: string;
  position: {x:number;z:number};
  source: {path:string;traceId:string;pointIndex:number};
}
export interface RoadRecoveryResult {
  status: 'recovered'|'unavailable'|'cancelled'|'error';
  message: string;
  target?: RoadTarget;
  position?: PlayerPosition;
}
export interface RoadRecoveryActions {resetToRoad(): Promise<RoadRecoveryResult>;}
interface RecoveryEnvironment {
  prepare(target:RoadTarget):Promise<void>;
  validate(target:RoadTarget):PlayerPosition|undefined;
  apply(position:PlayerPosition):void;
  isActive():boolean;
}
const copy=(target:RoadTarget):RoadTarget=>({...target,position:{...target.position},source:{...target.source}});
const finite=(point:PlayerPosition):boolean=>[point.x,point.y,point.z].every(Number.isFinite);

/** Source traces supply X/Z candidates only. Loaded meshes must supply support and clearance. */
export function parseSourceRoadTargets(payload:unknown):RoadTarget[] {
  if(!payload || typeof payload!=='object') return [];
  const data=payload as {coordinateSpace?:string;traces?:unknown[]};
  if(data.coordinateSpace!=='three-right-handed' || !Array.isArray(data.traces)) return [];
  return data.traces.flatMap(value=>{
    if(!value || typeof value!=='object') return [];
    const trace=value as {kind?:string;id?:string;source?:{path?:string};points?:unknown[]};
    if(trace.kind!=='road' || typeof trace.id!=='string' || typeof trace.source?.path!=='string' || !trace.source.path || !Array.isArray(trace.points)) return [];
    return trace.points.flatMap((raw,index)=>{
      if(!raw || typeof raw!=='object') return [];
      const point=raw as {x?:number;z?:number};
      if(typeof point.x!=='number' || typeof point.z!=='number' || !Number.isFinite(point.x) || !Number.isFinite(point.z)) return [];
      return [{id:`${trace.id}#${index}`,position:{x:point.x,z:point.z},source:{path:trace.source!.path!,traceId:trace.id!,pointIndex:index}}];
    });
  });
}

/** One local recovery transaction. No arbitrary coordinates are accepted by reset(). */
export class RoadRecovery {
  private readonly roads:RoadTarget[];
  private readonly spawn:RoadTarget;
  private last:RoadTarget|undefined;
  private pending:Promise<RoadRecoveryResult>|undefined;
  constructor(roads:readonly RoadTarget[],spawn:RoadTarget,private readonly environment:RecoveryEnvironment) {
    this.roads=roads.map(copy);this.spawn=copy(spawn);
  }
  get lastSafeTarget():RoadTarget|undefined {return this.last?copy(this.last):undefined;}
  observe(position:PlayerPosition):void {
    if(this.pending || !finite(position) || !this.environment.isActive()) return;
    const nearest=this.roads.reduce<RoadTarget|undefined>((best,target)=>{
      const distance=Math.hypot(target.position.x-position.x,target.position.z-position.z);
      return distance<=1 && (!best || distance<Math.hypot(best.position.x-position.x,best.position.z-position.z))?target:best;
    },undefined);
    if(!nearest || nearest.id===this.last?.id) return;
    try {
      const checked=this.environment.validate(copy(nearest));
      if(checked && finite(checked) && Math.abs(checked.y-position.y)<=0.45) this.last=copy(nearest);
    } catch { /* A failed observation must not stop simulation or replace the previous safe point. */ }
  }
  reset():Promise<RoadRecoveryResult> {
    if(this.pending) return this.pending;
    this.pending=this.run().finally(()=>{this.pending=undefined;});
    return this.pending;
  }
  private async run():Promise<RoadRecoveryResult> {
    const cancelled=():RoadRecoveryResult=>({status:'cancelled',message:'Die Rücksetzung wurde abgebrochen.'});
    try {
      const targets=[...(this.last?[copy(this.last)]:[]),copy(this.spawn)];
      const seen=new Set<string>();
      for(const target of targets) {
        if(seen.has(target.id)) continue;seen.add(target.id);
        if(!this.environment.isActive()) return cancelled();
        await this.environment.prepare(copy(target));
        if(!this.environment.isActive()) return cancelled();
        const position=this.environment.validate(copy(target));
        if(!position || !finite(position)) continue;
        if(!this.environment.isActive()) return cancelled();
        this.environment.apply({...position});
        return {status:'recovered',message:'Du stehst wieder an einem geprüften Straßenpunkt.',target:copy(target),position:{...position}};
      }
      return {status:'unavailable',message:'Kein freier Straßenpunkt mit geladenem Boden gefunden. Deine Position bleibt erhalten.'};
    } catch {
      return this.environment.isActive()?{status:'error',message:'Die Straße konnte nicht sicher geladen werden. Bitte erneut versuchen.'}:cancelled();
    }
  }
}
