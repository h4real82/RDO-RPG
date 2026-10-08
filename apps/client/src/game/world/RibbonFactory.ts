import { BufferGeometry, Float32BufferAttribute, type Vector3Like } from 'three';
import { WORLD_LAYERS, type WorldLayer } from '@rdo-rpg/world-contracts';

export function createRibbon(points: readonly Vector3Like[], layer: WorldLayer, width: number): BufferGeometry {
  if (points.length < 2) throw new Error('A ribbon requires at least two manifest points.');
  if (!Number.isFinite(width) || width <= 0) throw new Error('Ribbon width must be a positive finite value.');

  const halfWidth = width / 2;
  const positions: number[] = [];
  const indices: number[] = [];
  const y = WORLD_LAYERS[layer];
  for (let index = 0; index < points.length; index += 1) {
    const point = points[index];
    const before = points[Math.max(0, index - 1)];
    const after = points[Math.min(points.length - 1, index + 1)];
    const dx = after.x - before.x;
    const dz = after.z - before.z;
    const length = Math.hypot(dx, dz);
    if (length === 0) throw new Error('Ribbon points must not overlap.');
    const nx = -dz / length * halfWidth;
    const nz = dx / length * halfWidth;
    positions.push(point.x + nx, y, point.z + nz, point.x - nx, y, point.z - nz);
    if (index > 0) {
      const base = (index - 1) * 2;
      indices.push(base, base + 2, base + 1, base + 1, base + 2, base + 3);
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}
