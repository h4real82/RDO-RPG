import { createAuthoredRoom } from './AuthoredBank';
import { BUILDINGS } from '../buildings/BuildingRegistry';

/** Simplified ground-floor pilot. No claim of original MLO/furniture fidelity.
 * Exterior anchor and extents are read from val_03_saloon_ext.glb. */
export const SALOON_GAMEPLAY = Object.freeze(BUILDINGS.byId.get('smithfields-saloon')!.floors[0].layout);

export function createAuthoredSaloon():ReturnType<typeof createAuthoredRoom> {
  return createAuthoredRoom(SALOON_GAMEPLAY);
}
