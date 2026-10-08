import { OrthographicCamera, Vector3, type Vector3Like } from 'three';

export class OrthographicFollowCamera {
  readonly camera: OrthographicCamera;
  private readonly offset = new Vector3(0, 24, 18);

  constructor(aspect: number, viewHeight = 36) {
    const halfHeight = viewHeight / 2;
    this.camera = new OrthographicCamera(-halfHeight * aspect, halfHeight * aspect, halfHeight, -halfHeight, 0.1, 1000);
  }

  update(target: Vector3Like): void {
    this.camera.position.set(target.x + this.offset.x, target.y + this.offset.y, target.z + this.offset.z);
    this.camera.lookAt(target.x, target.y, target.z);
    this.camera.updateMatrixWorld();
  }
}
