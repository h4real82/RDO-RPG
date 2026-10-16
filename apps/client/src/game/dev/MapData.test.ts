import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { recoveredLandmarks, sourceCoordinates, visualCategory } from './MapData';

const report = { coordinateSpace: 'original-game-xyz', models: [{
  model: 'val_01_trainstn_ext', status: 'source-placement-found', ambiguousEntities: [],
  worldPlacements: [{ sourceFile: 'station.xml', entityIndex: 22, lodLevel: 'LODTYPES_DEPTH_HD',
    position: [-177.0218, 633.8562, 119.26], rotation: [0, 0, 0, 1], scale: [1, 1, 1] }],
}] };

describe('source-backed inspector coordinates', () => {
  it('binds the real station in a right-handed basis without origin offsets', () => {
    const [entry] = recoveredLandmarks(report);
    expect(entry.placement.position).toEqual({ x: -177.0218, y: 119.26, z: -633.8562 });
    expect(entry.placement.scale).toEqual({ x: 1, y: 1, z: 1 });
    expect(sourceCoordinates(new Vector3(-177.0218, 119.26, -633.8562))).toEqual({ x: -177.0218, y: 633.8562, z: 119.26 });
    expect(entry.source).toBe('station.xml#22');
  });
  it('does not promote archetype-only or ambiguous evidence', () => {
    expect(() => recoveredLandmarks({ ...report, models: [{ ...report.models[0], status: 'archetype-only' }] })).toThrow();
    expect(() => recoveredLandmarks({ ...report, models: [{ ...report.models[0], ambiguousEntities: [{}] }] })).toThrow();
  });
  it('inverts the source quaternion and remaps nonuniform scale without reflection', () => {
    const entity = { ...report.models[0].worldPlacements[0], rotation: [0, 0, Math.SQRT1_2, Math.SQRT1_2], scale: [2, 3, 4] };
    const [entry] = recoveredLandmarks({ ...report, models: [{ ...report.models[0], worldPlacements: [entity] }] });
    expect(entry.placement.rotation.y).toBeCloseTo(-Math.PI / 2);
    expect(entry.placement.scale).toEqual({ x: 2, y: 4, z: 3 });
  });
  it('rejects invalid coordinate spaces and incomplete transforms', () => {
    expect(() => recoveredLandmarks({ ...report, coordinateSpace: 'leaflet' })).toThrow();
    expect(() => recoveredLandmarks({ ...report, models: [{ ...report.models[0], worldPlacements: [{ position: [1, 2] }] }] })).toThrow();
  });
  it('distinguishes only visual semantics, without changing geometry', () => {
    expect(visualCategory('val_03_road_d_05f', 'buildings')).toBe('mud');
    expect(visualCategory('source_fence', 'buildings')).toBe('fence');
    expect(visualCategory('source_model', 'terrain')).toBe('terrain');
  });
});
