import { CHUNK_SIZE } from './constants.js';

export interface GameCoordinates {
  x: number;
  z: number;
}

export function toGameCoordinates(lng: number, lat: number): GameCoordinates {
  const gameY = (lat - -63.6) / 0.01552;
  return {
    x: (lng - 111.29) / 0.01552,
    z: gameY === 0 ? 0 : -gameY,
  };
}

export function getChunkId(x: number, z: number): string {
  return `${Math.floor(x / CHUNK_SIZE)}:${Math.floor(z / CHUNK_SIZE)}`;
}
