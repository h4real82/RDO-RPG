import { describe, it, expect, vi } from 'vitest';
import { Vector3 } from 'three';
import { OrthographicFollowCamera } from './OrthographicFollowCamera';
import { CanvasPointerGestures } from '../input/CanvasPointerGestures';

const player = { x: 10, y: 0, z: 20 };

describe('OrthographicFollowCamera Smoothing & Tilt (H4R-86)', () => {
  it('smoothly damps yaw rotation when smoothing is enabled', () => {
    const cam = new OrthographicFollowCamera(16 / 9);
    cam.enableSmoothing(true);

    expect(cam.yawRadians).toBe(0);
    cam.rotate(Math.PI / 2); // 90 degrees
    expect(cam.targetYawRadians).toBeCloseTo(Math.PI / 2);
    // Before update, current yaw has not snapped
    expect(cam.yawRadians).toBe(0);

    // Single frame step (1/60s)
    cam.update(player, 1 / 60);
    expect(cam.yawRadians).toBeGreaterThan(0);
    expect(cam.yawRadians).toBeLessThan(Math.PI / 2);

    // Settle camera over 60 frames
    for (let i = 0; i < 60; i++) {
      cam.update(player, 1 / 60);
    }
    expect(cam.yawRadians).toBeCloseTo(Math.PI / 2, 2);
  });

  it('supports vertical pitch/tilt adjustments within safe clamped limits', () => {
    const cam = new OrthographicFollowCamera(16 / 9);
    cam.enableSmoothing(true);

    const initialPitch = cam.pitchRadians;
    expect(initialPitch).toBeCloseTo(Math.atan2(24, 18), 3); // ~0.927 rad (~53°)

    // Tilt camera downwards / steeper
    cam.tilt(0.3);
    for (let i = 0; i < 60; i++) cam.update(player, 1 / 60);
    expect(cam.pitchRadians).toBeGreaterThan(initialPitch);

    // Test pitch clamping at maximum top-down limit
    cam.tilt(5.0); // Extreme tilt
    for (let i = 0; i < 60; i++) cam.update(player, 1 / 60);
    expect(cam.pitchRadians).toBeLessThanOrEqual(1.35);

    // Test pitch clamping at minimum low-angle limit
    cam.tilt(-10.0); // Extreme tilt down
    for (let i = 0; i < 60; i++) cam.update(player, 1 / 60);
    expect(cam.pitchRadians).toBeGreaterThanOrEqual(0.45);
  });

  it('resets view smoothly to canonical Valentine defaults', () => {
    const cam = new OrthographicFollowCamera(16 / 9);
    cam.enableSmoothing(true);

    cam.rotate(Math.PI / 4);
    cam.tilt(0.2);
    cam.adjustZoom(200);
    for (let i = 0; i < 60; i++) cam.update(player, 1 / 60);

    cam.resetView();
    expect(cam.targetYawRadians).toBe(0);
    expect(cam.targetPitchRadians).toBeCloseTo(Math.atan2(24, 18), 3);

    for (let i = 0; i < 60; i++) cam.update(player, 1 / 60);
    expect(cam.yawRadians).toBeCloseTo(0, 2);
    expect(cam.pitchRadians).toBeCloseTo(Math.atan2(24, 18), 2);
  });

  it('instantly snaps view on snapView or clearReferencePose', () => {
    const cam = new OrthographicFollowCamera(16 / 9);
    cam.enableSmoothing(true);

    cam.rotate(Math.PI / 2);
    expect(cam.yawRadians).toBe(0);
    cam.snapView();
    expect(cam.yawRadians).toBeCloseTo(Math.PI / 2);
  });
});

class CanvasStub extends EventTarget {
  ownerDocument = { defaultView: new EventTarget(), activeElement: null };
  style: Record<string, string> = { cursor: '' };
  setPointerCapture = vi.fn();
  releasePointerCapture = vi.fn();
  hasPointerCapture = () => true;
}

describe('Modern Mouse & Gesture Orbit Controls (H4R-86)', () => {
  function setupGestures() {
    const canvas = new CanvasStub();
    const callbacks = {
      onMoveClick: vi.fn(),
      onContext: vi.fn(),
      onRotate: vi.fn(),
      onTilt: vi.fn(),
      onOrbitStart: vi.fn(() => {
        canvas.style.cursor = 'grabbing';
      }),
      onOrbitEnd: vi.fn(() => {
        canvas.style.cursor = '';
      }),
      isCaptured: vi.fn(() => false),
      onCancel: vi.fn()
    };
    const gestures = new CanvasPointerGestures(canvas as unknown as HTMLCanvasElement, callbacks);

    function send(type: string, x = 10, y = 10, button = 2, pointerId = 1) {
      const event = new Event(type, { cancelable: true });
      Object.assign(event, { clientX: x, clientY: y, button, pointerId, isPrimary: true });
      canvas.dispatchEvent(event);
      return event;
    }

    return { canvas, callbacks, gestures, send };
  }

  it('orbits camera on Right-Click Drag and changes cursor to grabbing', () => {
    const { canvas, callbacks, gestures, send } = setupGestures();

    send('pointerdown', 100, 100, 2);
    send('pointermove', 115, 120, 2); // Exceeds 6px threshold

    expect(callbacks.onOrbitStart).toHaveBeenCalledTimes(1);
    expect(canvas.style.cursor).toBe('grabbing');
    expect(callbacks.onRotate).toHaveBeenCalled();
    expect(callbacks.onTilt).toHaveBeenCalled();

    send('pointerup', 115, 120, 2);
    expect(callbacks.onOrbitEnd).toHaveBeenCalledTimes(1);
    expect(canvas.style.cursor).toBe('');
    expect(callbacks.onContext).not.toHaveBeenCalled(); // Dragging NEVER triggers context menu!

    gestures.dispose();
  });

  it('orbits camera on Middle Mouse Button (Button 1) Drag', () => {
    const { canvas, callbacks, gestures, send } = setupGestures();

    send('pointerdown', 200, 200, 1);
    send('pointermove', 230, 210, 1); // Dragged MMB

    expect(callbacks.onOrbitStart).toHaveBeenCalledTimes(1);
    expect(canvas.style.cursor).toBe('grabbing');
    expect(callbacks.onRotate).toHaveBeenCalled();

    send('pointerup', 230, 210, 1);
    expect(callbacks.onOrbitEnd).toHaveBeenCalledTimes(1);
    expect(canvas.style.cursor).toBe('');
    expect(callbacks.onContext).not.toHaveBeenCalled();
    expect(callbacks.onMoveClick).not.toHaveBeenCalled();

    gestures.dispose();
  });

  it('preserves clean short clicks: LMB moves, RMB opens context', () => {
    const { callbacks, gestures, send } = setupGestures();

    // Short LMB click (< 6px movement)
    send('pointerdown', 50, 50, 0);
    send('pointerup', 52, 51, 0);
    expect(callbacks.onMoveClick).toHaveBeenCalledWith(52, 51);
    expect(callbacks.onRotate).not.toHaveBeenCalled();

    // Short RMB click (< 6px movement)
    send('pointerdown', 80, 80, 2);
    send('pointerup', 81, 80, 2);
    expect(callbacks.onContext).toHaveBeenCalledWith(81, 80);
    expect(callbacks.onRotate).not.toHaveBeenCalled();

    gestures.dispose();
  });
});

