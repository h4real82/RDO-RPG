import { Direction } from './constants';

export interface MoveIntentMessage {
  x: number;
  y: number;
  vx: number;
  vy: number;
  heading?: number;
  direction?: Direction;
  targetX?: number;
  targetY?: number;
  isMoving: boolean;
  isSprinting?: boolean;
  clientTimestamp: number;
}

export interface InteractMessage {
  targetX: number;
  targetY: number;
}

export interface AttackMessage {
  targetId?: string;
  direction?: Direction;
}

export interface ChatMessagePayload {
  message: string;
}

export interface DiscordAuthPayload {
  code?: string;
  token?: string;
  discordId?: string;
  username?: string;
  avatar?: string;
}

export interface ItemDefinition {
  id: string;
  name: string;
  description: string;
  type: string;
  icon: string;
  stackable: boolean;
  maxStack: number;
  effects?: {
    healHp?: number;
    healMp?: number;
    attackBonus?: number;
    defenseBonus?: number;
  };
}

export interface MapLayerData {
  name: string;
  data: number[];
  width: number;
  height: number;
  collision?: boolean;
}

export interface MapData {
  id: string;
  name: string;
  width: number;
  height: number;
  tileSize: number;
  layers: MapLayerData[];
  collisionLayer: number[]; // 0 = walkable, 1 = solid
}

export interface POIDefinition {
  id: string;
  name: string;
  category: 'saloon' | 'sheriff' | 'store' | 'stable' | 'travel';
  x: number;
  y: number;
  radius: number;
  promptText: string;
  icon: string;
  description: string;
}

