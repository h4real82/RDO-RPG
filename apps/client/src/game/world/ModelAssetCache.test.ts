import { describe, expect, it } from 'vitest';
import { BoxGeometry, Group, Mesh, MeshStandardMaterial, Texture } from 'three';
import { ModelAssetCache } from './ModelAssetCache';

describe('ModelAssetCache', () => {
  it('shares geometry and textures across concurrent placements but isolates opacity', async () => {
    const source = new Group();
    const material = new MeshStandardMaterial({ map: new Texture() });
    source.add(new Mesh(new BoxGeometry(), material));
    let loads = 0;
    const cache = new ModelAssetCache(async () => { loads += 1; return source; });
    const [a, b] = await Promise.all([cache.acquire('building'), cache.acquire('building')]);
    const first = a.instance.children[0] as Mesh<BoxGeometry, MeshStandardMaterial>;
    const second = b.instance.children[0] as Mesh<BoxGeometry, MeshStandardMaterial>;
    expect(loads).toBe(1);
    expect(first.geometry).toBe(second.geometry);
    expect(first.material.map).toBe(second.material.map);
    first.material.opacity = 0.15;
    expect(second.material.opacity).toBe(1);
    let geometryDisposals = 0;
    let textureDisposals = 0;
    first.geometry.addEventListener('dispose', () => { geometryDisposals += 1; });
    material.map!.addEventListener('dispose', () => { textureDisposals += 1; });
    a.dispose();
    a.dispose();
    expect(geometryDisposals).toBe(0);
    b.dispose();
    expect(geometryDisposals).toBe(1);
    expect(textureDisposals).toBe(1);
  });

  it('retries a failed asset load instead of retaining a rejected promise', async () => {
    let attempts = 0;
    const cache = new ModelAssetCache(async () => {
      attempts += 1;
      if (attempts === 1) throw new Error('unavailable');
      return new Group();
    });
    await expect(cache.acquire('building')).rejects.toThrow('unavailable');
    const lease = await cache.acquire('building');
    expect(lease.instance).toBeInstanceOf(Group);
    lease.dispose();
  });

  it('preserves custom terrain shader hooks while isolating cloned materials', async () => {
    const source = new Group();
    const material = new MeshStandardMaterial();
    const hook = () => undefined;
    material.onBeforeCompile = hook;
    material.customProgramCacheKey = () => 'rdo-terrain-four-layer-v1';
    source.add(new Mesh(new BoxGeometry(), material));
    const cache = new ModelAssetCache(async () => source);

    const lease = await cache.acquire('terrain');
    const instance = lease.instance.children[0] as Mesh<BoxGeometry, MeshStandardMaterial>;

    expect(instance.material).not.toBe(material);
    expect(instance.material.onBeforeCompile).toBe(hook);
    expect(instance.material.customProgramCacheKey()).toBe('rdo-terrain-four-layer-v1');
    lease.dispose();
  });
});
