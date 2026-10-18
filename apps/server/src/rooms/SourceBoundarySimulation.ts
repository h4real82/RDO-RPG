export interface SourcePoint { x: number; z: number }
export interface SourceIntent { dx: number; dz: number; sprint: boolean }
export interface SourceBoundary { contains(p: SourcePoint): boolean; allowsMove(a: SourcePoint,b: SourcePoint): boolean }

/** Server-owned integration, explicitly in Three X/Z metres. No client position claims. */
export function advanceSourcePosition(position: SourcePoint, intent: SourceIntent, deltaMs: number, boundary: SourceBoundary): SourcePoint {
  if (![position.x,position.z,intent.dx,intent.dz,deltaMs].every(Number.isFinite) || deltaMs<=0) return {...position};
  const magnitude=Math.hypot(intent.dx,intent.dz);
  if (!magnitude) return {...position};
  const distance=(intent.sprint ? 9 : 6)*Math.min(deltaMs,50)/1000;
  const divisor=Math.max(1,magnitude);
  const candidate={x:position.x+intent.dx/divisor*distance,z:position.z+intent.dz/divisor*distance};
  return boundary.allowsMove(position,candidate) ? candidate : {...position};
}
