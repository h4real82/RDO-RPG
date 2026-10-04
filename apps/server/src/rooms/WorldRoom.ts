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
  DEFAULT_SPAWN_X,
  DEFAULT_SPAWN_Y,
  DEFAULT_MAP_ID,
  PLAYER_WALK_SPEED,
  PLAYER_SPRINT_SPEED,
  PLAYER_COLLISION_RADIUS,
  PLAYER_FEET_OFFSET_Y,
  WORLD_MAP_WIDTH,
  WORLD_MAP_HEIGHT
} from '@rdo-rpg/shared';
import { getMapById, getItemById } from '@rdo-rpg/content';

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

    console.log(`[WorldRoom] Initialized 20Hz continuous simulation loop (${TICK_INTERVAL_MS}ms).`);

    // 20Hz Server Simulation Loop
    this.setSimulationInterval((deltaTime) => this.update(deltaTime), TICK_INTERVAL_MS);

    // Register Message Handlers
    this.registerMessageHandlers();
  }

  onJoin(client: Client, options: JoinOptions) {
    console.log(`[WorldRoom] Client joined: ${client.sessionId}, user: ${options?.username || 'Outlaw'}`);

    const player = new Player();
    player.id = client.sessionId;
    player.sessionId = client.sessionId;
    player.discordId = options.discordId || `anon_${client.sessionId.substring(0, 6)}`;
    player.username = options.username || `Gunslinger_${client.sessionId.substring(0, 4)}`;
    player.avatar = options.avatar || '';

    // Continuous world pixel coordinates
    player.position = new Position();
    player.position.x = DEFAULT_SPAWN_X;
    player.position.y = DEFAULT_SPAWN_Y;
    player.position.targetX = DEFAULT_SPAWN_X;
    player.position.targetY = DEFAULT_SPAWN_Y;
    player.position.vx = 0;
    player.position.vy = 0;
    player.position.heading = Math.PI / 2; // facing down
    player.position.mapId = this.currentMapId;
    player.position.direction = Direction.DOWN;
    player.position.isMoving = false;
    player.position.isSprinting = false;

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
      sender: 'Sheriff',
      message: `${player.username} has arrived in Valentine.`
    });
  }

  async onLeave(client: Client, consented: boolean) {
    const player = this.state.players.get(client.sessionId);
    const username = player?.username || client.sessionId;

    console.log(`[WorldRoom] Client left: ${client.sessionId} (${username})`);
    this.state.players.delete(client.sessionId);

    this.broadcast(RoomMessage.CHAT, {
      sender: 'Sheriff',
      message: `${username} left town.`
    });
  }

  onDispose() {
    console.log('[WorldRoom] Room disposed.');
  }

  private update(deltaTime: number) {
    this.state.tick += 1;
    this.state.serverTime = Date.now();
  }

  private registerMessageHandlers() {
    // Continuous Movement Intent
    this.onMessage(RoomMessage.MOVE, (client, message: MoveIntentMessage) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;

      const { x, y, vx, vy, heading, targetX, targetY, isMoving, isSprinting } = message;

      // Validate position against collision boundaries
      if (this.isPositionWalkable(x, y, player.position.mapId)) {
        // Anti-teleport speed sanity check
        const dist = Math.hypot(x - player.position.x, y - player.position.y);
        const maxSpeed = (isSprinting ? PLAYER_SPRINT_SPEED : PLAYER_WALK_SPEED) * 1.8;
        const maxDistPerTick = (maxSpeed * (TICK_INTERVAL_MS / 1000)) + 16; // tolerance buffer for latency spikes

        if (dist <= maxDistPerTick || player.position.isMoving === false) {
          player.position.x = x;
          player.position.y = y;
          player.position.vx = vx;
          player.position.vy = vy;
          if (heading !== undefined) player.position.heading = heading;
          if (targetX !== undefined) player.position.targetX = targetX;
          if (targetY !== undefined) player.position.targetY = targetY;
          player.position.isMoving = isMoving;
          player.position.isSprinting = !!isSprinting;
          player.lastActionTimestamp = Date.now();
        }
      } else {
        // Position was invalid / inside an obstacle; keep last valid position
        client.send(RoomMessage.MOVE, {
          success: false,
          x: player.position.x,
          y: player.position.y
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

    // POI & Travel Interaction
    this.onMessage(RoomMessage.INTERACT, (client, message: { type?: string; poiId?: string; x?: number; y?: number }) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;

      if (message.type === 'travel' && typeof message.x === 'number' && typeof message.y === 'number') {
        if (this.isPositionWalkable(message.x, message.y, player.position.mapId)) {
          player.position.x = message.x;
          player.position.y = message.y;
          player.position.vx = 0;
          player.position.vy = 0;
          player.position.isMoving = false;
          player.position.isSprinting = false;
          player.lastActionTimestamp = Date.now();
        }
      }
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
   * Validates if a continuous pixel coordinate (with collision radius) is walkable
   */
  public isPositionWalkable(px: number, py: number, mapId: string): boolean {
    const map = getMapById(mapId);
    if (!map) return false;

    const radius = PLAYER_COLLISION_RADIUS;
    const feetY = py + PLAYER_FEET_OFFSET_Y;

    // Check map boundaries
    if (
      px - radius < 0 ||
      px + radius >= WORLD_MAP_WIDTH ||
      feetY - radius < 0 ||
      feetY + radius >= WORLD_MAP_HEIGHT
    ) {
      return false;
    }

    // Check intersecting 4x4 tiles against collisionLayer
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
          // Precise circle-to-AABB distance check against 4x4 tile
          const closestX = Math.max(tx * map.tileSize, Math.min(px, (tx + 1) * map.tileSize));
          const closestY = Math.max(ty * map.tileSize, Math.min(feetY, (ty + 1) * map.tileSize));
          const distX = px - closestX;
          const distY = feetY - closestY;
          if (distX * distX + distY * distY < radius * radius) {
            return false;
          }
        }
      }
    }

    return true;
  }
}
