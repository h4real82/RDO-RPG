export const SERVER_TICK_RATE = 20; // 20 Hz simulation loop
export const TICK_INTERVAL_MS = 1000 / SERVER_TICK_RATE; // 50ms

export const TILE_SIZE = 16; // 16x16 Fine sub-grid resolution
export const WORLD_MAP_WIDTH = 1376;
export const WORLD_MAP_HEIGHT = 768;

export const DEFAULT_SPAWN_X = 720; // Valentine Main Street center (px)
export const DEFAULT_SPAWN_Y = 464;
export const DEFAULT_MAP_ID = 'world_map_01';

// 3 RDO Gaits: Walk, Jog, Sprint
export const PLAYER_WALK_SPEED = 100; // px/sec (relaxed Western swagger walk)
export const PLAYER_JOG_SPEED = 180; // px/sec (brisk travel jog)
export const PLAYER_SPRINT_SPEED = 270; // px/sec (full sprint with Shift)
export const PLAYER_COLLISION_RADIUS = 10; // pixels collision circle at boots

export enum GaitMode {
  WALK = 'walk',
  JOG = 'jog',
  SPRINT = 'sprint'
}

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
  WEAPON = 'weapon',
  CONSUMABLE = 'consumable',
  EQUIPMENT = 'equipment',
  MATERIAL = 'material',
  KEY_ITEM = 'key_item'
}
