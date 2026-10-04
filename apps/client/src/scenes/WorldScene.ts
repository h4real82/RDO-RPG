import Phaser from 'phaser';
import { Room, Client } from 'colyseus.js';
import {
  WorldState,
  Player,
  Direction,
  RoomMessage,
  MoveIntentMessage,
  TILE_SIZE,
  TICK_INTERVAL_MS,
  PLAYER_WALK_SPEED,
  PLAYER_SPRINT_SPEED,
  PLAYER_COLLISION_RADIUS,
  WORLD_MAP_WIDTH,
  WORLD_MAP_HEIGHT
} from '@nes-rdo/shared';
import { getMapById } from '@nes-rdo/content';
import { UserProfile } from '../discord';

interface NavTarget {
  x: number;
  y: number;
  marker: Phaser.GameObjects.Container;
}

export class WorldScene extends Phaser.Scene {
  private client!: Client;
  private room!: Room<WorldState>;
  private profile!: UserProfile;

  // Local Player Continuous Physics State
  private localX: number = 720;
  private localY: number = 464;
  private localVx: number = 0;
  private localVy: number = 0;
  private localHeading: number = Math.PI / 2;
  private isMoving: boolean = false;
  private isSprinting: boolean = false;

  // Point-and-Click Navigation
  private navTarget: NavTarget | null = null;

  // Visual Entities
  private playerContainers: Map<string, Phaser.GameObjects.Container> = new Map();
  private playerSprites: Map<string, Phaser.GameObjects.Image> = new Map();

  // Inputs
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasdKeys!: {
    up: Phaser.Input.Keyboard.Key;
    down: Phaser.Input.Keyboard.Key;
    left: Phaser.Input.Keyboard.Key;
    right: Phaser.Input.Keyboard.Key;
    shift: Phaser.Input.Keyboard.Key;
    cKey: Phaser.Input.Keyboard.Key;
  };

  private lastMoveSent: number = 0;
  private collisionGraphics!: Phaser.GameObjects.Graphics;
  private showCollisionGrid: boolean = false;

  // Minimap radar elements
  private minimapCanvas: HTMLCanvasElement | null = null;
  private minimapCtx: CanvasRenderingContext2D | null = null;
  private mapImageSource: HTMLImageElement | null = null;

  constructor() {
    super({ key: 'WorldScene' });
  }

  init(data: { client: Client; room: Room<WorldState>; profile: UserProfile }) {
    this.client = data.client;
    this.room = data.room;
    this.profile = data.profile;
  }

  preload() {
    this.load.image('western_map', '/assets/western_map.jpg');
    this.load.image('cowboy', '/assets/cowboy.png');
  }

