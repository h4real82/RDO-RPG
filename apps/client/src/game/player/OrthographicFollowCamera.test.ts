import { expect, it } from 'vitest';
import { OrthographicFollowCamera } from './OrthographicFollowCamera';

const player = { x: 5, y: 2, z: 10 };
const height = (c: OrthographicFollowCamera) => (c.camera.top - c.camera.bottom) / c.camera.zoom;
function settle(c: OrthographicFollowCamera) { for (let i = 0; i < 120; i++) c.update(player, 1 / 60); }

it('starts closer and smoothly clamps zoom to 12–90 world units, then resets', () => {
  const c = new OrthographicFollowCamera(2);
  expect(height(c)).toBe(36);
  c.adjustZoom(-10000);
  c.update(player, 1 / 60);
  expect(height(c)).toBeGreaterThan(12);
  expect(height(c)).toBeLessThan(36);
  settle(c);
  expect(height(c)).toBeCloseTo(12);
  c.adjustZoom(10000);
  settle(c);
  expect(height(c)).toBeCloseTo(90);
  c.resetZoom();
  settle(c);
  expect(height(c)).toBeCloseTo(36);
});

it('keeps the player centered and zoom stable through resizing and invalid input', () => {
  const c = new OrthographicFollowCamera(2);
  c.adjustZoom(-300);
  settle(c);
  const before = height(c);
  c.adjustZoom(NaN);
  c.adjustZoom(Infinity);
  c.resize(1);
  settle(c);
  expect(height(c)).toBeCloseTo(before);
  expect(c.camera.right - c.camera.left).toBe(c.camera.top - c.camera.bottom);
});

it('preserves the 90-unit reference framing and restores gameplay zoom afterward', () => {
  const c = new OrthographicFollowCamera(2);
  c.setReferencePose({ x: 10, y: 30, z: 10 }, player);
  c.adjustZoom(-300);
  settle(c);
  expect(height(c)).toBe(90);
  c.clearReferencePose();
  settle(c);
  expect(height(c)).toBeCloseTo(36);
});
