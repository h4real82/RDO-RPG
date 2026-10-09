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
  blocked = false;
  private movement: PlayerMovement = { forward: 0, right: 0 };

  constructor(
    initialPosition: PlayerPosition,
    private readonly speed = 6,
    private readonly canOccupy: (position: PlayerPosition) => boolean = () => true,
  ) {
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
    this.blocked = false;
    const magnitude = Math.hypot(this.movement.forward, this.movement.right);
    if (magnitude === 0) return;
    const forward = this.movement.forward / magnitude;
    const right = this.movement.right / magnitude;
    const steps = Math.ceil(deltaSeconds / 0.1);
    const stepSeconds = deltaSeconds / steps;
    for (let step = 0; step < steps; step += 1) {
      const nextX = this.position.x + right * this.speed * stepSeconds;
      if (right !== 0) {
        if (this.canOccupy({ x: nextX, y: this.position.y, z: this.position.z })) this.position.x = nextX;
        else this.blocked = true;
      }
      const nextZ = this.position.z - forward * this.speed * stepSeconds;
      if (forward !== 0) {
        if (this.canOccupy({ x: this.position.x, y: this.position.y, z: nextZ })) this.position.z = nextZ;
        else this.blocked = true;
      }
    }
    this.facing.x = right;
    this.facing.z = -forward;
  }
}
