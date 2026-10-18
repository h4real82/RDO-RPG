import { Mesh, type Vector3 } from 'three';
import type { WorldPlacement } from '@rdo-rpg/world-contracts';
import { sourceCoordinates } from './MapData';
import { placementRoles } from '../world/PlacementRoles';

export function describeSelection(placement: WorldPlacement, mesh: Mesh, point: Vector3, sources: unknown[] = []) {
  const materials = (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).map((material) => ({
    name: material.name,
    shaderHash: material.userData.rdo_shader_hash ?? null,
    status: material.userData.rdo_material_status ?? 'unmarked',
    opacity: material.opacity,
    depthWrite: material.depthWrite,
    colorWrite: material.colorWrite,
    originalTexture: material.userData.rdo_original_diffuse_name ?? null,
    fallbackSource: material.userData.rdo_fallback_source_uri ?? null,
    limitation: material.userData.rdo_preview_limitation ?? null,
  }));
  return {
    id: placement.id, asset: placement.asset, mesh: mesh.name, chunkId: placement.chunkId,
    threePoint: { x: point.x, y: point.y, z: point.z }, gamePoint: sourceCoordinates(point),
    placement: { position: placement.position, rotation: placement.rotation, scale: placement.scale },
    tags: placement.tags ?? [], roles: placementRoles(placement), materials, sources,
  };
}

export type MapSelection = ReturnType<typeof describeSelection>;
