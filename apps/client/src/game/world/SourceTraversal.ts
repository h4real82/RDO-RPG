import type { PlayerPosition } from '../player/PlayerController';
import { TerrainGround } from './TerrainGround';
import { VisibleMeshCollision } from './VisibleMeshCollision';
import type { BoundaryPoint } from '@rdo-rpg/world-contracts';

/** Resolve against actual source surfaces, checking the complete movement span. */
export class SourceTraversal {
  blockedReason: 'terrain' | 'obstacle' | 'boundary' | undefined;

  constructor(private readonly ground: TerrainGround, private readonly collision: VisibleMeshCollision,
    private readonly boundary?: { allowsMove(from: BoundaryPoint, to: BoundaryPoint): boolean }) {}

  resolve(from: PlayerPosition, candidate: PlayerPosition): boolean {
    this.blockedReason = undefined;
    if (this.boundary && !this.boundary.allowsMove(from, candidate)) {
      this.blockedReason = 'boundary'; return false;
    }
    if (![from.x, from.y, from.z, candidate.x, candidate.z].every(Number.isFinite)) {
      this.blockedReason = 'terrain';
      return false;
    }
    const dx = candidate.x - from.x, dz = candidate.z - from.z;
    const count = Math.max(1, Math.ceil(Math.hypot(dx, dz) / 0.15));
    let previous = { ...from };
    for (let index = 1; index <= count; index++) {
      const next = { x: from.x + dx * index / count, y: previous.y, z: from.z + dz * index / count };
      const height = this.ground.heightAt(next.x, next.z, previous.y);
      if (height === undefined) { this.blockedReason = 'terrain'; return false; }
      next.y = height;
      if (this.collision.blocksTransition(previous, next)) { this.blockedReason = 'obstacle'; return false; }
      previous = next;
    }
    candidate.y = previous.y;
    return true;
  }
}
