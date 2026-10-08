import { OrthographicCamera, Vector3, type Vector3Like } from 'three';

export class OrthographicFollowCamera {
  readonly camera: OrthographicCamera;
  private readonly offset = new Vector3(0, 24, 18);
  private referenceTarget: Vector3 | undefined;
  private targetZoom = 1;

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
    this.targetZoom = Math.max(this.viewHeight / 90, Math.min(this.viewHeight / 12,
      this.targetZoom * Math.exp(-Math.max(-10000, Math.min(10000, wheelPixels)) * 0.002)));
  }

  resetZoom(): void {
    if (!this.referenceTarget) this.targetZoom = 1;
  }

  update(target: Vector3Like, deltaSeconds = 1 / 60): void {
    if (!this.referenceTarget && Number.isFinite(deltaSeconds) && deltaSeconds > 0) {
      this.camera.zoom += (this.targetZoom - this.camera.zoom) * (1 - Math.exp(-12 * Math.min(deltaSeconds, 0.1)));
      this.camera.updateProjectionMatrix();
    }
    const lookAt = this.referenceTarget ?? target;
    if (!this.referenceTarget) this.camera.position.set(target.x + this.offset.x, target.y + this.offset.y, target.z + this.offset.z);
    this.camera.lookAt(lookAt.x, lookAt.y, lookAt.z);
    this.camera.updateMatrixWorld();
  }

  setReferencePose(position: Vector3Like, target: Vector3Like): void {
    this.camera.zoom = this.viewHeight / 90;
    this.camera.updateProjectionMatrix();
    this.camera.position.set(position.x, position.y, position.z);
    this.referenceTarget = new Vector3(target.x, target.y, target.z);
  }

  clearReferencePose(): void { this.referenceTarget = undefined; }
}
