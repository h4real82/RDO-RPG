export interface PlayerPosition {
  x: number;
  y: number;
  z: number;
}

export interface PlayerMovement {
  forward: number;
  right: number;
}

export class PlayerController {
  readonly position: PlayerPosition;
  readonly facing: PlayerPosition = { x: 0, y: 0, z: -1 };
  private movement: PlayerMovement = { forward: 0, right: 0 };

  constructor(initialPosition: PlayerPosition, private readonly speed = 6) {
    this.position = { ...initialPosition };
  }

  setMovement(movement: PlayerMovement): void {
    this.movement = {
      forward: Math.max(-1, Math.min(1, movement.forward)),
      right: Math.max(-1, Math.min(1, movement.right)),
    };
  }

  update(deltaSeconds: number): void {
    if (!Number.isFinite(deltaSeconds) || deltaSeconds <= 0) return;
    const magnitude = Math.hypot(this.movement.forward, this.movement.right);
    if (magnitude === 0) return;
    const forward = this.movement.forward / magnitude;
    const right = this.movement.right / magnitude;
    this.position.x += right * this.speed * deltaSeconds;
    this.position.z -= forward * this.speed * deltaSeconds;
    this.facing.x = right;
    this.facing.z = -forward;
  }
}
