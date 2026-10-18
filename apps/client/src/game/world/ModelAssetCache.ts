import { Group, Material, Mesh } from 'three';
import { disposeObjectResources } from './ResourceDisposer';

interface Entry { source: Promise<Group>; references: number; }

/** Static drawable leases: shared geometry/textures, independent occlusion materials. */
export class ModelAssetCache {
  private readonly entries = new Map<string, Entry>();

  constructor(private readonly load: (asset: string) => Promise<Group>) {}

  async acquire(asset: string): Promise<{ instance: Group; dispose(): void }> {
    let entry = this.entries.get(asset);
    if (!entry) {
      entry = { source: Promise.resolve().then(() => this.load(asset)), references: 0 };
      this.entries.set(asset, entry);
    }
    const owned = entry;
    owned.references += 1;
    let source: Group;
    try { source = await owned.source; }
    catch (error) {
      owned.references -= 1;
      if (owned.references === 0 && this.entries.get(asset) === owned) this.entries.delete(asset);
      throw error;
    }
    const instance = source.clone(true);
    const materials = new Set<Material>();
    const clone = (material: Material): Material => {
      // Source material reuse does not imply that separate meshes/slots occlude together.
      const result = material.clone();
      result.onBeforeCompile = material.onBeforeCompile;
      result.customProgramCacheKey = material.customProgramCacheKey;
      materials.add(result);
      return result;
    };
    instance.traverse((node) => {
      if (node instanceof Mesh) node.material = Array.isArray(node.material) ? node.material.map(clone) : clone(node.material);
    });
    let released = false;
    return { instance, dispose: () => {
      if (released) return;
      released = true;
      for (const material of materials) material.dispose();
      owned.references -= 1;
      if (owned.references === 0) {
        this.entries.delete(asset);
        disposeObjectResources(source);
      }
    } };
  }
}
