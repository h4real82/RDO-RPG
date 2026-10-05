export const SERVER_TICK_RATE = 20; // 20 Hz simulation loop
export const TICK_INTERVAL_MS = 1000 / SERVER_TICK_RATE; // 50ms

export const TILE_SIZE = 4; // Ultra-fine 4x4 pixel collision subgrid resolution
export const WORLD_MAP_WIDTH = 1600;
export const WORLD_MAP_HEIGHT = 1100;

export const DEFAULT_SPAWN_X = 580; // Main street center between Saloon and Doctor
export const DEFAULT_SPAWN_Y = 480;
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
  // Nord-Sektor: Church & Graveyard
  { id: 'church_main', name: 'Valentine Church Nave', x: 580, y: 100, w: 140, h: 100, height: 8.5 },
  { id: 'church_transept', name: 'Valentine Church Transept', x: 550, y: 130, w: 200, h: 50, height: 7.5 },
  { id: 'church_tower', name: 'Valentine Church Bell Tower', x: 625, y: 180, w: 50, h: 50, height: 16.0 },
  { id: 'cemetery_fence_n', name: 'Cemetery North Fence', x: 740, y: 90, w: 150, h: 8, height: 1.4 },
  { id: 'cemetery_fence_e', name: 'Cemetery East Fence', x: 885, y: 90, w: 8, h: 130, height: 1.4 },
  { id: 'cemetery_fence_s', name: 'Cemetery South Fence', x: 740, y: 215, w: 150, h: 8, height: 1.4 },

  // Zentraler Hauptstraßen-Streifen (Nord-Zeile)
  { id: 'saloon', name: "Smithfield's Saloon", x: 240, y: 310, w: 180, h: 120, height: 8.5 },
  { id: 'general_store', name: 'Valentine General Store', x: 440, y: 320, w: 130, h: 110, height: 7.5 },
  { id: 'doctor_drugs', name: 'Doctor & Apothecary (DRUGS)', x: 590, y: 320, w: 120, h: 110, height: 7.5 },
  { id: 'sheriff_office', name: "Sheriff's Office & Jail", x: 730, y: 320, w: 140, h: 110, height: 6.8 },
  { id: 'bank', name: 'Valentine Bank', x: 890, y: 320, w: 120, h: 110, height: 7.0 },
  { id: 'gunsmith', name: 'Valentine Gunsmith & Blacksmith', x: 1030, y: 330, w: 120, h: 100, height: 6.5 },

  // Zentraler Hauptstraßen-Streifen (Süd-Zeile)
  { id: 'baustelle', name: 'House Under Construction', x: 430, y: 530, w: 120, h: 80, height: 5.5 },
  { id: 'south_commercial', name: 'South Commercial Building', x: 620, y: 540, w: 130, h: 100, height: 6.5 },
  { id: 'south_hotel', name: 'South Hotel / Boarding House', x: 770, y: 540, w: 130, h: 100, height: 7.0 },

  // Süd-Sektor: Valentine Livery Stable & Viehgatter
  { id: 'livery_stable', name: 'Valentine Livery & Auction Barn', x: 420, y: 680, w: 220, h: 150, height: 9.5 },
  { id: 'livery_water_tank', name: 'Livery Wooden Water Tank', x: 395, y: 730, w: 30, h: 30, height: 4.5 },
  { id: 'corral_paddock_1', name: 'Livestock Paddock 1', x: 660, y: 680, w: 130, h: 120, height: 1.6 },
  { id: 'corral_paddock_2', name: 'Livestock Paddock 2', x: 795, y: 680, w: 130, h: 120, height: 1.6 },

  // Südost-Sektor: Bahnhof & Wasserturm
  { id: 'train_station', name: 'Valentine Train Station House', x: 1160, y: 740, w: 160, h: 90, height: 7.0 },
  { id: 'station_water_tower', name: 'Railroad Locomotive Water Tower', x: 1340, y: 750, w: 60, h: 60, height: 11.0 },

  // Hitching Posts & Water Troughs
  { id: 'hitching_post_saloon', name: 'Saloon Hitching Post', x: 310, y: 435, w: 50, h: 6, height: 1.2 },
  { id: 'hitching_post_store', name: 'Store Hitching Post', x: 490, y: 435, w: 50, h: 6, height: 1.2 },
  { id: 'hitching_post_doctor', name: 'Doctor Hitching Post', x: 640, y: 435, w: 50, h: 6, height: 1.2 },
  { id: 'hitching_post_sheriff', name: 'Sheriff Hitching Post', x: 790, y: 435, w: 50, h: 6, height: 1.2 }
];

