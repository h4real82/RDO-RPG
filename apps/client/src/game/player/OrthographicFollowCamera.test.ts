import { expect, it } from 'vitest';
import { Vector3 } from 'three';
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

it('projects an overhead map north-up without shifting elevated roof outlines', () => {
  const c = new OrthographicFollowCamera(2);
  c.setReferencePose({ x: 5, y: 402, z: 10 }, player, 100);
  c.update(player);
  const ground = new Vector3(5, 2, 10).project(c.camera);
  const roof = new Vector3(5, 32, 10).project(c.camera);
  const north = new Vector3(5, 2, 0).project(c.camera);
  const east = new Vector3(15, 2, 10).project(c.camera);
  expect(roof.x).toBeCloseTo(ground.x, 12);
  expect(roof.y).toBeCloseTo(ground.y, 12);
  expect(north.y).toBeGreaterThan(ground.y);
  expect(east.x).toBeGreaterThan(ground.x);
});

it('rotates the follow offset and movement basis together, keeping screen-forward aligned', () => {
  const c = new OrthographicFollowCamera(2);
  c.rotate(Math.PI / 2);
  c.update(player);
  expect(c.camera.position.x - player.x).toBeCloseTo(18);
  expect(c.camera.position.z - player.z).toBeCloseTo(0);
  expect(c.getMovement(1, 0).right).toBeCloseTo(-1);
  expect(c.getMovement(1, 0).forward).toBeCloseTo(0);
  expect(c.getMovement(0, 1).forward).toBeCloseTo(1);
  const diagonal = c.getMovement(1, 1);
  expect(Math.hypot(diagonal.forward, diagonal.right)).toBeCloseTo(1);
  const ahead = new Vector3(player.x - 2, player.y, player.z).project(c.camera);
  expect(ahead.y).toBeGreaterThan(0);
  expect(ahead.x).toBeCloseTo(0);
});

it('ignores rotation during reference framing and resets gameplay yaw separately from zoom', () => {
  const c = new OrthographicFollowCamera(2);
  c.rotate(Math.PI / 2);
  c.setReferencePose({ x: 5, y: 402, z: 10 }, player);
  c.rotate(Math.PI / 2);
  c.update(player);
  expect(c.camera.position.toArray()).toEqual([5, 402, 10]);
  c.clearReferencePose();
  c.resetZoom();
  c.update(player);
  expect(c.camera.position.x - player.x).toBeCloseTo(18);
  c.resetView();
  c.rotate(NaN);
  c.rotate(Infinity);
  c.update(player);
  expect(c.camera.position.x).toBeCloseTo(player.x);
  expect(c.camera.position.z - player.z).toBeCloseTo(18);
});

it('keeps the full active floor within frame at varied yaw/aspect and honors reduced motion/reference framing',()=>{
  for(const aspect of [.5,1.6])for(const yaw of [0,.7,1.57,3.14]){
    const camera=new OrthographicFollowCamera(aspect);camera.rotate(yaw);
    const width=14.2,depth=22,fit=Math.max((.8*(Math.abs(width*Math.sin(yaw))+Math.abs(depth*Math.cos(yaw)))+1.8)/.84,
      (Math.abs(width*Math.cos(yaw))+Math.abs(depth*Math.sin(yaw)))/(aspect*.84));
    camera.setContextGoal({target:{x:0,y:.6,z:0},visibleHeight:fit,contain:true},true);
    camera.adjustZoom(-10000);camera.update({x:0,y:0,z:0},.001);
    for(const x of [-width/2,width/2])for(const z of [-depth/2,depth/2]){
      const projected=new Vector3(x,0,z).project(camera.camera);expect(Math.abs(projected.x)).toBeLessThan(.9);expect(Math.abs(projected.y)).toBeLessThan(.9);
    }
    expect(height(camera)).toBeCloseTo(fit);
    camera.setReferencePose({x:0,y:400,z:0},{x:0,y:0,z:0},100);camera.update(player);expect(height(camera)).toBe(100);
  }
});
