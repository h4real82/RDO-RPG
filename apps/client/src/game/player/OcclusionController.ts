import { type Material, type Object3D, type Raycaster } from 'three';

interface MaterialState {
  opacity: number;
  transparent: boolean;
  depthWrite: boolean;
}

export class OcclusionController {
  private readonly active = new Map<Material, MaterialState>();

  constructor(private readonly occluders: readonly Object3D[]) {}

  update(ray: Raycaster): void {
    const visible = new Set<Material>();
    try {
      for (const intersection of ray.intersectObjects([...this.occluders], true)) {
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
