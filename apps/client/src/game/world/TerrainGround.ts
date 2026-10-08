import { Box3, Group, Mesh, Raycaster, Vector3 } from 'three';

/** Height queries use only loaded, visible source terrain; gaps have no synthetic floor. */
export class TerrainGround {
  private readonly tiles = new Map<Group, { bounds: Box3; meshes: Mesh[] }>();
  private readonly ray = new Raycaster(new Vector3(), new Vector3(0, -1, 0));
  private cached?: { x: number; z: number; height: number | undefined };

  add(tile: Group): void {
    tile.updateWorldMatrix(true, true);
    const meshes: Mesh[] = [];
    const bounds = new Box3();
    tile.traverseVisible((object) => {
      if (object instanceof Mesh) {
        meshes.push(object);
        bounds.union(new Box3().setFromObject(object));
      }
    });
    this.tiles.set(tile, { bounds, meshes });
    this.cached = undefined;
  }

  remove(tile: Group): void {
    this.tiles.delete(tile);
    this.cached = undefined;
  }

  heightAt(x: number, z: number): number | undefined {
    if (this.cached?.x === x && this.cached.z === z) return this.cached.height;
    let height: number | undefined;
    for (const { bounds, meshes } of this.tiles.values()) {
      if (x < bounds.min.x || x > bounds.max.x || z < bounds.min.z || z > bounds.max.z) continue;
      this.ray.ray.origin.set(x, bounds.max.y + 1, z);
      this.ray.far = bounds.max.y - bounds.min.y + 2;
      const hit = this.ray.intersectObjects(meshes, false)[0];
      if (hit && (height === undefined || hit.point.y > height)) height = hit.point.y;
    }
    this.cached = { x, z, height };
    return height;
  }
}
