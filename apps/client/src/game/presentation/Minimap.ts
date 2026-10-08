import type { GameCoordinates } from '@rdo-rpg/world-contracts';

export interface MinimapPoint {
  x: number;
  y: number;
}

export class Minimap {
  project(position: GameCoordinates): MinimapPoint {
    return { x: position.x, y: position.z };
  }
}
