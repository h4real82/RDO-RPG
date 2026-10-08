import { Box3, Vector3, type Material, type Object3D, type Raycaster } from 'three';

interface MaterialState {
  opacity: number;
  transparent: boolean;
  depthWrite: boolean;
}

export class OcclusionController {
  private readonly active = new Map<Material, MaterialState>();
  private readonly bounds = new WeakMap<Object3D, Box3>();
  private readonly hitPoint = new Vector3();

  constructor(private readonly occluders: readonly Object3D[]) {}

  update(ray: Raycaster): void {
    const visible = new Set<Material>();
    try {
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
      for (const intersection of ray.intersectObjects(nearby, true)) {
        let node: Object3D | null = intersection.object;
        let rendered = true;
        while (node) {
          if (!node.visible) { rendered = false; break; }
          node = node.parent;
        }
        if (!rendered) continue;
        const material = (intersection.object as Object3D & { material?: Material | Material[] }).material;
        for (const candidate of Array.isArray(material) ? material : [material]) {
          if (candidate) visible.add(candidate);
        }
      }
    } catch (error) {
      console.error('Could not evaluate camera occlusion.', error);
    }

    for (const [material, state] of this.active) {
      if (visible.has(material)) continue;
      material.opacity += (state.opacity - material.opacity) * 0.35;
      if (Math.abs(state.opacity - material.opacity) > 0.001) continue;
      material.opacity = state.opacity;
      material.transparent = state.transparent;
      material.depthWrite = state.depthWrite;
      material.needsUpdate = true;
      this.active.delete(material);
    }
    for (const material of visible) {
      if (!this.active.has(material)) this.active.set(material, { opacity: material.opacity, transparent: material.transparent, depthWrite: material.depthWrite });
      material.opacity += (0.15 - material.opacity) * 0.35;
      material.transparent = true;
      material.depthWrite = false;
      material.needsUpdate = true;
    }
  }

  dispose(): void {
    for (const [material, state] of this.active) {
      material.opacity = state.opacity;
      material.transparent = state.transparent;
      material.depthWrite = state.depthWrite;
      material.needsUpdate = true;
    }
    this.active.clear();
  }
}
