import { Room, Client } from 'colyseus';
import {
  WorldState,
  Player,
  Position,
  Stats,
  ItemStack,
  Direction,
  RoomMessage,
  MoveIntentMessage,
  ChatMessagePayload,
  TICK_INTERVAL_MS,
  SERVER_TICK_RATE,
  DEFAULT_SPAWN_X,
  DEFAULT_SPAWN_Y,
  DEFAULT_MAP_ID
} from '@nes-rdo/shared';
import { getMapById, getItemById } from '@nes-rdo/content';

interface JoinOptions {
  discordId?: string;
  username?: string;
  avatar?: string;
}

export class WorldRoom extends Room<WorldState> {
  maxClients = 64;
  private currentMapId = DEFAULT_MAP_ID;

  onCreate(options: any) {
    this.setState(new WorldState());
    this.state.mapId = this.currentMapId;

    console.log(`[WorldRoom] Initialized with 20Hz simulation interval (${TICK_INTERVAL_MS}ms).`);

    // 20Hz Server Simulation Loop
    this.setSimulationInterval((deltaTime) => this.update(deltaTime), TICK_INTERVAL_MS);

    // Register Message Handlers
    this.registerMessageHandlers();
  }

  onJoin(client: Client, options: JoinOptions) {
    console.log(`[WorldRoom] Client joined: ${client.sessionId}, user: ${options?.username || 'Hero'}`);

    const player = new Player();
    player.id = client.sessionId;
    player.sessionId = client.sessionId;
    player.discordId = options.discordId || `anon_${client.sessionId.substring(0, 6)}`;
    player.username = options.username || `Player_${client.sessionId.substring(0, 4)}`;
    player.avatar = options.avatar || '';

    // Initial position
    player.position = new Position();
    player.position.x = DEFAULT_SPAWN_X;
    player.position.y = DEFAULT_SPAWN_Y;
    player.position.targetX = DEFAULT_SPAWN_X;
    player.position.targetY = DEFAULT_SPAWN_Y;
    player.position.mapId = this.currentMapId;
    player.position.direction = Direction.DOWN;

    // Initial stats
    player.stats = new Stats();

    // Starter items
    const starterPotion = new ItemStack();
    starterPotion.id = 'item_starter_1';
    starterPotion.itemId = 'potion_red';
    starterPotion.quantity = 3;
    starterPotion.slotIndex = 0;
    player.inventory.push(starterPotion);

    this.state.players.set(client.sessionId, player);

    this.broadcast(RoomMessage.CHAT, {
      sender: 'System',
      message: `${player.username} has entered the world.`
    });
  }

  async onLeave(client: Client, consented: boolean) {
    const player = this.state.players.get(client.sessionId);
    const username = player?.username || client.sessionId;

    console.log(`[WorldRoom] Client left: ${client.sessionId} (${username})`);
    this.state.players.delete(client.sessionId);

    this.broadcast(RoomMessage.CHAT, {
      sender: 'System',
      message: `${username} has left the world.`
    });
  }

  onDispose() {
    console.log('[WorldRoom] Room disposed.');
  }

  private update(deltaTime: number) {
    this.state.tick += 1;
    this.state.serverTime = Date.now();

    // Handle tick-based game updates (e.g. movement completion, status effects, etc.)
    this.state.players.forEach((player) => {
      if (player.position.isMoving) {
        // Linear movement completion towards target tile
        player.position.x = player.position.targetX;
        player.position.y = player.position.targetY;
        player.position.isMoving = false;
      }
    });
  }

  private registerMessageHandlers() {
    // Movement Intent
    this.onMessage(RoomMessage.MOVE, (client, message: MoveIntentMessage) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;

      const { direction } = message;
      player.position.direction = direction;

      let nextX = player.position.x;
      let nextY = player.position.y;

      switch (direction) {
        case Direction.UP:
          nextY -= 1;
          break;
        case Direction.DOWN:
          nextY += 1;
          break;
        case Direction.LEFT:
          nextX -= 1;
          break;
        case Direction.RIGHT:
          nextX += 1;
          break;
      }

      // Tile Validation (bounds, collision, obstacles)
      if (this.isTileWalkable(nextX, nextY, player.position.mapId)) {
        player.position.targetX = nextX;
        player.position.targetY = nextY;
        player.position.isMoving = true;
        player.lastActionTimestamp = Date.now();
      } else {
        // Send rejection or keep orientation
        client.send(RoomMessage.MOVE, {
          success: false,
          x: player.position.x,
          y: player.position.y,
          direction: player.position.direction
        });
      }
    });

    // Chat broadcast
    this.onMessage(RoomMessage.CHAT, (client, message: ChatMessagePayload) => {
      const player = this.state.players.get(client.sessionId);
      if (!player || !message.message?.trim()) return;

      this.broadcast(RoomMessage.CHAT, {
        sender: player.username,
        message: message.message.slice(0, 120)
      });
    });

    // Item Usage
    this.onMessage(RoomMessage.USE_ITEM, (client, { slotIndex }: { slotIndex: number }) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;

      const itemStack = player.inventory.find((item) => item.slotIndex === slotIndex);
      if (!itemStack || itemStack.quantity <= 0) return;

      const itemDef = getItemById(itemStack.itemId);
      if (itemDef?.effects?.healHp) {
        player.stats.hp = Math.min(player.stats.maxHp, player.stats.hp + itemDef.effects.healHp);
      }
      if (itemDef?.effects?.healMp) {
        player.stats.mp = Math.min(player.stats.maxMp, player.stats.mp + itemDef.effects.healMp);
      }

      itemStack.quantity -= 1;
      if (itemStack.quantity <= 0) {
        const idx = player.inventory.indexOf(itemStack);
        if (idx !== -1) player.inventory.splice(idx, 1);
      }
    });
  }

  /**
   * Validates if a target tile is walkable based on map boundaries and collision layers
   */
  public isTileWalkable(tileX: number, tileY: number, mapId: string): boolean {
    const map = getMapById(mapId);
    if (!map) return false;

    // Check boundary constraints
    if (tileX < 0 || tileX >= map.width || tileY < 0 || tileY >= map.height) {
      return false;
    }

    // Check collision layer: 0 = walkable, 1+ = solid/obstacle
    const tileIndex = tileY * map.width + tileX;
    if (map.collisionLayer && map.collisionLayer[tileIndex] !== 0) {
      return false;
    }

    return true;
  }
}
