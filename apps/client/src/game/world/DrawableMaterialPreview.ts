import{Group,Mesh,RepeatWrapping,type Texture}from'three';

export function prepareDrawableMaterialPreview(instance: Group): void {
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

