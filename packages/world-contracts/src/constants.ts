export const CHUNK_SIZE = 250;

export const WORLD_LAYERS = Object.freeze({
  terrain: 0,
  roadsAndRails: 0.002,
  boardwalks: 0.0035,
  buildings: 0.005,
});

export type WorldLayer = keyof typeof WORLD_LAYERS;
