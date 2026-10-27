import { CHUNK_SIZE, getChunkId, type WorldManifest, type WorldPlacement } from '@rdo-rpg/world-contracts';

export interface ChunkResource {
  dispose(): void;
}

export type PlacementFactory = (placement: WorldPlacement) => Promise<ChunkResource>;

export class WorldChunkManager {
  private readonly placementsByChunk = new Map<string, WorldPlacement[]>();
  private readonly loadedChunks = new Map<string, ChunkResource[]>();
  private readonly failedChunks = new Set<string>();
  private updateQueue: Promise<void> = Promise.resolve();
  private pendingPosition: { x: number; z: number } | undefined;
  private updating = false;
  private disposed = false;

  constructor(private readonly manifest: WorldManifest, private readonly instantiate: PlacementFactory) {
    for (const placement of manifest.placements) {
      const key = (placement.chunkId === 'global' || placement.tags?.includes('persistent')) ? 'global' : placement.chunkId;
      const placements = this.placementsByChunk.get(key) ?? [];
      placements.push(placement);
      this.placementsByChunk.set(key, placements);
    }
  }

  async update(playerX: number, playerZ: number): Promise<void> {
    if (this.disposed) return;
    this.pendingPosition = { x: playerX, z: playerZ };
    if (!this.updating) {
      this.updating = true;
      this.updateQueue = Promise.resolve().then(async () => {
        try {
          while (this.pendingPosition && !this.disposed) {
            const position = this.pendingPosition;
            this.pendingPosition = undefined;
            await this.applyUpdate(position.x, position.z);
          }
        } catch (error) {
          console.error('Could not update world chunks.', error);
        } finally {
          this.updating = false;
        }
      });
    }
    return this.updateQueue;
  }

  private async applyUpdate(playerX: number, playerZ: number): Promise<void> {
    if (this.disposed) return;
    const wanted = this.getNeighbourhood(playerX, playerZ);
    for (const chunkId of wanted) {
      if (this.disposed) break;
      if (this.loadedChunks.has(chunkId)) continue;
      const resources: ChunkResource[] = [];
      for (const placement of this.placementsByChunk.get(chunkId) ?? []) {
        if (this.disposed) break;
        try { resources.push(await this.instantiate(placement)); }
        catch (error) {
          this.failedChunks.add(chunkId);
          console.error(`Could not instantiate world placement ${placement.id}.`, error);
        }
      }
      if (this.disposed || !wanted.has(chunkId)) this.disposeResources(resources);
      else this.loadedChunks.set(chunkId, resources);
    }
    for (const [chunkId, resources] of this.loadedChunks) {
      if (wanted.has(chunkId)) continue;
      this.disposeResources(resources);
      this.loadedChunks.delete(chunkId);
      this.failedChunks.delete(chunkId);
    }
  }

  dispose(): void {
    this.disposed = true;
    this.pendingPosition = undefined;
    for (const resources of this.loadedChunks.values()) this.disposeResources(resources);
    this.loadedChunks.clear();
    this.failedChunks.clear();
  }

  isRegionReady(x: number, z: number): boolean {
    return !this.disposed && [...this.getNeighbourhood(x, z)].every(id => this.loadedChunks.has(id) && !this.failedChunks.has(id));
  }

  async prepareRegion(x: number, z: number): Promise<void> {
    await this.update(x, z);
    if (!this.isRegionReady(x, z)) throw new Error('Die Straßenumgebung ist nicht vollständig geladen.');
  }

  async waitForIdle(): Promise<void> {
    await this.updateQueue;
  }

  private getNeighbourhood(playerX: number, playerZ: number): Set<string> {
    const chunks = new Set<string>();
    if (this.placementsByChunk.has('global')) chunks.add('global');
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