  create() {
    // 1. HD Background Map (1376x768)
    const map = this.add.image(0, 0, 'western_map').setOrigin(0, 0);
    map.setDisplaySize(WORLD_MAP_WIDTH, WORLD_MAP_HEIGHT);

    // 2. Collision Debug Layer (toggle with 'C')
    this.collisionGraphics = this.add.graphics();
    this.collisionGraphics.setVisible(false);
    this.renderCollisionGrid('world_map_01');

    // 3. Keyboard Inputs
    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
      this.wasdKeys = {
        up: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
        down: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
        left: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
        right: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
        shift: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT),
        cKey: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.C)
      };

      this.wasdKeys.cKey.on('down', () => {
        this.showCollisionGrid = !this.showCollisionGrid;
        this.collisionGraphics.setVisible(this.showCollisionGrid);
      });
    }

    // 4. Point-and-Click (Click to Walk)
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      // Only handle left click on the game world
      if (pointer.button !== 0) return;

      const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
      this.setClickWaypoint(worldPoint.x, worldPoint.y);
    });

    // 5. Camera Setup with Smooth Lerp Follow
    this.cameras.main.setBounds(0, 0, WORLD_MAP_WIDTH, WORLD_MAP_HEIGHT);
    this.cameras.main.setZoom(2.2);
    this.cameras.main.setBackgroundColor('#14100c');

    // 6. Connect to DOM Minimap Radar
    this.minimapCanvas = document.getElementById('rdr-minimap-canvas') as HTMLCanvasElement;
    if (this.minimapCanvas) {
      this.minimapCtx = this.minimapCanvas.getContext('2d');
    }

    const mapTexture = this.textures.get('western_map').getSourceImage() as HTMLImageElement;
    if (mapTexture) {
      this.mapImageSource = mapTexture;
    }

    // 7. Colyseus State Listeners
    this.setupRoomListeners();
  }

  /**
   * Sets point-and-click navigation waypoint with animated marker
   */
  private setClickWaypoint(targetX: number, targetY: number) {
    // Clamp to map boundaries
    const clampedX = Math.max(PLAYER_COLLISION_RADIUS, Math.min(WORLD_MAP_WIDTH - PLAYER_COLLISION_RADIUS, targetX));
    const clampedY = Math.max(PLAYER_COLLISION_RADIUS, Math.min(WORLD_MAP_HEIGHT - PLAYER_COLLISION_RADIUS, targetY));

    // Check if target itself is walkable
    if (!this.isPositionWalkable(clampedX, clampedY)) {
      return;
    }

    // Remove previous waypoint marker if active
    if (this.navTarget) {
      this.navTarget.marker.destroy();
      this.navTarget = null;
    }

    // Create animated golden waypoint ring
    const markerContainer = this.add.container(clampedX, clampedY);

    const outerRing = this.add.circle(0, 0, 14);
    outerRing.setStrokeStyle(2, 0xd4af37, 0.9);

    const innerDot = this.add.circle(0, 0, 4, 0xd4af37, 1);

    markerContainer.add([outerRing, innerDot]);
    markerContainer.setDepth(1);

    // Pulse animation
    this.tweens.add({
      targets: outerRing,
      scaleX: 1.5,
      scaleY: 1.5,
      alpha: 0.1,
      duration: 800,
      repeat: -1
    });

    this.navTarget = {
      x: clampedX,
      y: clampedY,
      marker: markerContainer
    };
  }

  private clearClickWaypoint() {
    if (this.navTarget) {
      this.navTarget.marker.destroy();
      this.navTarget = null;
    }
  }

  private renderCollisionGrid(mapId: string) {
    const map = getMapById(mapId);
    if (!map) return;

    this.collisionGraphics.clear();

    for (let y = 0; y < map.height; y++) {
      for (let x = 0; x < map.width; x++) {
        const index = y * map.width + x;
        const isSolid = map.collisionLayer && map.collisionLayer[index] === 1;

        if (isSolid) {
          this.collisionGraphics.fillStyle(0xdc2626, 0.35);
          this.collisionGraphics.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
          this.collisionGraphics.lineStyle(1, 0xef4444, 0.6);
          this.collisionGraphics.strokeRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        } else {
          this.collisionGraphics.lineStyle(1, 0x22c55e, 0.12);
          this.collisionGraphics.strokeRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        }
      }
    }
  }

  private setupRoomListeners() {
    // When a player joins
    this.room.state.players.onAdd((player: Player, sessionId: string) => {
      this.createPlayerVisual(player, sessionId);

      if (sessionId === this.room.sessionId) {
        this.localX = player.position.x;
        this.localY = player.position.y;
      }

      player.position.onChange(() => {
        // Only interpolate remote players from server broadcasts
        if (sessionId !== this.room.sessionId) {
          this.updateRemotePlayerVisual(player, sessionId);
        }
      });
    });

    // When a player leaves
    this.room.state.players.onRemove((player: Player, sessionId: string) => {
      const container = this.playerContainers.get(sessionId);
      if (container) {
        container.destroy();
        this.playerContainers.delete(sessionId);
        this.playerSprites.delete(sessionId);
      }
    });

    // Server-side move correction / rejection handler
    this.room.onMessage(RoomMessage.MOVE, (data: { success: boolean; x: number; y: number }) => {
      if (!data.success) {
        // Snap local position back to server authorized position
        this.localX = data.x;
        this.localY = data.y;
        this.localVx = 0;
        this.localVy = 0;
        this.clearClickWaypoint();
      }
    });
  }

  private createPlayerVisual(player: Player, sessionId: string) {
    const isLocal = sessionId === this.room.sessionId;
    const startX = player.position.x;
    const startY = player.position.y;

    const container = this.add.container(startX, startY);

    // 1. Soft Oval Ground Shadow
    const shadow = this.add.ellipse(0, 22, 34, 12, 0x000000, 0.45);

    // 2. High-Resolution Cowboy Outlaw Sprite
    const cowboySprite = this.add.image(0, 0, 'cowboy');
    cowboySprite.setDisplaySize(48, 54);
    cowboySprite.setOrigin(0.5, 0.5);

    // 3. Name Label with Crisp Anti-Aliased High-Res Text
    const nameLabelText = isLocal ? `★ ${player.username}` : player.username || 'Outlaw';
    const nameBg = this.add.rectangle(0, -32, nameLabelText.length * 7 + 14, 16, 0x14100c, 0.75);
    nameBg.setStrokeStyle(1, isLocal ? 0xd4af37 : 0x8c734b, 0.8);

    const nameText = this.add.text(0, -32, nameLabelText, {
      fontSize: '10px',
      color: isLocal ? '#fef08a' : '#f5ebe0',
      fontFamily: 'Inter, Cinzel, serif',
      fontStyle: 'bold',
      resolution: 2 // High-DPI sharpness
    }).setOrigin(0.5);

    container.add([shadow, cowboySprite, nameBg, nameText]);
    container.setDepth(startY);

    this.playerContainers.set(sessionId, container);
    this.playerSprites.set(sessionId, cowboySprite);

    // Subtle Breathing Idle Tween
    this.tweens.add({
      targets: cowboySprite,
      scaleY: cowboySprite.scaleY * 1.015,
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    if (isLocal) {
      // Cinematic Camera Follow with Smooth Lerp & Deadzone
      this.cameras.main.startFollow(container, true, 0.06, 0.06);
      this.cameras.main.setDeadzone(30, 20);

      const playerInfoEl = document.getElementById('player-info');
      if (playerInfoEl) playerInfoEl.textContent = `${player.username}`;
    }
  }

  private updateRemotePlayerVisual(player: Player, sessionId: string) {
    const container = this.playerContainers.get(sessionId);
    const sprite = this.playerSprites.get(sessionId);
    if (!container || !sprite) return;

    // Flip horizontal based on heading
    if (Math.abs(Math.cos(player.position.heading)) > 0.1) {
      sprite.setFlipX(Math.cos(player.position.heading) < 0);
    }

    // Walking stride tilt
    if (player.position.isMoving) {
      this.tweens.add({
        targets: sprite,
        angle: Math.sin(this.time.now / 100) * 3,
        duration: TICK_INTERVAL_MS * 0.8,
        ease: 'Linear'
      });
    } else {
      sprite.setAngle(0);
    }

    // Smooth lerp to server broadcast position
    this.tweens.add({
      targets: container,
      x: player.position.x,
      y: player.position.y,
      duration: TICK_INTERVAL_MS * 1.2,
      ease: 'Linear',
      onUpdate: () => {
        container.setDepth(container.y);
      }
    });
  }

  update(time: number, delta: number) {
    if (!this.room) return;

    const dt = delta / 1000; // seconds

    // 1. Process Local Movement Inputs
    this.handleLocalMovement(dt);

    // 2. Broadcast continuous move intent at 20Hz
    if (time - this.lastMoveSent >= TICK_INTERVAL_MS) {
      const payload: MoveIntentMessage = {
        x: Math.round(this.localX * 10) / 10,
        y: Math.round(this.localY * 10) / 10,
        vx: Math.round(this.localVx),
        vy: Math.round(this.localVy),
        heading: Math.round(this.localHeading * 100) / 100,
        isMoving: this.isMoving,
        isSprinting: this.isSprinting,
        targetX: this.navTarget ? Math.round(this.navTarget.x) : undefined,
        targetY: this.navTarget ? Math.round(this.navTarget.y) : undefined,
        clientTimestamp: Date.now()
      };

      this.room.send(RoomMessage.MOVE, payload);
      this.lastMoveSent = time;
    }

    // 3. Render Circular RDR Minimap Radar
    this.renderMinimapRadar();
  }

  /**
   * Free continuous movement with obstacle sliding and click-to-walk navigation
   */
  private handleLocalMovement(dt: number) {
    let inputX = 0;
    let inputY = 0;

    // Check Keyboard Inputs
    const isUp = this.cursors.up.isDown || this.wasdKeys.up.isDown;
    const isDown = this.cursors.down.isDown || this.wasdKeys.down.isDown;
    const isLeft = this.cursors.left.isDown || this.wasdKeys.left.isDown;
    const isRight = this.cursors.right.isDown || this.wasdKeys.right.isDown;
    const isKeyboardActive = isUp || isDown || isLeft || isRight;

    if (isKeyboardActive) {
      // Keyboard input immediately cancels any mouse waypoint
      this.clearClickWaypoint();

      if (isUp) inputY -= 1;
      if (isDown) inputY += 1;
      if (isLeft) inputX -= 1;
      if (isRight) inputX += 1;
    } else if (this.navTarget) {
      // Point-and-Click waypoint navigation
      const dx = this.navTarget.x - this.localX;
      const dy = this.navTarget.y - this.localY;
      const dist = Math.hypot(dx, dy);

      if (dist < 4) {
        // Reached destination!
        this.clearClickWaypoint();
        inputX = 0;
        inputY = 0;
      } else {
        inputX = dx / dist;
        inputY = dy / dist;
      }
    }

    // Normalize diagonal velocity
    const inputMagnitude = Math.hypot(inputX, inputY);
    let targetVx = 0;
    let targetVy = 0;

    this.isSprinting = this.wasdKeys.shift.isDown && inputMagnitude > 0;
    const currentSpeed = this.isSprinting ? PLAYER_SPRINT_SPEED : PLAYER_WALK_SPEED;

    if (inputMagnitude > 0) {
      targetVx = (inputX / inputMagnitude) * currentSpeed;
      targetVy = (inputY / inputMagnitude) * currentSpeed;
      this.isMoving = true;
      this.localHeading = Math.atan2(inputY, inputX);
    } else {
      this.isMoving = false;
    }

    // Soft Acceleration / Deceleration
    const accelRate = 18;
    this.localVx += (targetVx - this.localVx) * Math.min(1, accelRate * dt);
    this.localVy += (targetVy - this.localVy) * Math.min(1, accelRate * dt);

    if (Math.abs(this.localVx) < 1 && targetVx === 0) this.localVx = 0;
    if (Math.abs(this.localVy) < 1 && targetVy === 0) this.localVy = 0;

    // Continuous Collision Detection with Obstacle Sliding
    const dx = this.localVx * dt;
    const dy = this.localVy * dt;

    if (dx !== 0 || dy !== 0) {
      const nextX = this.localX + dx;
      const nextY = this.localY + dy;

      if (this.isPositionWalkable(nextX, nextY)) {
        // Full movement valid
        this.localX = nextX;
        this.localY = nextY;
      } else {
        // Try horizontal slide
        if (this.isPositionWalkable(nextX, this.localY)) {
          this.localX = nextX;
        }
        // Try vertical slide
        if (this.isPositionWalkable(this.localX, nextY)) {
          this.localY = nextY;
        }

        // If completely blocked during click-navigation, cancel waypoint
        if (this.navTarget && !this.isPositionWalkable(nextX, this.localY) && !this.isPositionWalkable(this.localX, nextY)) {
          this.clearClickWaypoint();
        }
      }
    }

    // Update Local Visual Container & Sprite
    const container = this.playerContainers.get(this.room.sessionId);
    const sprite = this.playerSprites.get(this.room.sessionId);

    if (container && sprite) {
      container.setPosition(this.localX, this.localY);
      container.setDepth(this.localY);

      // Facing Direction (smooth flip)
      if (Math.abs(Math.cos(this.localHeading)) > 0.1) {
        sprite.setFlipX(Math.cos(this.localHeading) < 0);
      }

      // Dynamic Walking Stride Wobble
      if (this.isMoving) {
        sprite.setAngle(Math.sin(this.time.now / 90) * 3);
      } else {
        sprite.setAngle(0);
      }

      // Update UI Pos info
      const posInfoEl = document.getElementById('pos-info');
      if (posInfoEl) {
        posInfoEl.textContent = `Valentine (${Math.round(this.localX)}, ${Math.round(this.localY)})`;
      }
    }
  }

  /**
   * Continuous collision validation against map bounds and 32px solid tiles
   */
  private isPositionWalkable(px: number, py: number): boolean {
    const map = getMapById('world_map_01');
    if (!map) return false;

    const radius = PLAYER_COLLISION_RADIUS;
    const feetY = py + 14;

    // Map bounds
    if (
      px - radius < 0 ||
      px + radius >= WORLD_MAP_WIDTH ||
      feetY - radius < 0 ||
      feetY + radius >= WORLD_MAP_HEIGHT
    ) {
      return false;
    }

    // Check intersecting tiles
    const minTileX = Math.floor((px - radius) / map.tileSize);
    const maxTileX = Math.floor((px + radius) / map.tileSize);
    const minTileY = Math.floor((feetY - radius) / map.tileSize);
    const maxTileY = Math.floor((feetY + radius) / map.tileSize);

    for (let ty = minTileY; ty <= maxTileY; ty++) {
      for (let tx = minTileX; tx <= maxTileX; tx++) {
        if (tx < 0 || tx >= map.width || ty < 0 || ty >= map.height) {
          return false;
        }
        const index = ty * map.width + tx;
        if (map.collisionLayer && map.collisionLayer[index] === 1) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Real-time Circular RDR Minimap Radar
   */
  private renderMinimapRadar() {
    if (!this.minimapCanvas || !this.minimapCtx || !this.mapImageSource) return;

    const ctx = this.minimapCtx;
    const w = this.minimapCanvas.width;
    const h = this.minimapCanvas.height;
    const centerX = w / 2;
    const centerY = h / 2;
    const radius = 70;

    ctx.clearRect(0, 0, w, h);

    ctx.save();

    // Circular radar clip
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.clip();

    // Draw zoomed map crop centered on local player continuous position
    const cropSize = 240;
    const sx = Math.max(0, Math.min(WORLD_MAP_WIDTH - cropSize, this.localX - cropSize / 2));
    const sy = Math.max(0, Math.min(WORLD_MAP_HEIGHT - cropSize, this.localY - cropSize / 2));

    ctx.drawImage(this.mapImageSource, sx, sy, cropSize, cropSize, 0, 0, w, h);

    // Subtle dark radar vignette
    const radGrad = ctx.createRadialGradient(centerX, centerY, 30, centerX, centerY, radius);
    radGrad.addColorStop(0, 'rgba(15, 12, 9, 0)');
    radGrad.addColorStop(1, 'rgba(15, 12, 9, 0.65)');
    ctx.fillStyle = radGrad;
    ctx.fillRect(0, 0, w, h);

    // Draw waypoint marker on radar if active
    if (this.navTarget) {
      const wpRelX = (this.navTarget.x - this.localX) * (w / cropSize) + centerX;
      const wpRelY = (this.navTarget.y - this.localY) * (h / cropSize) + centerY;

      ctx.beginPath();
      ctx.arc(wpRelX, wpRelY, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#f59e0b';
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();
    }

    // Draw remote players as red dots
    this.room.state.players.forEach((p, sid) => {
      if (sid === this.room.sessionId) return;

      const relX = (p.position.x - this.localX) * (w / cropSize) + centerX;
      const relY = (p.position.y - this.localY) * (h / cropSize) + centerY;

      ctx.beginPath();
      ctx.arc(relX, relY, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#ef4444';
      ctx.fill();
      ctx.lineWidth = 1;
      ctx.strokeStyle = '#000000';
      ctx.stroke();
    });

    // Draw local player arrow in the exact center
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(this.localHeading - Math.PI / 2); // Rotate to current heading

    // Gold player arrow
    ctx.beginPath();
    ctx.moveTo(0, -8);
    ctx.lineTo(5, 5);
    ctx.lineTo(0, 2);
    ctx.lineTo(-5, 5);
    ctx.closePath();
    ctx.fillStyle = '#d4af37';
    ctx.fill();
    ctx.strokeStyle = '#1a140d';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.restore();

    // End radar clip
    ctx.restore();

    // Radar border ring
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#8c734b';
    ctx.stroke();
  }
}
