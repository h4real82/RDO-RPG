export interface BoundaryPoint { x: number; z: number }
export type BoundaryPolygon = ReadonlyArray<readonly [number, number]>;
const finite = (p: BoundaryPoint): boolean => Number.isFinite(p.x) && Number.isFinite(p.z);
const cross = (a: BoundaryPoint, b: BoundaryPoint, c: BoundaryPoint): number =>
  (b.x-a.x)*(c.z-a.z)-(b.z-a.z)*(c.x-a.x);
const pointDistance = (p: BoundaryPoint, a: BoundaryPoint, b: BoundaryPoint): number => {
  const dx=b.x-a.x, dz=b.z-a.z, length=dx*dx+dz*dz;
  const t=length ? Math.max(0, Math.min(1, ((p.x-a.x)*dx+(p.z-a.z)*dz)/length)) : 0;
  return Math.hypot(p.x-a.x-t*dx, p.z-a.z-t*dz);
};
const intersects = (a: BoundaryPoint, b: BoundaryPoint, c: BoundaryPoint, d: BoundaryPoint): boolean => {
  const abC=cross(a,b,c), abD=cross(a,b,d), cdA=cross(c,d,a), cdB=cross(c,d,b);
  if (((abC>0 && abD<0)||(abC<0 && abD>0)) && ((cdA>0 && cdB<0)||(cdA<0 && cdB>0))) return true;
  return pointDistance(a,c,d)<1e-8 || pointDistance(b,c,d)<1e-8 || pointDistance(c,a,b)<1e-8 || pointDistance(d,a,b)<1e-8;
};

/** Closed polygon, with a capsule test for the complete movement span (including concave edges). */
export function createPlayableBoundary(polygon: BoundaryPolygon, radius=0.25) {
  const points=polygon.map(([x,z])=>({x,z}));
  if (points.length<3 || !points.every(finite) || !Number.isFinite(radius) || radius<0) throw new Error('Invalid boundary');
  const edges=points.map((a,i)=>[a,points[(i+1)%points.length]] as const);
  let area=0;
  for (let i=0;i<edges.length;i++) {
    const [a,b]=edges[i]; area+=a.x*b.z-b.x*a.z;
    if (Math.hypot(b.x-a.x,b.z-a.z)<1e-8) throw new Error('Zero-length boundary edge');
    for (let j=i+2;j<edges.length;j++) {
      if (i===0 && j===edges.length-1) continue;
      if (intersects(a,b,...edges[j])) throw new Error('Self-intersecting boundary');
    }
  }
  if (Math.abs(area)<1e-8) throw new Error('Zero-area boundary');
  const inside=(p: BoundaryPoint): boolean=> {
    if (!finite(p)) return false;
    let odd=false;
    for (const [a,b] of edges) {
      if (pointDistance(p,a,b)<1e-8) return true;
      if ((a.z>p.z)!==(b.z>p.z) && p.x<(b.x-a.x)*(p.z-a.z)/(b.z-a.z)+a.x) odd=!odd;
    }
    return odd;
  };
  const contains=(p: BoundaryPoint): boolean=>inside(p) && edges.every(([a,b])=>pointDistance(p,a,b)>=radius);
  return {
    contains,
    allowsMove(from: BoundaryPoint, to: BoundaryPoint): boolean {
      if (!contains(from) || !contains(to)) return false;
      return edges.every(([a,b])=>!intersects(from,to,a,b) && Math.min(
        pointDistance(from,a,b),pointDistance(to,a,b),pointDistance(a,from,to),pointDistance(b,from,to),
      )>=radius);
    },
  };
}
