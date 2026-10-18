import { Box3, Group, Mesh, Raycaster, Triangle, Vector3 } from 'three';
import { Capsule } from 'three/examples/jsm/math/Capsule.js';
import { Octree } from 'three/examples/jsm/math/Octree.js';
import { isPhysicalSourceMesh } from './SourceMeshRoles';

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
      if (!(object instanceof Mesh) || !isPhysicalSourceMesh(object)) return;
      const meshBounds = new Box3().setFromObject(object);
      if (meshBounds.isEmpty()) return;
      meshes.push({ mesh: object, bounds: meshBounds });
      bounds.union(meshBounds);
    });
    this.candidates.set(instance, { bounds, meshes });
  }

  remove(instance: Group): void { this.candidates.delete(instance); }

  /** Stationary recovery validation. Bounds only reject distant meshes; triangles decide contact. */
  overlapsBody(position: Position): boolean {
    this.lastHit = undefined;
    if (![position.x, position.y, position.z].every(Number.isFinite)) return true;
    // Match the existing walking body's clearance interval, leaving the supporting floor below it.
    const capsule = new Capsule(new Vector3(position.x, position.y + 0.6, position.z),
      new Vector3(position.x, position.y + 1.3, position.z), 0.25);
    const bodyBounds = new Box3(new Vector3(position.x - 0.25, position.y + 0.35, position.z - 0.25),
      new Vector3(position.x + 0.25, position.y + 1.55, position.z + 0.25));
    const tester = new Octree(), triangle = new Triangle(), reverse = new Triangle();
    for (const [instance, { bounds, meshes }] of this.candidates) {
      if (!bodyBounds.intersectsBox(bounds)) continue;
      for (const { mesh, bounds: part } of meshes) {
        if (!bodyBounds.intersectsBox(part)) continue;
        const positions = mesh.geometry.getAttribute('position'), indices = mesh.geometry.index;
        if (!positions) continue;
        const count = indices?.count ?? positions.count;
        const start = mesh.geometry.drawRange.start;
        const end = Math.min(count, start + mesh.geometry.drawRange.count);
        for (let offset = start; offset + 2 < end; offset += 3) {
          if (Array.isArray(mesh.material)) {
            const group = mesh.geometry.groups.find(g => offset >= g.start && offset < g.start + g.count);
            const material = mesh.material[group?.materialIndex ?? 0];
            if (!material || material.userData.rdo_draw_bucket === 2 || material.userData.rdo_shader_hash === '0x00b1ecac') continue;
          }
          triangle.a.fromBufferAttribute(positions, indices ? indices.getX(offset) : offset).applyMatrix4(mesh.matrixWorld);
          triangle.b.fromBufferAttribute(positions, indices ? indices.getX(offset + 1) : offset + 1).applyMatrix4(mesh.matrixWorld);
          triangle.c.fromBufferAttribute(positions, indices ? indices.getX(offset + 2) : offset + 2).applyMatrix4(mesh.matrixWorld);
          if (!bodyBounds.intersectsTriangle(triangle)) continue;
          // The imported render side is not a physical permission to occupy the back of a wall.
          reverse.set(triangle.c, triangle.b, triangle.a);
          const hit = tester.triangleCapsuleIntersect(capsule, triangle) || tester.triangleCapsuleIntersect(capsule, reverse);
          if (hit && hit.depth > 1e-5) {
            this.lastHit = { asset: String(instance.userData.sourceAsset ?? ''), mesh: mesh.name };
            return true;
          }
        }
      }
    }
    return false;
  }

  blocksTransition(from: Position, to: Position): boolean {
    this.lastHit = undefined;
    const dx = to.x - from.x, dy = to.y - from.y, dz = to.z - from.z;
    const horizontalLength = Math.hypot(dx, dz), length = Math.hypot(dx, dy, dz);
    if (!Number.isFinite(length) || horizontalLength < 1e-8) return false;
    // Sweep the body along the resolved height transition too. Horizontal rays
    // at only the starting height miss low walls when descending from a ledge.
    const direction = new Vector3(dx / length, dy / length, dz / length);
    const sideX = -dz / horizontalLength * 0.25, sideZ = dx / horizontalLength * 0.25;
    this.ray.far = length;
    for (const [instance, { bounds, meshes }] of this.candidates) {
      if (bounds.max.y < Math.min(from.y, to.y) + 0.35 || bounds.min.y > Math.max(from.y, to.y) + 1.55) continue;
      if (Math.max(from.x, to.x) + 0.25 < bounds.min.x || Math.min(from.x, to.x) - 0.25 > bounds.max.x
        || Math.max(from.z, to.z) + 0.25 < bounds.min.z || Math.min(from.z, to.z) - 0.25 > bounds.max.z) continue;
      for (const { mesh, bounds: part } of meshes) {
        if (part.max.y < Math.min(from.y, to.y) + 0.35 || part.min.y > Math.max(from.y, to.y) + 1.55) continue;
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
