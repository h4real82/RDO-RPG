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

  private playerSprites: Map<string, Phaser.GameObjects.Container> = new Map();
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasdKeys!: {
    up: Phaser.Input.Keyboard.Key;
    down: Phaser.Input.Keyboard.Key;
    left: Phaser.Input.Keyboard.Key;
    right: Phaser.Input.Keyboard.Key;
  };

  private lastMoveSent: number = 0;
  private mapGraphics!: Phaser.GameObjects.Graphics;

  constructor() {
    super({ key: 'WorldScene' });
  }

  init(data: { client: Client; room: Room<WorldState>; profile: UserProfile }) {
    this.client = data.client;
    this.room = data.room;
    this.profile = data.profile;
  }

  create() {
    this.mapGraphics = this.add.graphics();
    this.renderWorldMap('world_map_01');

    // Setup input listeners
    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
      this.wasdKeys = {
        up: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
        down: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
        left: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
        right: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D)
      };
    }

    // Bind Colyseus state listeners
    this.setupRoomListeners();

    // Camera settings
    this.cameras.main.setZoom(2.5);
    this.cameras.main.setBackgroundColor('#0f172a');
  }

  private renderWorldMap(mapId: string) {
    const map = getMapById(mapId);
    if (!map) return;

    this.mapGraphics.clear();

    // Render floor and obstacles
    for (let y = 0; y < map.height; y++) {
      for (let x = 0; x < map.width; x++) {
        const index = y * map.width + x;
        const isSolid = map.collisionLayer && map.collisionLayer[index] === 1;

        if (isSolid) {
          // Solid rock / wall tile
          this.mapGraphics.fillStyle(0x334155, 1.0);
        } else {
          // Grass tile (checkered for NES feel)
          const isAlt = (x + y) % 2 === 0;
          this.mapGraphics.fillStyle(isAlt ? 0x15803d : 0x166534, 1.0);
        }

        this.mapGraphics.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);

        // Subtle grid line
        this.mapGraphics.lineStyle(1, 0x0f172a, 0.25);
        this.mapGraphics.strokeRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
      }
    }
  }

  private setupRoomListeners() {
    // Player added
    this.room.state.players.onAdd((player: Player, sessionId: string) => {
      this.createPlayerVisual(player, sessionId);

      player.position.onChange(() => {
        this.updatePlayerVisualPosition(player, sessionId);
      });
    });

    // Player removed
    this.room.state.players.onRemove((player: Player, sessionId: string) => {
      const container = this.playerSprites.get(sessionId);
      if (container) {
        container.destroy();
        this.playerSprites.delete(sessionId);
      }
    });

    // Chat broadcast
    this.room.onMessage(RoomMessage.CHAT, (data: { sender: string; message: string }) => {
      console.log(`[Chat] ${data.sender}: ${data.message}`);
    });
  }

  private createPlayerVisual(player: Player, sessionId: string) {
    const isLocal = sessionId === this.room.sessionId;
    const container = this.add.container(player.position.x * TILE_SIZE + 8, player.position.y * TILE_SIZE + 8);

    // Player sprite placeholder (NES pixel hero box)
    const bodyColor = isLocal ? 0x38bdf8 : 0xf87171;
    const body = this.add.rectangle(0, 0, 12, 14, bodyColor);
    body.setStrokeStyle(1, 0x0f172a);

    // Name label
    const nameText = this.add.text(0, -12, player.username || 'Hero', {
      fontSize: '8px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 2,
      fontFamily: 'monospace'
    }).setOrigin(0.5);

    container.add([body, nameText]);
    this.playerSprites.set(sessionId, container);

    if (isLocal) {
      this.cameras.main.startFollow(container, true, 0.1, 0.1);
      const playerInfoEl = document.getElementById('player-info');
      if (playerInfoEl) playerInfoEl.textContent = `Player: ${player.username}`;
    }
  }

  private updatePlayerVisualPosition(player: Player, sessionId: string) {
    const container = this.playerSprites.get(sessionId);
    if (!container) return;

    const targetPxX = player.position.targetX * TILE_SIZE + 8;
    const targetPxY = player.position.targetY * TILE_SIZE + 8;

    // Smooth tween to target position
    this.tweens.add({
      targets: container,
      x: targetPxX,
      y: targetPxY,
      duration: TICK_INTERVAL_MS * 1.5,
      ease: 'Linear'
    });

    if (sessionId === this.room.sessionId) {
      const posInfoEl = document.getElementById('pos-info');
      if (posInfoEl) {
        posInfoEl.textContent = `Pos: (${player.position.targetX}, ${player.position.targetY})`;
      }
    }
  }

  update(time: number, delta: number) {
    if (!this.room) return;

    // Throttle movement inputs to ~20Hz
    if (time - this.lastMoveSent < TICK_INTERVAL_MS) return;

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
}
