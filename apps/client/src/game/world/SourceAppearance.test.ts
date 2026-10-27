import { describe, expect, it } from 'vitest';
import { Color, Group, Mesh, MeshStandardMaterial, PlaneGeometry, RepeatWrapping, SRGBColorSpace, Texture } from 'three';
import { prepareSourceAppearance } from './SourceAppearance';

function source(hash = '0x435b4e43') {
  const material = new MeshStandardMaterial({ color: new Color(0.8, 0.8, 0.8), roughness: 0.5 });
  material.userData = { rdo_shader_hash: hash, rdo_material_status: 'unsupported-diffuse-binding' };
  const root = new Group(); root.add(new Mesh(new PlaneGeometry(), material));
  return { root, material };
}

describe('source appearance approximations', () => {
  it('uses the audited native ground layer while preserving original source status and texture ownership', async () => {
    const { root, material } = source();
    const texture = new Texture(); const urls: string[] = [];
    const result = await prepareSourceAppearance(root, {
      asset: 'models/valentine/l_09__hd_0_0_-2.glb',
      loadTexture: async (url) => { urls.push(url); return texture; },
    });
    expect(result.texturedMaterials).toBe(1);
    expect(urls).toEqual(['/runtime/valentine/verified-scene/textures/terrain/hea_val_dirt_pebbles_01_abte.png']);
    expect(material.map).not.toBe(texture);
    expect(material.map!.source).toBe(texture.source);
    expect(material.map!.repeat.toArray()).toEqual([128, 128]);
    expect(material.map!.offset.toArray()).toEqual([128, -127]);
    expect(material.map!.wrapS).toBe(RepeatWrapping);
    expect(material.map!.wrapT).toBe(RepeatWrapping);
    expect(material.map!.flipY).toBe(false);
    expect(material.map!.colorSpace).toBe(SRGBColorSpace);
    expect(texture.repeat.toArray()).toEqual([1, 1]);
    expect(material.color.toArray()).toEqual([1, 1, 1]);
    expect(material.roughness).toBe(1);
    expect(material.metalness).toBe(0);
    expect(material.userData.rdo_material_status).toBe('unsupported-diffuse-binding');
    expect(material.userData.rdo_shader_hash).toBe('0x435b4e43');
    expect(material.userData.rdo_appearance_provenance).toBe('authored-gameplay');
    expect(material.userData.rdo_appearance_preview).toBe('source-layer-0-only');
  });

  it.each(['l_09__hd_0_-3_1', 'l_09__hd_0_-3_0', 'l_09__hd_0_-2_1'])(
    'uses the exact audited gravel layer for %s without claiming the complete two-layer shader', async (name) => {
      const { root, material } = source('0x39dc7754'); const urls: string[] = [];
      await prepareSourceAppearance(root, { asset: `models/valentine/${name}.glb`, loadTexture: async (url) => {
        urls.push(url); return new Texture();
      } });
      expect(urls[0]).toContain('rr_template_hea_05a_gravel_moss_abte.png');
      expect(material.userData.rdo_appearance_role).toBe('railway-ground');
      expect(material.userData.rdo_appearance_preview).toBe('source-layer-1-only');
    },
  );

  it('requires matching audited tile, shader, unresolved status and source UVs', async () => {
    let loads = 0;
    for (const [asset, hash, status, uv] of [
      ['l_09__hd_0_9_9', '0x435b4e43', 'unsupported-diffuse-binding', true],
      ['l_09__hd_0_0_-2', '0x39dc7754', 'unsupported-diffuse-binding', true],
      ['l_09__hd_0_0_-2', '0x435b4e43', 'terrain-four-layer-preview', true],
      ['l_09__hd_0_0_-2', '0x435b4e43', 'unsupported-diffuse-binding', false],
      ['building', '0x435b4e43', 'unsupported-diffuse-binding', true],
    ] as const) {
      const { root, material } = source(hash); material.userData.rdo_material_status = status;
      if (!uv) (root.children[0] as Mesh).geometry.deleteAttribute('uv');
      const before = material.color.clone();
      await prepareSourceAppearance(root, { asset: `models/valentine/${asset}.glb`, loadTexture: async () => {
        loads++; return new Texture();
      } });
      expect(material.map).toBeNull(); expect(material.color).toEqual(before);
      expect(material.userData.rdo_appearance_provenance).toBeUndefined();
    }
    expect(loads).toBe(0);
  });

  it('preserves already textured original albedo and other material settings', async () => {
    const { root, material } = source(); const original = new Texture(); material.map = original;
    material.color.setRGB(0.2, 0.3, 0.4); material.roughness = 0.7; material.opacity = 0.4;
    await prepareSourceAppearance(root, { asset: 'models/valentine/l_09__hd_0_0_-2.glb',
      loadTexture: async () => { throw new Error('must not load'); } });
    expect(material.map).toBe(original); expect(material.color.toArray()).toEqual([0.2, 0.3, 0.4]);
    expect(material.roughness).toBe(0.7); expect(material.opacity).toBe(0.4);
  });

  it('uses an explicitly authored ground color when the optional native texture cannot load', async () => {
    const { root, material } = source('0x39dc7754');
    const result = await prepareSourceAppearance(root, { asset: 'models/valentine/l_09__hd_0_-3_1.glb',
      loadTexture: async () => { throw new Error('missing preview texture'); } });
    expect(result.colorMaterials).toBe(1); expect(result.textureFailures).toBe(1);
    expect(material.map).toBeNull();
    expect(material.color.r).toBeLessThan(0.3);
    expect(material.userData.rdo_appearance_preview).toBe('authored-ground-color');
    expect(material.userData.rdo_appearance_limitation).toContain('texture-unavailable');
    expect(material.userData.rdo_material_status).toBe('unsupported-diffuse-binding');
  });

  it('processes shared material only once and remains idempotent', async () => {
    const { root, material } = source(); root.add(new Mesh(new PlaneGeometry(), material));
    let loads = 0;
    const options = { asset: 'models/valentine/l_09__hd_0_-1_-1.glb', loadTexture: async () => {
      loads++; return new Texture();
    } };
    await prepareSourceAppearance(root, options); const map = material.map;
    await prepareSourceAppearance(root, options);
    expect(loads).toBe(1); expect(material.map).toBe(map);
  });
});
