import { Mesh, MeshStandardMaterial, RepeatWrapping, SRGBColorSpace, type Object3D, type Texture } from 'three';
import { sceneAssetUrl } from './SceneSource';
import {applyMaterialSubstitutions} from './MaterialSubstitutions';
import {repairWhiteSourceSurfaces} from './AuthoredSurfaceRepair';

export interface SourceAppearanceOptions {
  asset: string;
  loadTexture?: (url: string) => Promise<Texture>;
}

interface GroundPreview {
  shader: string;
  texture: string;
  layer: 0 | 1;
  role: 'mixed-ground' | 'railway-ground';
  color: number;
}

// Exact source bindings and UV parameters were audited for these five tiles.
// A shader hash alone cannot identify which textures another material uses.
// See docs/planning/Valentine-Source-Expansion-Audit-2026-10-19.md.
const MIXED_GROUND: GroundPreview = {
  shader: '0x435b4e43', texture: 'hea_val_dirt_pebbles_01_abte.png', layer: 0,
  role: 'mixed-ground', color: 0x746650,
};
const RAILWAY_GROUND: GroundPreview = {
  shader: '0x39dc7754', texture: 'rr_template_hea_05a_gravel_moss_abte.png', layer: 1,
  role: 'railway-ground', color: 0x6e6a58,
};
const AUDITED_GROUND = new Map<string, GroundPreview>([
  ['models/valentine/l_09__hd_0_0_-2.glb', MIXED_GROUND],
  ['models/valentine/l_09__hd_0_-1_-1.glb', MIXED_GROUND],
  ['models/valentine/l_09__hd_0_-3_1.glb', RAILWAY_GROUND],
  ['models/valentine/l_09__hd_0_-3_0.glb', RAILWAY_GROUND],
  ['models/valentine/l_09__hd_0_-2_1.glb', RAILWAY_GROUND],
]);

/** Authored single-source-layer approximation; original multi-layer shaders remain unsupported.
 * Prepare the cached source once before instance cloning. Existing albedo maps are preserved.
 */
export async function prepareSourceAppearance(root: Object3D, options: SourceAppearanceOptions): Promise<{
  texturedMaterials: number; colorMaterials: number; textureFailures: number;
}> {
  const result = { texturedMaterials: 0, colorMaterials: 0, textureFailures: 0 };
  result.texturedMaterials=applyMaterialSubstitutions(root,options.asset)+repairWhiteSourceSurfaces(root);
  const profile = AUDITED_GROUND.get(options.asset);
  if (!profile) return result;
  const materials = new Set<MeshStandardMaterial>();
  root.traverse((object) => {
    if (!(object instanceof Mesh) || !object.geometry?.getAttribute('uv')) return;
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      if (material instanceof MeshStandardMaterial && !material.map
        && material.userData.rdo_shader_hash === profile.shader
        && material.userData.rdo_material_status === 'unsupported-diffuse-binding'
        && !material.userData.rdo_appearance_provenance) materials.add(material);
    }
  });
  await Promise.all([...materials].map(async (material) => {
    let texture: Texture | undefined;
    if (options.loadTexture) {
      try {
        // Clone sampler state; callers may cache/share the loaded source texture.
        texture = (await options.loadTexture(sceneAssetUrl(`textures/terrain/${profile.texture}`))).clone();
        texture.wrapS = texture.wrapT = RepeatWrapping;
        texture.flipY = false;
        texture.colorSpace = SRGBColorSpace;
        texture.channel = 0;
        // Both selected source layers use UV set 1 and (128,128,128,0).
        // Conjugate V through glTF's flipped texture-coordinate basis.
        texture.repeat.set(128, 128);
        texture.offset.set(128, -127);
        texture.needsUpdate = true;
      } catch {
        result.textureFailures++;
      }
    }
    material.map = texture ?? null;
    material.color.set(texture ? 0xffffff : profile.color);
    material.roughness = 1;
    material.metalness = 0;
    // Source colors are terrain blend controls, not multiply-albedo tint.
    material.vertexColors = false;
    Object.assign(material.userData, {
      rdo_appearance_provenance: 'authored-gameplay',
      rdo_appearance_role: profile.role,
      rdo_appearance_preview: texture ? `source-layer-${profile.layer}-only` : 'authored-ground-color',
      rdo_appearance_source_texture: profile.texture,
      rdo_appearance_limitation: texture
        ? 'single-native-layer-selection;original-blending-pxm-height-normal-tint-pending'
        : 'texture-unavailable;authored-ground-color;original-shader-pending',
    });
    material.needsUpdate = true;
    if (texture) result.texturedMaterials++;
    else result.colorMaterials++;
  }));
  return result;
}
