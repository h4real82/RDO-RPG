import { OrthographicCamera, Vector3, type Vector3Like } from 'three';
import type { CameraGoal } from './ContextCamera';

export class OrthographicFollowCamera {
  readonly camera: OrthographicCamera;
  private readonly defaultPitch = Math.atan2(24, 18);
  private readonly minPitch = 0.45;
  private readonly maxPitch = 1.35;
  private readonly distance = Math.hypot(24, 18);

  private referenceTarget: Vector3 | undefined;
  private targetZoom = 1;
  private targetYaw = 0;
  private currentYaw = 0;
  private targetPitch = this.defaultPitch;
  private currentPitch = this.defaultPitch;
  private smoothing = false;

  private contextGoal?: CameraGoal;
  private focus?: Vector3;
  private reducedMotion = false;

  get yawRadians(): number {
    return this.currentYaw;
  }

  get pitchRadians(): number {
    return this.currentPitch;
  }

  get targetYawRadians(): number {
    return this.targetYaw;
  }

  get targetPitchRadians(): number {
    return this.targetPitch;
  }

  enableSmoothing(enabled = true): void {
    this.smoothing = enabled;
  }

  setContextGoal(goal: CameraGoal, reducedMotion = false): void {
    if (![goal.target.x, goal.target.y, goal.target.z, goal.visibleHeight].every(Number.isFinite) || goal.visibleHeight <= 0) return;
    this.contextGoal = goal;
    this.reducedMotion = reducedMotion;
  }

  constructor(aspect: number, viewHeight = 36) {
    this.viewHeight = viewHeight;
    const halfHeight = viewHeight / 2;
    this.camera = new OrthographicCamera(-halfHeight * aspect, halfHeight * aspect, halfHeight, -halfHeight, 0.1, 1000);
  }

  private readonly viewHeight: number;

  resize(aspect: number): void {
    const halfHeight = this.viewHeight / 2;
    this.camera.left = -halfHeight * aspect;
    this.camera.right = halfHeight * aspect;
    this.camera.updateProjectionMatrix();
  }

  adjustZoom(wheelPixels: number): void {
    if (this.referenceTarget || !Number.isFinite(wheelPixels)) return;
    this.targetZoom = Math.max(
      this.viewHeight / 90,
      Math.min(this.viewHeight / 12, this.targetZoom * Math.exp(-Math.max(-10000, Math.min(10000, wheelPixels)) * 0.002))
    );
  }

  resetZoom(): void {
    if (!this.referenceTarget) this.targetZoom = 1;
  }

  rotate(radians: number, immediate = false): void {
    if (this.referenceTarget || !Number.isFinite(radians)) return;
    if (immediate || !this.smoothing || this.reducedMotion) {
      this.targetYaw = (this.targetYaw + radians) % (Math.PI * 2);
      this.currentYaw = this.targetYaw;
    } else {
      this.targetYaw += radians;
    }
  }

  tilt(radians: number, immediate = false): void {
    if (this.referenceTarget || !Number.isFinite(radians)) return;
    const next = Math.max(this.minPitch, Math.min(this.maxPitch, this.targetPitch + radians));
    this.targetPitch = next;
    if (immediate || !this.smoothing || this.reducedMotion) {
      this.currentPitch = next;
    }
  }

  resetView(): void {
    if (this.referenceTarget) return;
    this.targetYaw = 0;
    this.targetPitch = this.defaultPitch;
    if (!this.smoothing || this.reducedMotion) {
      this.currentYaw = 0;
      this.currentPitch = this.defaultPitch;
    }
    this.resetZoom();
  }

  snapView(): void {
    this.currentYaw = this.targetYaw;
    this.currentPitch = this.targetPitch;
  }

  /** Convert screen-relative controls to PlayerController's world X / negative-Z basis. */
  getMovement(forward: number, right: number): { forward: number; right: number } {
    if (!Number.isFinite(forward) || !Number.isFinite(right)) return { forward: 0, right: 0 };
    const scale = Math.max(1, Math.hypot(forward, right));
    const sin = Math.sin(this.currentYaw);
    const cos = Math.cos(this.currentYaw);
    return { forward: (forward * cos + right * sin) / scale, right: (right * cos - forward * sin) / scale };
  }

  update(target: Vector3Like, deltaSeconds = 1 / 60): void {
    if (!this.referenceTarget && Number.isFinite(deltaSeconds) && deltaSeconds > 0) {
      const zoom = this.contextGoal
        ? (this.viewHeight / this.contextGoal.visibleHeight) * (this.contextGoal.contain ? Math.min(1, this.targetZoom) : this.targetZoom)
        : this.targetZoom;
      this.camera.zoom += (zoom - this.camera.zoom) * (this.reducedMotion ? 1 : 1 - Math.exp(-8 * Math.min(deltaSeconds, 0.5)));
      this.camera.updateProjectionMatrix();

      if (this.smoothing && !this.reducedMotion) {
        const decay = 1 - Math.exp(-12 * Math.min(deltaSeconds, 0.5));
        this.currentYaw += (this.targetYaw - this.currentYaw) * decay;
        this.currentPitch += (this.targetPitch - this.currentPitch) * decay;
      } else {
        this.currentYaw = this.targetYaw;
        this.currentPitch = this.targetPitch;
      }
    }

    if (!this.referenceTarget && this.contextGoal) {
      this.focus ??= new Vector3(target.x, target.y, target.z);
      this.focus.lerp(
        new Vector3(this.contextGoal.target.x, this.contextGoal.target.y, this.contextGoal.target.z),
        this.reducedMotion ? 1 : 1 - Math.exp(-8 * Math.max(0, Math.min(deltaSeconds, 0.5)))
      );
    }

    const followed = this.contextGoal && this.focus ? this.focus : target;
    const lookAt = this.referenceTarget ?? followed;

    if (!this.referenceTarget) {
      const horizontalDist = this.distance * Math.cos(this.currentPitch);
      const verticalDist = this.distance * Math.sin(this.currentPitch);
      this.camera.position.set(
        followed.x + Math.sin(this.currentYaw) * horizontalDist,
        followed.y + verticalDist,
        followed.z + Math.cos(this.currentYaw) * horizontalDist
      );
    }

    this.camera.lookAt(lookAt.x, lookAt.y, lookAt.z);
    this.camera.updateMatrixWorld();
  }

  setReferencePose(position: Vector3Like, target: Vector3Like, visibleHeight = 90): void {
    const safeHeight = Number.isFinite(visibleHeight) ? Math.max(4, Math.min(500, visibleHeight)) : 90;
    this.camera.zoom = this.viewHeight / safeHeight;
    this.camera.updateProjectionMatrix();
    this.camera.position.set(position.x, position.y, position.z);
    // A straight-down look direction is parallel to Three's default Y-up.
    // Use geographic north (-world Z) as screen up rather than lookAt's
    // perturbation fallback, which shifts roofs relative to ground outlines.
    const overhead = position.x === target.x && position.z === target.z && position.y > target.y;
    this.camera.up.set(0, overhead ? 0 : 1, overhead ? -1 : 0);
    this.referenceTarget = new Vector3(target.x, target.y, target.z);
  }

  clearReferencePose(): void {
    this.referenceTarget = undefined;
    this.camera.up.set(0, 1, 0);
    this.snapView();
  }
}
