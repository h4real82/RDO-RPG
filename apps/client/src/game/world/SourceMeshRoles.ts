import type { Mesh } from 'three';

/** Original source shader roles are evaluated per submesh, never per building box. */
export function isPhysicalSourceMesh(mesh: Mesh): boolean {
  const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  return materials.some((material) => material.userData.rdo_draw_bucket !== 2
    && material.userData.rdo_shader_hash !== '0x00b1ecac');
}
