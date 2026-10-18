import { Box3, Mesh, Raycaster, Vector3, type Material, type Object3D } from 'three';
import { isPhysicalSourceMesh } from '../world/SourceMeshRoles';

interface MaterialState {
  opacity: number;
  transparent: boolean;
  depthWrite: boolean;
  alphaTest: number;
}

export class OcclusionController {
  private readonly active = new Map<Material, MaterialState>();
  private readonly bounds = new WeakMap<Object3D, Box3>();
  private readonly hitPoint = new Vector3();
  private readonly proximityRay = new Raycaster();
  private readonly directions = Array.from({length:8},(_,index)=>new Vector3(Math.cos(index*Math.PI/4),0,Math.sin(index*Math.PI/4)));

  constructor(private readonly occluders: readonly Object3D[]) {}

  update(ray: Raycaster, playerPosition?: Vector3, deltaSeconds = 1 / 60): void {
    if (!Number.isFinite(deltaSeconds) || deltaSeconds <= 0) return;
    const visible = new Set<Material>();
    try {
      this.collectMaterials(ray,visible);
      if (playerPosition && [playerPosition.x,playerPosition.y,playerPosition.z].every(Number.isFinite)) {
        this.proximityRay.far = 1.5;
        for (const height of [0.4,1.4]) {
          this.proximityRay.ray.origin.copy(playerPosition);
          this.proximityRay.ray.origin.y += height;
          for (const direction of this.directions) {
            this.proximityRay.ray.direction.copy(direction);
            this.collectMaterials(this.proximityRay,visible);
          }
        }
      }
    } catch (error) {
      console.error('Could not evaluate camera occlusion.', error);
    }

    const blend = 1 - Math.exp(-26 * Math.min(deltaSeconds,0.5));
    for (const [material, state] of this.active) {
      if (visible.has(material)) continue;
      material.opacity += (state.opacity - material.opacity) * blend;
      material.alphaTest = state.opacity > 0 ? state.alphaTest * material.opacity / state.opacity : state.alphaTest;
      if (Math.abs(state.opacity - material.opacity) > 0.001) continue;
      material.opacity = state.opacity;
      material.transparent = state.transparent;
      material.depthWrite = state.depthWrite;
      material.alphaTest = state.alphaTest;
      material.needsUpdate = true;
      this.active.delete(material);
    }
    for (const material of visible) {
      if (!this.active.has(material)) {
        this.active.set(material, { opacity: material.opacity, transparent: material.transparent, depthWrite: material.depthWrite, alphaTest: material.alphaTest });
        if (!material.transparent || material.depthWrite) material.needsUpdate = true;
      }
      material.opacity += (0.15 - material.opacity) * blend;
      if (Math.abs(material.opacity - 0.15) < 0.001) material.opacity = 0.15;
      const original = this.active.get(material)!;
      material.alphaTest = original.opacity > 0 ? original.alphaTest * material.opacity / original.opacity : original.alphaTest;
      material.transparent = true;
      material.depthWrite = false;
    }
  }

  private collectMaterials(ray:Raycaster,visible:Set<Material>):void {
      const meshes:Mesh[]=[];
      const nearby = this.occluders.filter((object) => {
        let box = this.bounds.get(object);
        if (!box) {
          box = new Box3().setFromObject(object);
          this.bounds.set(object, box);
        }
        if (box.isEmpty()) return false;
        if (box.containsPoint(ray.ray.origin)) return true;
        const point = ray.ray.intersectBox(box, this.hitPoint);
        return point !== null && ray.ray.origin.distanceToSquared(point) <= ray.far * ray.far;
      });
      for (const object of nearby) object.traverseVisible(node=>{
        if(node instanceof Mesh && isPhysicalSourceMesh(node)) meshes.push(node);
      });
      for (const intersection of ray.intersectObjects(meshes, false)) {
        if (intersection.object instanceof Mesh && !isPhysicalSourceMesh(intersection.object)) continue;
        let node: Object3D | null = intersection.object;
        let rendered = true;
        while (node) {
          if (!node.visible) { rendered = false; break; }
          node = node.parent;
        }
        if (!rendered) continue;
        const material = (intersection.object as Object3D & { material?: Material | Material[] }).material;
        const candidate = Array.isArray(material) ? material[intersection.face?.materialIndex ?? 0] : material;
        if (candidate && candidate.userData.rdo_draw_bucket !== 2 && candidate.userData.rdo_shader_hash !== '0x00b1ecac') visible.add(candidate);
      }
  }

  /** Copied source/material diagnostics; callers cannot change live material references. */
  getState() {
    return this.occluders.map(object => {
      const box = new Box3().setFromObject(object);
      const materials: { mesh: string; meshId: string; slot: number; materialId: string; active: boolean;
        opacity: number; transparent: boolean; depthWrite: boolean; alphaTest: number; originalOpacity: number }[] = [];
      object.traverseVisible(node => {
        if (!(node instanceof Mesh)) return;
        const slots = Array.isArray(node.material) ? node.material : [node.material];
        slots.forEach((material, slot) => materials.push({ mesh: node.name, meshId: node.uuid, slot,
          materialId: material.uuid, active: this.active.has(material), opacity: material.opacity,
          transparent: material.transparent, depthWrite: material.depthWrite, alphaTest: material.alphaTest,
          originalOpacity: this.active.get(material)?.opacity ?? material.opacity }));
      });
      return { asset: String(object.userData.sourceAsset ?? ''), placementId: String(object.userData.placementId ?? ''),
        bounds: { min: { ...box.min }, max: { ...box.max } }, materials };
    });
  }

  dispose(): void {
    for (const [material, state] of this.active) {
      material.opacity = state.opacity;
      material.transparent = state.transparent;
      material.depthWrite = state.depthWrite;
      material.alphaTest = state.alphaTest;
      material.needsUpdate = true;
    }
    this.active.clear();
  }
}
