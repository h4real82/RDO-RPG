export const SERVER_TICK_RATE = 20; // 20 Hz simulation loop
export const TICK_INTERVAL_MS = 1000 / SERVER_TICK_RATE; // 50ms

export const TILE_SIZE = 32; // 32x32 Grid reference for collision matrix
export const WORLD_MAP_WIDTH = 1376;
export const WORLD_MAP_HEIGHT = 768;

export const DEFAULT_SPAWN_X = 22 * TILE_SIZE + 16; // 720px (Valentine Main Street)
export const DEFAULT_SPAWN_Y = 14 * TILE_SIZE + 16; // 464px
export const DEFAULT_MAP_ID = 'world_map_01';

export const PLAYER_WALK_SPEED = 150; // pixels per second
export const PLAYER_SPRINT_SPEED = 240; // pixels per second
export const PLAYER_COLLISION_RADIUS = 12; // pixels collision circle at feet

export enum Direction {
  UP = 'up',
  DOWN = 'down',
  LEFT = 'left',
  RIGHT = 'right',
  UP_LEFT = 'up_left',
  UP_RIGHT = 'up_right',
  DOWN_LEFT = 'down_left',
  DOWN_RIGHT = 'down_right'
}

export enum RoomMessage {
  MOVE = 'move',
  INTERACT = 'interact',
  ATTACK = 'attack',
  USE_ITEM = 'use_item',
  CHAT = 'chat',
  PING = 'ping',
  PONG = 'pong'
}

export enum ItemType {
  CONSUMABLE = 'consumable',
  EQUIPMENT = 'equipment',
  MATERIAL = 'material',
  KEY_ITEM = 'key_item'
}
