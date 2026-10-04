export const SERVER_TICK_RATE = 20; // 20 Hz simulation loop
export const TICK_INTERVAL_MS = 1000 / SERVER_TICK_RATE; // 50ms

export const TILE_SIZE = 32; // 32x32 HD Top-down grid
export const DEFAULT_SPAWN_X = 22;
export const DEFAULT_SPAWN_Y = 14;
export const DEFAULT_MAP_ID = 'world_map_01';

export enum Direction {
  UP = 'up',
  DOWN = 'down',
  LEFT = 'left',
  RIGHT = 'right'
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
