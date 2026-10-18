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
    private readonly speedScaleAt:(position:PlayerPosition)=>number=()=>1,
  ) {
    this.position = { ...initialPosition };
  }

  get speedPerSecond():number {const scale=this.speedScaleAt(this.position);return this.speed*(Number.isFinite(scale)?Math.max(0,Math.min(1.5,scale)):1);}

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
    const forward = this.movement.forward / Math.max(1,magnitude);
    const right = this.movement.right / Math.max(1,magnitude);
    const steps = Math.ceil(deltaSeconds / 0.1);
    const stepSeconds = deltaSeconds / steps;
    for (let step = 0; step < steps; step += 1) {
      const nextX = this.position.x + right * this.speedPerSecond * stepSeconds;
      if (right !== 0) {
        const candidate = { x: nextX, y: this.position.y, z: this.position.z };
        if (this.canOccupy(candidate)) { this.position.x = nextX; this.position.y = candidate.y; }
        else this.blocked = true;
      }
      const nextZ = this.position.z - forward * this.speedPerSecond * stepSeconds;
      if (forward !== 0) {
        const candidate = { x: this.position.x, y: this.position.y, z: nextZ };
        if (this.canOccupy(candidate)) { this.position.z = nextZ; this.position.y = candidate.y; }
        else this.blocked = true;
      }
    }
    this.facing.x = right;
    this.facing.z = -forward;
  }
}
