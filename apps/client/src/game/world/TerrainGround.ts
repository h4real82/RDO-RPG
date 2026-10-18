import { Box3, Group, Matrix3, Mesh, Raycaster, Vector3, type Object3D } from 'three';
import { isPhysicalSourceMesh } from './SourceMeshRoles';

/** Samples actual source triangles. Structural floors are bounded by step height;
 * roof surfaces and missing terrain never become an invented walking plane. */
export class TerrainGround {
  private readonly tiles = new Map<Group, { bounds: Box3; meshes: Mesh[]; kind: 'terrain' | 'structure' }>();
  private readonly ray = new Raycaster(new Vector3(), new Vector3(0, -1, 0));
  private readonly normalMatrix = new Matrix3();
  private readonly normal = new Vector3();
  private cached?: { x: number; z: number; referenceY?: number; height: number | undefined };
  readonly maxStep = 0.45;
  readonly maxDrop = 1.5;
  private pickFilter:(group:Group)=>boolean=()=>true;

  setPickFilter(filter:(group:Group)=>boolean):void {this.pickFilter=filter;}

  add(tile: Group, kind: 'terrain' | 'structure' = 'terrain'): void {
    tile.updateWorldMatrix(true, true);
    const meshes: Mesh[] = [];
    const bounds = new Box3();
    tile.traverseVisible((object) => {
      if (object instanceof Mesh && (kind === 'terrain' || isPhysicalSourceMesh(object))) {
        meshes.push(object);
        bounds.union(new Box3().setFromObject(object));
      }
    });
    this.tiles.set(tile, { bounds, meshes, kind });
    this.cached = undefined;
  }

  remove(tile: Group): void {
    this.tiles.delete(tile);
    this.cached = undefined;
  }

  /** Only real upward-facing support triangles can receive a click destination. */
  pick(ray: Raycaster, referenceY: number, reachable?: (point: Vector3) => boolean): Vector3 | undefined {
    const visible=(object:Object3D):boolean=>{for(let current:Object3D|null=object;current;current=current.parent)if(!current.visible)return false;return true;};
    const meshes = Array.from(this.tiles.entries()).filter(([group])=>this.pickFilter(group)).flatMap(([,tile])=>tile.meshes).filter(visible);
    for (const hit of ray.intersectObjects(meshes, false)) {
      if (!hit.face || (!reachable && hit.point.y > referenceY + this.maxStep)) continue;
      this.normalMatrix.getNormalMatrix(hit.object.matrixWorld);
      this.normal.copy(hit.face.normal).applyMatrix3(this.normalMatrix).normalize();
      if (this.normal.y >= 0.65 && (!reachable || reachable(hit.point))) return hit.point.clone();
    }
    return undefined;
  }

  heightAt(x: number, z: number, referenceY?: number): number | undefined {
    if (![x, z].every(Number.isFinite) || (referenceY !== undefined && !Number.isFinite(referenceY))) return undefined;
    if (this.cached?.x === x && this.cached.z === z && this.cached.referenceY === referenceY) return this.cached.height;
    let height: number | undefined;
    for (const { bounds, meshes, kind } of this.tiles.values()) {
      if (kind === 'structure' && referenceY === undefined) continue;
      if (x < bounds.min.x || x > bounds.max.x || z < bounds.min.z || z > bounds.max.z) continue;
      const ceiling = referenceY === undefined ? bounds.max.y + 1 : referenceY + this.maxStep + 1e-5;
      const bottom = referenceY === undefined ? bounds.min.y - 1 : referenceY - this.maxDrop;
      if (bounds.min.y > ceiling || bounds.max.y < bottom) continue;
      this.ray.ray.origin.set(x, ceiling, z);
      this.ray.far = ceiling - bottom;
      for (const hit of this.ray.intersectObjects(meshes, false)) {
        if (!hit.face) continue;
        this.normalMatrix.getNormalMatrix(hit.object.matrixWorld);
        this.normal.copy(hit.face.normal).applyMatrix3(this.normalMatrix).normalize();
        // Source upward faces only: undersides and vertical walls are not floors.
        if (this.normal.y < 0.65) continue;
        if (height === undefined || hit.point.y > height) height = hit.point.y;
        break;
      }
    }
    this.cached = { x, z, referenceY, height };
    return height;
  }
}
