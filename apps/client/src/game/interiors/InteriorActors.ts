import { Group, MathUtils, Vector3 } from 'three';

export type ActorState = 'seated' | 'idle_greeting' | 'standing' | 'walking';

export interface InteriorActorOptions {
  baseYaw?: number;
  maxTurnAngle?: number;
  interactionDistance?: number;
  returnDistance?: number;
}

interface ActorTracking {
  wrapper: Group;
  inner: Group | null;
  baseY: number;
  baseRotY: number;
  currentTurn: number;
  state: ActorState;
  options: Required<InteriorActorOptions>;
}

/**
 * Procedural animation and proximity behavior for interior actors.
 * Gives life to seated NPCs (subtle breathing, relaxed posture shifts,
 * and proximity head/torso turn toward visiting player) while maintaining
 * a clean state machine for future full NPC roaming/walking cycles.
 */
export class InteriorActors {
  private tracking = new Map<Group, ActorTracking>();

  registerActor(wrapper: Group, options: InteriorActorOptions = {}): void {
    if (!wrapper) return;
    try {
      const inner = (wrapper.children[0] as Group) ?? null;
      const baseY = inner ? inner.position.y : 0;
      const baseRotY = inner ? inner.rotation.y : 0;
      this.tracking.set(wrapper, {
        wrapper,
        inner,
        baseY,
        baseRotY,
        currentTurn: 0,
        state: 'seated',
        options: {
          baseYaw: options.baseYaw ?? wrapper.rotation.y,
          maxTurnAngle: options.maxTurnAngle ?? 0.44, // ~25 degrees
          interactionDistance: options.interactionDistance ?? 3.0,
          returnDistance: options.returnDistance ?? 3.8
        }
      });
    } catch (err) {
      console.error('[InteriorActors] Failed to register actor:', err);
    }
  }

  unregisterActor(wrapper: Group): void {
    this.tracking.delete(wrapper);
  }

  update(interior: Group, playerPosition: { x: number; y: number; z: number }, delta: number, elapsed: number): void {
    if (!interior || !interior.visible || !playerPosition) return;
    try {
      // Find candidate actor objects if not yet registered
      interior.traverse(child => {
        if (child instanceof Group && child.name.startsWith('original-') && !this.tracking.has(child)) {
          const source = String(child.userData.sourceAsset ?? '');
          if (source.includes('woman') || source.includes('guest') || source.includes('npc')) {
            this.registerActor(child);
          }
        }
      });

      const playerVec = new Vector3(playerPosition.x, playerPosition.y, playerPosition.z);

      for (const [wrapper, data] of this.tracking.entries()) {
        if (!wrapper.parent || !data.inner) {
          continue;
        }

        const worldPos = new Vector3();
        wrapper.getWorldPosition(worldPos);

        const dist = Math.hypot(playerVec.x - worldPos.x, playerVec.z - worldPos.z);
        const time = elapsed * 0.001;

        // Subtle procedural breathing & micro posture adjustments
        const breathY = Math.sin(time * 1.8) * 0.0035;
        const breathTilt = Math.sin(time * 0.9) * 0.0018;

        data.inner.position.y = data.baseY + breathY;
        data.inner.rotation.z = Math.sin(time * 1.2) * 0.0012;

        let targetTurn = 0;
        if (dist <= data.options.interactionDistance) {
          data.state = 'idle_greeting';

          // Direction from actor to player in world coordinates
          const dx = playerVec.x - worldPos.x;
          const dz = playerVec.z - worldPos.z;
          const angleToPlayer = Math.atan2(dx, dz);

          // Difference relative to chair baseline yaw
          let relativeAngle = angleToPlayer - wrapper.rotation.y;
          // Normalize to [-PI, PI]
          while (relativeAngle > Math.PI) relativeAngle -= 2 * Math.PI;
          while (relativeAngle < -Math.PI) relativeAngle += 2 * Math.PI;

          // Clamp to comfortable human seated neck/torso turn range
          targetTurn = MathUtils.clamp(relativeAngle, -data.options.maxTurnAngle, data.options.maxTurnAngle);
        } else if (dist > data.options.returnDistance) {
          data.state = 'seated';
          targetTurn = 0;
        } else {
          // In transition zone: maintain current intent
          targetTurn = data.state === 'idle_greeting' ? data.currentTurn : 0;
        }

        // Smooth interpolation toward target angle
        const blendSpeed = Math.min(1, delta * 3.5);
        data.currentTurn += (targetTurn - data.currentTurn) * blendSpeed;

        data.inner.rotation.y = data.baseRotY + data.currentTurn + breathTilt;
      }
    } catch (err) {
      console.error('[InteriorActors] Error updating interior actors:', err);
    }
  }

  getActorState(wrapper: Group): ActorState | undefined {
    return this.tracking.get(wrapper)?.state;
  }

  dispose(): void {
    this.tracking.clear();
  }
}
