import type { WorldPlacement } from '@rdo-rpg/world-contracts';

/** Roles are independent: a source decal is neither a floor nor a wall. */
export function placementRoles(placement: Pick<WorldPlacement, 'layer' | 'tags'>, authoredCollision = false): {
  obstacle: boolean; occluder: boolean; support: boolean;
} {
  const tags = new Set(placement.tags ?? []);
  const detail = ['role:decal', 'role:emissive-detail', 'role:shadow-detail'].some((tag) => tags.has(tag));
  const terrain = placement.layer === 'terrain';
  return {
    obstacle: !terrain && !detail && !tags.has('collision:none') && !authoredCollision,
    occluder: !terrain && !detail && !tags.has('occlusion:none'),
    support: !detail && !tags.has('role:dressing') && (terrain || !authoredCollision),
  };
}
