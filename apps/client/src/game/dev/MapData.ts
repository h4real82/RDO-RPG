import { Euler, Quaternion, type Vector3Like } from 'three';
import { getChunkId, type WorldPlacement } from '@rdo-rpg/world-contracts';

export type Category = 'terrain' | 'mud' | 'timber' | 'fence' | 'building';
export const palette: Record<Category, string> = {
  terrain: '#797855', mud: '#654735', timber: '#c39760', fence: '#a59069', building: '#b7a68d',
};

/** Visual tint only. Never used to invent dimensions, placement or passability. */
export function visualCategory(model: string, layer: string): Category {
  if (layer === 'terrain') return 'terrain';
  if (layer === 'roadsAndRails' || /_road_|_track/.test(model)) return 'mud';
  if (/fence|corral|pen_|rail/.test(model)) return 'fence';
  if (layer === 'boardwalks' || /boardwalk|porch|veranda/.test(model)) return 'timber';
  return 'building';
}

export function sourceCoordinates(world: Vector3Like): { x: number; y: number; z: number } {
  return { x: world.x, y: -world.z, z: world.y };
}

export interface RecoveredLandmark { placement: WorldPlacement; source: string; model: string; }

/** Same inverse CEntityDef and proper basis as rdo_pipeline.placements._rotation_xyz. */
export function recoveredLandmarks(payload: unknown): RecoveredLandmark[] {
  const report = payload as { coordinateSpace?: string; models?: unknown[] } | null;
  if (report?.coordinateSpace !== 'original-game-xyz' || !Array.isArray(report.models)) throw new Error('Invalid source recovery report');
  const vector = (value: unknown, count: number): number[] => {
    if (!Array.isArray(value) || value.length !== count || !value.every((v) => typeof v === 'number' && Number.isFinite(v))) throw new Error('Incomplete source transform');
    return value;
  };
  return report.models.flatMap((item) => {
    const model = item as { model?: string; status?: string; ambiguousEntities?: unknown[]; worldPlacements?: unknown[] };
    if (!model || !model.model || !/^[a-z0-9_]+$/.test(model.model) || model.status !== 'source-placement-found'
      || !Array.isArray(model.ambiguousEntities) || model.ambiguousEntities.length || !Array.isArray(model.worldPlacements)) throw new Error('Unverified landmark source');
    return model.worldPlacements.filter((record) => {
      const lod = (record as { lodLevel?: string })?.lodLevel;
      if (typeof lod !== 'string') throw new Error('Incomplete source LOD');
      return lod === 'LODTYPES_DEPTH_HD';
    }).map((record) => {
      const source = record as { position: unknown; rotation: unknown; scale: unknown; sourceFile: string; entityIndex: number };
      const [x, y, z] = vector(source.position, 3);
      const [qx, qy, qz, qw] = vector(source.rotation, 4);
      const [sx, sy, sz] = vector(source.scale, 3);
      if (Math.hypot(qx, qy, qz, qw) < 1e-10 || Math.min(sx, sy, sz) <= 0 || !source.sourceFile || !Number.isInteger(source.entityIndex)) throw new Error('Invalid source transform');
      const euler = new Euler().setFromQuaternion(new Quaternion(-qx, -qz, qy, qw).normalize(), 'XYZ');
      const name = model.model!;
      return { model: name, source: `${source.sourceFile}#${source.entityIndex}`, placement: {
        id: `recovered:${name}:${source.entityIndex}`, asset: `models/valentine/${name}.glb`,
        position: { x, y: z, z: -y }, rotation: { x: euler.x, y: euler.y, z: euler.z },
        scale: { x: sx, y: sz, z: sy }, layer: 'buildings', chunkId: getChunkId(x, -y), lod: 0, tags: ['exterior', 'source-recovered'],
      } };
    });
  });
}
