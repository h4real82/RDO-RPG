export const SERVER_TICK_RATE = 20; // 20 Hz simulation loop
export const TICK_INTERVAL_MS = 1000 / SERVER_TICK_RATE; // 50ms

export const TILE_SIZE = 4; // Ultra-fine 4x4 pixel collision subgrid resolution
export const WORLD_MAP_WIDTH = 1376;
export const WORLD_MAP_HEIGHT = 768;

export const DEFAULT_SPAWN_X = 720; // Valentine Main Street center (px)
export const DEFAULT_SPAWN_Y = 464;
export const DEFAULT_MAP_ID = 'world_map_01';

// 3 RDO Gaits: Walk, Jog, Sprint
export const PLAYER_WALK_SPEED = 100; // px/sec (relaxed Western swagger walk)
export const PLAYER_JOG_SPEED = 180; // px/sec (brisk travel jog)
export const PLAYER_SPRINT_SPEED = 270; // px/sec (full sprint with Shift)
export const PLAYER_COLLISION_RADIUS = 7; // Small boot-level ground collision radius (px)
export const PLAYER_FEET_OFFSET_Y = 18; // Offset from sprite center to ground boots level (px)

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

export enum TimeOfDay {
  NOON = 'noon',
  GOLDEN_HOUR = 'golden_hour',
  NIGHT = 'night'
}

export enum WeatherState {
  CLEAR = 'clear',
  DUST_STORM = 'dust_storm',
  RAIN = 'rain'
}

export enum RoomMessage {
  MOVE = 'move',
  INTERACT = 'interact',
  ATTACK = 'attack',
  USE_ITEM = 'use_item',
  CHAT = 'chat',
  PING = 'ping',
  PONG = 'pong',
  SET_TIME_OF_DAY = 'set_time_of_day',
  SET_WEATHER = 'set_weather'
}

export enum ItemType {
  WEAPON = 'weapon',
  CONSUMABLE = 'consumable',
  EQUIPMENT = 'equipment',
  MATERIAL = 'material',
  KEY_ITEM = 'key_item'
}

export interface ObstacleAABB {
  id: string;
  name: string;
  x: number; // min X (px)
  y: number; // min Y/Z (px)
  w: number; // width (px)
  h: number; // depth (px)
  height?: number; // 3D height in meters/units
}

export const VALENTINE_OBSTACLES: ObstacleAABB[] = [
  // North row buildings
  { id: 'top_cabin', name: 'Top Cabin', x: 130, y: 96, w: 140, h: 124, height: 6.0 },
  { id: 'livery_stable', name: 'Valentine Livery & Auction Stable', x: 512, y: 64, w: 224, h: 152, height: 8.5 },
  { id: 'corral_fence', name: 'Auction Corral Fence', x: 420, y: 110, w: 92, h: 116, height: 1.8 },
  { id: 'north_shack', name: 'North Shack', x: 832, y: 96, w: 112, h: 112, height: 5.5 },
  { id: 'blacksmith', name: 'Blacksmith Workshop', x: 1072, y: 80, w: 160, h: 140, height: 6.5 },

  // Main Street North row
  { id: 'saloon', name: "Smithfield's Saloon", x: 288, y: 272, w: 192, h: 144, height: 7.5 },
  { id: 'general_store', name: 'Valentine General Store', x: 544, y: 304, w: 128, h: 112, height: 6.8 },
  { id: 'sheriff_office', name: "Sheriff's Office", x: 720, y: 304, w: 112, h: 112, height: 6.0 },
  { id: 'bank', name: 'Valentine Bank', x: 880, y: 304, w: 128, h: 112, height: 6.5 },
  { id: 'barber', name: 'Barber Shop', x: 1056, y: 336, w: 64, h: 84, height: 5.0 },
  { id: 'gunsmith', name: 'Valentine Gunsmith', x: 1200, y: 336, w: 128, h: 86, height: 5.5 },

  // South Row Residences
  { id: 'south_house_1', name: 'South House 1', x: 128, y: 610, w: 144, h: 108, height: 5.5 },
  { id: 'south_house_2', name: 'South House 2', x: 352, y: 610, w: 144, h: 108, height: 5.5 },
  { id: 'south_house_3', name: 'South House 3', x: 576, y: 610, w: 128, h: 108, height: 5.5 },
  { id: 'south_house_4', name: 'South House 4', x: 768, y: 610, w: 128, h: 108, height: 5.5 },
  { id: 'south_house_5', name: 'South House 5', x: 944, y: 610, w: 112, h: 108, height: 5.5 },
  { id: 'south_house_6', name: 'South House 6', x: 1104, y: 610, w: 112, h: 108, height: 5.5 },
  { id: 'south_house_7', name: 'South House 7', x: 1264, y: 610, w: 80, h: 108, height: 5.5 },

  // Hitching posts & trough
  { id: 'water_trough', name: 'Stable Water Trough', x: 480, y: 220, w: 28, h: 14, height: 1.0 },
  { id: 'hitching_post_saloon', name: 'Saloon Hitching Post', x: 320, y: 432, w: 48, h: 6, height: 1.2 },
  { id: 'hitching_post_store', name: 'Store Hitching Post', x: 580, y: 432, w: 48, h: 6, height: 1.2 },
  { id: 'hitching_post_sheriff', name: 'Sheriff Hitching Post', x: 750, y: 432, w: 48, h: 6, height: 1.2 }
];

