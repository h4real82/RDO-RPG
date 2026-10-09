import { Box3, Group, Mesh, Raycaster, Vector3 } from 'three';

type Position = { x: number; y: number; z: number };
type Candidate = { bounds: Box3; meshes: { mesh: Mesh; bounds: Box3 }[] };

/** Walk collision against loaded visible source geometry, not whole-model boxes. */
export class VisibleMeshCollision {
  private readonly candidates = new Map<Group, Candidate>();
  private readonly ray = new Raycaster();
  lastHit: { asset: string; mesh: string } | undefined;

  add(instance: Group): void {
    instance.updateWorldMatrix(true, true);
    const meshes: Candidate['meshes'] = [];
    const bounds = new Box3();
    instance.traverseVisible((object) => {
      if (!(object instanceof Mesh)) return;
      const meshBounds = new Box3().setFromObject(object);
      if (meshBounds.isEmpty()) return;
      meshes.push({ mesh: object, bounds: meshBounds });
      bounds.union(meshBounds);
    });
    this.candidates.set(instance, { bounds, meshes });
  }

  remove(instance: Group): void { this.candidates.delete(instance); }

  blocksTransition(from: Position, to: Position): boolean {
    this.lastHit = undefined;
    const dx = to.x - from.x, dz = to.z - from.z;
    const length = Math.hypot(dx, dz);
    if (!Number.isFinite(length) || length < 1e-8) return false;
    const direction = new Vector3(dx / length, 0, dz / length);
    const sideX = -direction.z * 0.25, sideZ = direction.x * 0.25;
    this.ray.far = length;
    for (const [instance, { bounds, meshes }] of this.candidates) {
      if (bounds.max.y < Math.min(from.y, to.y) + 0.35 || bounds.min.y > Math.max(from.y, to.y) + 1.55) continue;
      if (Math.max(from.x, to.x) + 0.25 < bounds.min.x || Math.min(from.x, to.x) - 0.25 > bounds.max.x
        || Math.max(from.z, to.z) + 0.25 < bounds.min.z || Math.min(from.z, to.z) - 0.25 > bounds.max.z) continue;
      for (const { mesh, bounds: part } of meshes) {
        if (part.max.y < from.y + 0.35 || part.min.y > from.y + 1.55) continue;
        if (Math.max(from.x, to.x) + 0.25 < part.min.x || Math.min(from.x, to.x) - 0.25 > part.max.x
          || Math.max(from.z, to.z) + 0.25 < part.min.z || Math.min(from.z, to.z) - 0.25 > part.max.z) continue;
        for (const side of [-1, 0, 1]) {
          for (const elevation of [0.4, 1.4]) {
            this.ray.set(new Vector3(from.x + side * sideX, from.y + elevation, from.z + side * sideZ), direction);
            const forwardHit = this.ray.intersectObject(mesh, false).length > 0;
            this.ray.set(new Vector3(to.x + side * sideX, to.y + elevation, to.z + side * sideZ), direction.clone().negate());
            const reverseHit = this.ray.intersectObject(mesh, false).length > 0;
            if (forwardHit || reverseHit) {
              this.lastHit = { asset: String(instance.userData.sourceAsset ?? ''), mesh: mesh.name };
              return true;
            }
          }
        }
      }
    }
    return false;
  }
}
