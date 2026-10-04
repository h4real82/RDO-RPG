import { Schema, type, MapSchema, ArraySchema } from '@colyseus/schema';
import { Direction, DEFAULT_SPAWN_X, DEFAULT_SPAWN_Y, DEFAULT_MAP_ID } from './constants';

export class Position extends Schema {
  @type('number') x: number = DEFAULT_SPAWN_X;
  @type('number') y: number = DEFAULT_SPAWN_Y;
  @type('number') vx: number = 0;
  @type('number') vy: number = 0;
  @type('number') targetX: number = DEFAULT_SPAWN_X;
  @type('number') targetY: number = DEFAULT_SPAWN_Y;
  @type('number') heading: number = 0; // facing angle in radians
  @type('string') mapId: string = DEFAULT_MAP_ID;
  @type('string') direction: string = Direction.DOWN;
  @type('boolean') isMoving: boolean = false;
  @type('boolean') isSprinting: boolean = false;
}

export class Stats extends Schema {
  @type('number') level: number = 1;
  @type('number') exp: number = 0;
  @type('number') maxExp: number = 100;
  @type('number') hp: number = 100;
  @type('number') maxHp: number = 100;
  @type('number') mp: number = 50;
  @type('number') maxMp: number = 50;
  @type('number') stamina: number = 100;
  @type('number') maxStamina: number = 100;
  @type('number') attack: number = 10;
  @type('number') defense: number = 5;
  @type('number') speed: number = 4;
}

export class ItemStack extends Schema {
  @type('string') id: string = '';
  @type('string') itemId: string = '';
  @type('number') quantity: number = 1;
  @type('number') slotIndex: number = 0;
}

export class Player extends Schema {
  @type('string') id: string = '';
  @type('string') sessionId: string = '';
  @type('string') discordId: string = '';
  @type('string') username: string = 'Hero';
  @type('string') avatar: string = '';
  @type(Position) position: Position = new Position();
  @type(Stats) stats: Stats = new Stats();
  @type([ItemStack]) inventory: ArraySchema<ItemStack> = new ArraySchema<ItemStack>();
  @type('boolean') isOnline: boolean = true;
  @type('number') lastActionTimestamp: number = Date.now();
}

export class WorldState extends Schema {
  @type({ map: Player }) players: MapSchema<Player> = new MapSchema<Player>();
  @type('number') serverTime: number = Date.now();
  @type('string') mapId: string = DEFAULT_MAP_ID;
  @type('number') tick: number = 0;
}
