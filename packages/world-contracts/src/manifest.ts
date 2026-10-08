import { z } from 'zod';

const finiteNumber = z.number().finite();

export const worldLayerSchema = z.enum(['terrain', 'roadsAndRails', 'boardwalks', 'buildings']);

export const vector3Schema = z.object({
  x: finiteNumber,
  y: finiteNumber,
  z: finiteNumber,
});

export const placementSchema = z.object({
  id: z.string().min(1),
  asset: z.string().min(1),
  position: vector3Schema,
  rotation: vector3Schema,
  scale: vector3Schema,
  layer: worldLayerSchema,
  chunkId: z.string().regex(/^-?\d+:-?\d+$/),
  lod: z.number().int().nonnegative(),
  tags: z.array(z.string().min(1)).optional(),
});

export const worldManifestSchema = z.object({
  version: z.literal(1),
  world: z.literal('valentine'),
  placements: z.array(placementSchema),
});

export type WorldManifest = z.infer<typeof worldManifestSchema>;
export type WorldPlacement = z.infer<typeof placementSchema>;
