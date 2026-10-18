import defaultVariant from '../../../../../../data/reference/minigames/darts/variants/valentine-saloon-practice.json';
/** Authored gameplay: a local target practice, with no 501 or wagering rules. */
export interface DartPoint { x: number; y: number }
export interface DartThrow extends DartPoint { score: number }

export interface DartsVariant {throws:number;maximumScore:number;rings:{maximumNormalizedRadius:number;points:number}[];missPoints:number;minimumThrowIntervalMs:number}
export function parseDartsVariant(value:unknown):DartsVariant {
  const v=value as DartsVariant;
  if(!v || !Number.isInteger(v.throws) || v.throws<1 || v.throws>20 || !Array.isArray(v.rings) || v.rings.length!==3
    || !v.rings.every((ring,i)=>Number.isFinite(ring.maximumNormalizedRadius) && ring.maximumNormalizedRadius>0 && ring.maximumNormalizedRadius<=1
      && (i===0 || ring.maximumNormalizedRadius>v.rings[i-1].maximumNormalizedRadius) && Number.isInteger(ring.points) && ring.points>=0)
    || v.rings[2].maximumNormalizedRadius!==1 || !Number.isInteger(v.missPoints) || v.missPoints!==0
    || v.maximumScore!==v.throws*Math.max(...v.rings.map(r=>r.points)) || !Number.isFinite(v.minimumThrowIntervalMs) || v.minimumThrowIntervalMs<100)
    throw new Error('Ungültige Darts-Variante.');
  return {throws:v.throws,maximumScore:v.maximumScore,rings:v.rings.map(r=>({...r})),missPoints:v.missPoints,minimumThrowIntervalMs:v.minimumThrowIntervalMs};
}
export const DEFAULT_DARTS=parseDartsVariant(defaultVariant);
export function scoreDart(point: DartPoint,variant:DartsVariant=DEFAULT_DARTS): number {
  const radius = Math.hypot(point.x, point.y);
  if (!Number.isFinite(radius) || radius > 1) return 0;
  return variant.rings.find(r=>radius<=r.maximumNormalizedRadius)?.points??variant.missPoints;
}

export function driftingAim(aim: DartPoint, elapsedMs: number): DartPoint {
  const phase = Math.max(0, elapsedMs) * Math.PI / 1200;
  return { x: aim.x + 0.22 * Math.sin(phase), y: aim.y + 0.16 * Math.sin(phase * 2) };
}

export class DartsRound {
  constructor(readonly variant:DartsVariant=DEFAULT_DARTS){this.variant=parseDartsVariant(variant);}
  private hits: DartThrow[] = [];
  get throws(): readonly DartThrow[] { return this.hits; }
  get complete(): boolean { return this.hits.length >= this.variant.throws; }
  get total(): number { return this.hits.reduce((sum, hit) => sum + hit.score, 0); }
  throwAt(point: DartPoint): DartThrow | null {
    if (this.complete) return null;
    const hit = { ...point, score: scoreDart(point,this.variant) };
    this.hits.push(hit);
    return hit;
  }
  reset(): void { this.hits = []; }
}
