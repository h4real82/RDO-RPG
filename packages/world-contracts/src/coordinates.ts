import { CHUNK_SIZE } from './constants';

export interface GameCoordinates {
  x: number;
  z: number;
}

export function toGameCoordinates(lng: number, lat: number): GameCoordinates {
  return {
    x: (lng - 111.29) / 0.01552,
    z: (lat - -63.6) / 0.01552,
  };
}

export function getChunkId(x: number, z: number): string {
  return `${Math.floor(x / CHUNK_SIZE)}:${Math.floor(z / CHUNK_SIZE)}`;
}
