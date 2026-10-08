import { CHUNK_SIZE, getChunkId, type WorldManifest, type WorldPlacement } from '@rdo-rpg/world-contracts';

export interface ChunkResource {
  dispose(): void;
}

export type PlacementFactory = (placement: WorldPlacement) => Promise<ChunkResource>;

export class WorldChunkManager {
  private readonly placementsByChunk = new Map<string, WorldPlacement[]>();
  private readonly loadedChunks = new Map<string, ChunkResource[]>();

  constructor(private readonly manifest: WorldManifest, private readonly instantiate: PlacementFactory) {
    for (const placement of manifest.placements) {
      const placements = this.placementsByChunk.get(placement.chunkId) ?? [];
      placements.push(placement);
      this.placementsByChunk.set(placement.chunkId, placements);
    }
  }

  async update(playerX: number, playerZ: number): Promise<void> {
    const wanted = this.getNeighbourhood(playerX, playerZ);
    for (const chunkId of wanted) {
      if (this.loadedChunks.has(chunkId)) continue;
      const resources: ChunkResource[] = [];
      for (const placement of this.placementsByChunk.get(chunkId) ?? []) {
        try {
          resources.push(await this.instantiate(placement));
        } catch (error) {
          console.error(`Could not instantiate world placement ${placement.id}.`, error);
        }
      }
      this.loadedChunks.set(chunkId, resources);
    }
    for (const [chunkId, resources] of this.loadedChunks) {
      if (wanted.has(chunkId)) continue;
      this.disposeResources(resources);
      this.loadedChunks.delete(chunkId);
    }
  }

  dispose(): void {
    for (const resources of this.loadedChunks.values()) this.disposeResources(resources);
    this.loadedChunks.clear();
  }

  private getNeighbourhood(playerX: number, playerZ: number): Set<string> {
    const chunks = new Set<string>();
    for (let x = -1; x <= 1; x += 1) {
      for (let z = -1; z <= 1; z += 1) {
        chunks.add(getChunkId(playerX + x * CHUNK_SIZE, playerZ + z * CHUNK_SIZE));
      }
    }
    return chunks;
  }

  private disposeResources(resources: ChunkResource[]): void {
    for (const resource of resources) {
      try {
        resource.dispose();
      } catch (error) {
        console.error('Could not dispose world resource.', error);
      }
    }
  }
}
