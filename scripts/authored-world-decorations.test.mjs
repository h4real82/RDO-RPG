import test from 'node:test';
import assert from 'node:assert/strict';
import {
  initDecorationMaterials,
  buildSteamTrain,
  buildStagecoach,
  buildFreightWagon,
  buildHitchedHorse,
  buildStreetDog,
  buildChicken
} from './authored-world-decorations.mjs';

function createMockContext(heightVal = 100) {
  const visualMeshes = [];
  const collisionBoxes = [];
  return {
    visualMeshes,
    collisionBoxes,
    height: (x, z) => heightVal,
    add: (key, geom, x, y, z, yaw) => {
      visualMeshes.push({ key, x, y, z, yaw, count: geom.attributes?.position?.count ?? 0 });
    },
    box: (key, x, y, z, w, h, d, yaw, coll) => {
      if (coll) {
        collisionBoxes.push({ key, x, y, z, w, h, d, yaw });
      } else {
        visualMeshes.push({ key, x, y, z, w, h, d, yaw });
      }
    },
    cylinder: (key, x, y, z, r, h, yaw) => {
      visualMeshes.push({ key, x, y, z, r, h, yaw });
    }
  };
}

test('buildSteamTrain produces locomotive, tender, coach with physics collision', () => {
  const ctx = createMockContext(115.5);
  const success = buildSteamTrain(ctx, { x: -171.0, z: -618.0, yaw: -0.635 });
  assert.equal(success, true);
  assert.ok(ctx.visualMeshes.length > 25, 'should create rich visual components');
  assert.equal(ctx.collisionBoxes.length, 3, 'locomotive, tender, and coach should each have collision boxes');
  // Verify locomotive collision coordinates
  const locoCol = ctx.collisionBoxes.find(c => Math.abs(c.x - -171.0) < 0.1);
  assert.ok(locoCol, 'locomotive collision box placed at target coordinate');
});

test('buildStagecoach creates wheels, cabin, luggage and collision', () => {
  const ctx = createMockContext(112.0);
  const success = buildStagecoach(ctx, { x: -303.0, z: -772.5, yaw: -0.12 });
  assert.equal(success, true);
  assert.ok(ctx.visualMeshes.length >= 15, 'stagecoach should have spoked wheels and body parts');
  assert.equal(ctx.collisionBoxes.length, 1, 'stagecoach should have a solid body collision box');
});

test('buildFreightWagon supports open cargo and covered prairie wagon', () => {
  const ctxOpen = createMockContext(112.0);
  const okOpen = buildFreightWagon(ctxOpen, { x: -247.5, z: -743.0, yaw: -0.38, covered: false });
  assert.equal(okOpen, true);
  assert.ok(ctxOpen.visualMeshes.some(m => m.key === 'barrel'), 'open wagon should carry barrels');

  const ctxCovered = createMockContext(112.0);
  const okCovered = buildFreightWagon(ctxCovered, { x: -316.5, z: -817.0, yaw: 2.98, covered: true });
  assert.equal(okCovered, true);
  assert.ok(ctxCovered.visualMeshes.some(m => m.key === 'cloth'), 'covered wagon should have canvas canopy');
});

test('buildHitchedHorse creates equestrian anatomy, saddle, bridle, and collision', () => {
  const ctx = createMockContext(114.0);
  const success = buildHitchedHorse(ctx, { x: -304.3, z: -785.6, yaw: 1.48, coat: 'chestnut' });
  assert.equal(success, true);
  assert.ok(ctx.visualMeshes.some(m => m.key === 'horseChestnut'), 'should use chestnut coat material');
  assert.ok(ctx.visualMeshes.some(m => m.key === 'leather'), 'should have leather saddle');
  assert.equal(ctx.collisionBoxes.length, 1, 'should have soft collision bounds');
});

test('buildStreetDog creates sleeping curled and sitting alert postures', () => {
  const ctxSleep = createMockContext(114.5);
  const okSleep = buildStreetDog(ctxSleep, { x: -306.8, z: -791.8, yaw: 0.85, pose: 'sleeping' });
  assert.equal(okSleep, true);
  assert.ok(ctxSleep.visualMeshes.length >= 4);

  const ctxSit = createMockContext(113.0);
  const okSit = buildStreetDog(ctxSit, { x: -324.5, z: -711.5, yaw: -1.35, pose: 'sitting' });
  assert.equal(okSit, true);
  assert.ok(ctxSit.visualMeshes.length >= 7);
});

test('buildChicken creates body, tail feathers, comb, wattle and beak', () => {
  const ctx = createMockContext(113.5);
  const success = buildChicken(ctx, { x: -271.2, z: -720.1, yaw: 0.8 });
  assert.equal(success, true);
  assert.ok(ctx.visualMeshes.some(m => m.key === 'comb'), 'should have red comb and wattle');
  assert.ok(ctx.visualMeshes.some(m => m.key === 'chicken'), 'should have feathered body');
});
