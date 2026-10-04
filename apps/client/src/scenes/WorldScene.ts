import Phaser from 'phaser';
import { Room, Client } from 'colyseus.js';
import {
  WorldState,
  Player,
  Direction,
  RoomMessage,
  MoveIntentMessage,
  TILE_SIZE,
  TICK_INTERVAL_MS
} from '@nes-rdo/shared';
import { getMapById } from '@nes-rdo/content';
import { UserProfile } from '../discord';

export class WorldScene extends Phaser.Scene {
  private client!: Client;
  private room!: Room<WorldState>;
  private profile!: UserProfile;

  private playerContainers: Map<string, Phaser.GameObjects.Container> = new Map();
  private playerSprites: Map<string, Phaser.GameObjects.Image> = new Map();
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
    // High-Resolution Western Assets
    this.load.image('western_map', '/assets/western_map.jpg');
    this.load.image('cowboy', '/assets/cowboy.png');
  }

  create() {
    // 1. HD Western Town Background Map (1376x768)
    const map = this.add.image(0, 0, 'western_map').setOrigin(0, 0);
    map.setDisplaySize(1376, 768);

    // 2. Invisible / Toggleable Collision Debug Grid
    this.collisionGraphics = this.add.graphics();
    this.collisionGraphics.setVisible(false);
    this.renderCollisionGrid('world_map_01');

    // 3. Setup Keyboard Controls
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

      // Toggle collision grid overlay with 'C'
      this.wasdKeys.cKey.on('down', () => {
        this.showCollisionGrid = !this.showCollisionGrid;
        this.collisionGraphics.setVisible(this.showCollisionGrid);
      });
    }

    // 4. Camera Setup for 1080p Viewport with Cinematic Zoom
    this.cameras.main.setBounds(0, 0, 1376, 768);
    this.cameras.main.setZoom(2.2);
    this.cameras.main.setBackgroundColor('#14100c');

    // 5. Connect to DOM Minimap Radar
    this.minimapCanvas = document.getElementById('rdr-minimap-canvas') as HTMLCanvasElement;
    if (this.minimapCanvas) {
      this.minimapCtx = this.minimapCanvas.getContext('2d');
    }

    const mapTexture = this.textures.get('western_map').getSourceImage() as HTMLImageElement;
    if (mapTexture) {
      this.mapImageSource = mapTexture;
    }

    // 6. Bind Colyseus Room State Handlers
    this.setupRoomListeners();
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
          // Solid building / obstacle highlight
          this.collisionGraphics.fillStyle(0xdc2626, 0.35);
          this.collisionGraphics.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
          this.collisionGraphics.lineStyle(1, 0xef4444, 0.6);
          this.collisionGraphics.strokeRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        } else {
          // Walkable path
          this.collisionGraphics.lineStyle(1, 0x22c55e, 0.15);
          this.collisionGraphics.strokeRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        }
      }
    }
  }

  private setupRoomListeners() {
    // Player connected
    this.room.state.players.onAdd((player: Player, sessionId: string) => {
      this.createPlayerVisual(player, sessionId);

      player.position.onChange(() => {
        this.updatePlayerVisualPosition(player, sessionId);
      });
    });

    // Player disconnected
    this.room.state.players.onRemove((player: Player, sessionId: string) => {
      const container = this.playerContainers.get(sessionId);
      if (container) {
        container.destroy();
        this.playerContainers.delete(sessionId);
        this.playerSprites.delete(sessionId);
      }
    });

    // Broadcast Chat Messages
    this.room.onMessage(RoomMessage.CHAT, (data: { sender: string; message: string }) => {
      console.log(`[RDR World] ${data.sender}: ${data.message}`);
    });
  }

  private createPlayerVisual(player: Player, sessionId: string) {
    const isLocal = sessionId === this.room.sessionId;
    const startX = player.position.x * TILE_SIZE + 16;
    const startY = player.position.y * TILE_SIZE + 16;

    const container = this.add.container(startX, startY);

    // 1. Soft Oval Ground Shadow
    const shadow = this.add.ellipse(0, 22, 34, 12, 0x000000, 0.45);

    // 2. High-Resolution Cowboy Outlaw Sprite
    const cowboySprite = this.add.image(0, 0, 'cowboy');
    cowboySprite.setDisplaySize(48, 54);
    cowboySprite.setOrigin(0.5, 0.5);

    // 3. Name Label with Western Serif Style
    const nameLabelText = isLocal ? `★ ${player.username}` : player.username || 'Cowboy';
    const nameBg = this.add.rectangle(0, -32, nameLabelText.length * 7 + 14, 16, 0x14100c, 0.75);
    nameBg.setStrokeStyle(1, isLocal ? 0xd4af37 : 0x8c734b, 0.8);

    const nameText = this.add.text(0, -32, nameLabelText, {
      fontSize: '10px',
      color: isLocal ? '#fef08a' : '#f5ebe0',
      fontFamily: 'Inter, Cinzel, serif',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    container.add([shadow, cowboySprite, nameBg, nameText]);
    container.setDepth(startY); // 2.5D depth sorting

    this.playerContainers.set(sessionId, container);
    this.playerSprites.set(sessionId, cowboySprite);

    // Breathing Idle Tween
    this.tweens.add({
      targets: cowboySprite,
      scaleY: cowboySprite.scaleY * 1.015,
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    if (isLocal) {
      // Cinematic Camera follow
      this.cameras.main.startFollow(container, true, 0.08, 0.08);

      const playerInfoEl = document.getElementById('player-info');
      if (playerInfoEl) playerInfoEl.textContent = `${player.username}`;
    }
  }

  private updatePlayerVisualPosition(player: Player, sessionId: string) {
    const container = this.playerContainers.get(sessionId);
    const sprite = this.playerSprites.get(sessionId);
    if (!container || !sprite) return;

    const targetPxX = player.position.targetX * TILE_SIZE + 16;
    const targetPxY = player.position.targetY * TILE_SIZE + 16;

    // Flip sprite based on horizontal movement
    if (player.position.direction === Direction.LEFT) {
      sprite.setFlipX(true);
    } else if (player.position.direction === Direction.RIGHT) {
      sprite.setFlipX(false);
    }

    // Walking stride tilt effect
    this.tweens.add({
      targets: sprite,
      angle: player.position.direction === Direction.LEFT ? -3 : 3,
      duration: TICK_INTERVAL_MS * 0.7,
      yoyo: true,
      ease: 'Sine.easeInOut'
    });

    // Smooth movement interpolation to target tile
    this.tweens.add({
      targets: container,
      x: targetPxX,
      y: targetPxY,
      duration: TICK_INTERVAL_MS * 1.4,
      ease: 'Linear',
      onUpdate: () => {
        container.setDepth(container.y); // Dynamic 2.5D depth
      }
    });

    if (sessionId === this.room.sessionId) {
      const posInfoEl = document.getElementById('pos-info');
      if (posInfoEl) {
        posInfoEl.textContent = `Valentine (${player.position.targetX}, ${player.position.targetY})`;
      }
    }
  }

  update(time: number, delta: number) {
    if (!this.room) return;

    // Movement Input Handling
    if (time - this.lastMoveSent >= TICK_INTERVAL_MS) {
      let dir: Direction | null = null;

      if (this.cursors.up.isDown || this.wasdKeys.up.isDown) {
        dir = Direction.UP;
      } else if (this.cursors.down.isDown || this.wasdKeys.down.isDown) {
        dir = Direction.DOWN;
      } else if (this.cursors.left.isDown || this.wasdKeys.left.isDown) {
        dir = Direction.LEFT;
      } else if (this.cursors.right.isDown || this.wasdKeys.right.isDown) {
        dir = Direction.RIGHT;
      }

      if (dir) {
        const payload: MoveIntentMessage = {
          direction: dir,
          clientTimestamp: Date.now()
        };
        this.room.send(RoomMessage.MOVE, payload);
        this.lastMoveSent = time;
      }
    }

    // Render Red Dead Style Minimap Radar
    this.renderMinimapRadar();
  }

  private renderMinimapRadar() {
    if (!this.minimapCanvas || !this.minimapCtx || !this.mapImageSource) return;

    const ctx = this.minimapCtx;
    const w = this.minimapCanvas.width;
    const h = this.minimapCanvas.height;
    const centerX = w / 2;
    const centerY = h / 2;
    const radius = 70;

    const localPlayer = this.room?.state?.players?.get(this.room.sessionId);
    if (!localPlayer) return;

    const localPxX = localPlayer.position.x * TILE_SIZE + 16;
    const localPxY = localPlayer.position.y * TILE_SIZE + 16;

    ctx.clearRect(0, 0, w, h);

    ctx.save();

    // Circular radar clip
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.clip();

    // Draw zoomed map portion centered on player
    const cropSize = 240; // World pixel window to show in radar
    const sx = Math.max(0, Math.min(1376 - cropSize, localPxX - cropSize / 2));
    const sy = Math.max(0, Math.min(768 - cropSize, localPxY - cropSize / 2));

    ctx.drawImage(this.mapImageSource, sx, sy, cropSize, cropSize, 0, 0, w, h);

    // Subtle dark radar vignette
    const radGrad = ctx.createRadialGradient(centerX, centerY, 30, centerX, centerY, radius);
    radGrad.addColorStop(0, 'rgba(15, 12, 9, 0)');
    radGrad.addColorStop(1, 'rgba(15, 12, 9, 0.65)');
    ctx.fillStyle = radGrad;
    ctx.fillRect(0, 0, w, h);

    // Draw other remote players as red dots
    this.room.state.players.forEach((p, sid) => {
      if (sid === this.room.sessionId) return;

      const relX = (p.position.x * TILE_SIZE + 16 - localPxX) * (w / cropSize) + centerX;
      const relY = (p.position.y * TILE_SIZE + 16 - localPxY) * (h / cropSize) + centerY;

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

    // Orientation angle
    let rot = 0;
    if (localPlayer.position.direction === Direction.UP) rot = 0;
    else if (localPlayer.position.direction === Direction.RIGHT) rot = Math.PI / 2;
    else if (localPlayer.position.direction === Direction.DOWN) rot = Math.PI;
    else if (localPlayer.position.direction === Direction.LEFT) rot = -Math.PI / 2;

    ctx.rotate(rot);

    // Gold player arrow
    ctx.beginPath();
    ctx.moveTo(0, -7);
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

    // Radar border ring
    ctx.restore();
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#8c734b';
    ctx.stroke();
  }
}
