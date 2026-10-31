import { Group, Mesh, MeshStandardMaterial, RepeatWrapping, type Texture } from 'three';
import { applySourceModelVisibility } from './SourceModelVisibility';

export function prepareDrawableMaterialPreview(instance: Group): void {
  applySourceModelVisibility(instance);
  instance.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of materials) {
      // The converter preserves original shader masks, whose blend equation
      // is not represented by its explicitly labelled diffuse-only preview.
      if (material.vertexColors && material.userData.rdo_material_status !== undefined
        && (material.map || material.userData.rdo_shader_hash !== '0xe5d7af85')) {
        material.vertexColors = false;
        material.needsUpdate = true;
      }
      if (!material.map && material.color && (material.color.r > 0.85 && material.color.g > 0.85 && material.color.b > 0.85)) {
        material.color.set('#524235');
        material.roughness = 0.9;
      }
      if (material instanceof MeshStandardMaterial && material.map) {
        const texName = (material.map.name || (material.map as unknown as { source?: { data?: { name?: string } } }).source?.data?.name || material.name || '').toLowerCase();
        if (/woodporch|fl_woodplank|woodfloor_ends|cs_woodporch/i.test(texName)) {
          // Warm sun-bleached weathered pine/cedar for porches, stairs, and boardwalks (replaces charred/black appearance)
          material.color.setRGB(2.25, 2.0, 1.7);
          material.roughness = 0.85;
          material.userData.rdo_charred_wood_repaired = true;
        } else if (/roofs_shingle|tar_paper|metal_rooftrim|rooftrim/i.test(texName)) {
          // Weathered roof shingles and trim (replaces pitch-black charred roof look)
          material.color.setRGB(1.65, 1.55, 1.42);
          material.roughness = 0.9;
          material.userData.rdo_charred_wood_repaired = true;
        } else if (/be_wood01|be_wood06|be_wood30|wallwood62|woodplank32|wood_beampainted/i.test(texName)) {
          // Warm cedar railings, posts, awnings, and exterior wall planks
          material.color.setRGB(1.85, 1.65, 1.4);
          material.roughness = 0.88;
          material.userData.rdo_charred_wood_repaired = true;
        }
      }
      if (material.userData.rdo_alpha_mode === 'MASK') {
        material.alphaTest = 0.5; material.transparent = false;
      } else if (material.userData.rdo_alpha_mode === 'BLEND') {
        material.transparent = true; material.depthWrite = false;
      } else if (material.userData.rdo_alpha_mode === 'OPAQUE') {
        // Source alpha can encode grime/layer data, not a cutout mask. Guessing
        // alphaTest here erases opaque fence posts and building surfaces.
        material.alphaTest = 0; material.transparent = false; material.depthWrite = true;
      } else if (material.userData.rdo_material_status !== undefined && material.map && material.alphaTest === 0 && !material.transparent) {
        material.alphaTest = 0.5;
        material.needsUpdate = true;
      }
      for (const mapName of ['map', 'roughnessMap', 'metalnessMap', 'normalMap', 'alphaMap'] as const) {
        const tex = (material as unknown as Record<string, Texture | undefined>)[mapName];
        if (tex && typeof tex === 'object' && 'wrapS' in tex) {
          tex.wrapS = RepeatWrapping;
          tex.wrapT = RepeatWrapping;
          tex.needsUpdate = true;
        }
      }
      const isRoadOrDecal = material.userData.rdo_draw_bucket === 2 || (material.map && (material.name?.includes('road') || material.name?.includes('decal')));
      if (isRoadOrDecal) {
        material.transparent = true;
        material.depthWrite = false;
        material.polygonOffset = true;
        material.polygonOffsetFactor = -2;
        material.polygonOffsetUnits = -2;
        object.renderOrder = 3;
      }
      if (material.userData.rdo_draw_bucket === 2) {
        material.polygonOffset = true; material.polygonOffsetFactor = -2; material.polygonOffsetUnits = -2;
        object.renderOrder = 2;
        if (material.userData.rdo_decal_albedo_opacity === 0) {
          // The source explicitly writes no albedo. A forward diffuse pass
          // would paint white tire marks. Retain the geometry for source/debug
          // inspection; the native normal/roughness-only pass remains pending.
          material.colorWrite = false;
          material.depthWrite = false;
          material.userData.rdo_preview_limitation = 'normal-roughness-decal-pass-pending';
        }
      }
    }
  });
}
