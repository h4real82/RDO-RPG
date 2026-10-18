import { describe, expect, it } from 'vitest';
import { BoxGeometry, Group, Mesh, MeshStandardMaterial, Texture } from 'three';
import { ModelAssetCache } from './ModelAssetCache';
import { Raycaster, Vector3 } from 'three';
import { OcclusionController } from '../player/OcclusionController';

describe('ModelAssetCache', () => {
  it('keeps an unhit floor opaque when its roof reuses the same source material', async () => {
    const source = new Group(), shared = new MeshStandardMaterial({ map: new Texture(), alphaTest: 0.4 });
    const roof = new Mesh(new BoxGeometry(1, 1, 1), shared), floor = new Mesh(new BoxGeometry(1, 1, 1), shared);
    floor.position.x = 5; source.add(roof, floor);
    const cache = new ModelAssetCache(async () => source);
    const lease = await cache.acquire('house'); lease.instance.updateWorldMatrix(true, true);
    const [a, b] = lease.instance.children as Mesh<BoxGeometry, MeshStandardMaterial>[];
    const occlusion = new OcclusionController([lease.instance]);
    const ray = new Raycaster(new Vector3(0, 0, 2), new Vector3(0, 0, -1), 0, 4);
    for (let i = 0; i < 30; i++) occlusion.update(ray);
    expect(a.material.opacity).toBeCloseTo(0.15, 3);
    expect(b.material.opacity).toBe(1);
    expect(b.material.depthWrite).toBe(true);
    expect(shared.opacity).toBe(1);
    expect(a.material.map).toBe(b.material.map);
    let disposed = 0;
    for (const m of [a.material, b.material]) m.addEventListener('dispose', () => { disposed++; });
    occlusion.dispose(); lease.dispose(); lease.dispose();
    expect(disposed).toBe(2);
  });
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
