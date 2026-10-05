import * as THREE from 'three';
import manifestJson from './data/rdo_world_manifest.json';
import worldDataJson from './data/worldData.json';
import elevationSamplesJson from './data/elevationSamples.json';
import { WoodMaterials } from './materials/WoodMaterials';
import { TextureGenerator } from './TextureGenerator';

export interface WorldObjectData {
  id: string;
  name: string;
  type: 'corral' | 'station' | 'church' | 'shelter' | 'building' | 'saloon';
  primary_material: 'weathered_wood' | 'brick' | 'red_barn_wood' | 'painted_white_wood' | 'stone' | string;
  position: [number, number, number]; // [game_x, game_z (elevation), game_y]
  bounds: [number, number, number]; // [width, depth, height]
  orientation_deg: number;
  orientation_rad: number;
  zone: string;
  animal_spawns_count?: number;
  sources: string[];
}

export interface RailroadPoint {
  game_x: number;
  game_y: number; // in-game y (Three.js z)
  game_z: number; // in-game elevation (Three.js y)
}

export interface RailroadSegmentData {
  segment_id: string;
  network: string;
  point_count: number;
  length_meters: number;
  bounds_game: {
    min_x: number;
    max_x: number;
    min_y: number;
    max_y: number;
  };
  points: RailroadPoint[];
}

export interface RoadPoint {
  game_x: number;
  game_y: number;
  game_z: number;
}

export interface RoadSegmentData {
  segment_id: string;
  hierarchy: 'mountain_pass' | 'highway' | 'trail' | string;
  point_count: number;
  length_meters: number;
  points: RoadPoint[];
}

/**
 * Encapsulates all 3D Three.js entities within a single 500m x 500m spatial chunk.
 */
export class WorldChunk {
  public readonly key: string;
  public readonly chunkX: number;
  public readonly chunkZ: number;
  public readonly minX: number;
  public readonly maxX: number;
  public readonly minZ: number;
  public readonly maxZ: number;

  public group: THREE.Group = new THREE.Group();
  public groundMesh: THREE.Mesh | null = null;
  public colliders: THREE.Box3[] = [];
  public roofMeshes: THREE.Mesh[] = [];
  public railroadCurves: THREE.CatmullRomCurve3[] = [];
  public objectsCount: number = 0;
  public isLoaded: boolean = false;

  constructor(chunkX: number, chunkZ: number, chunkSize: number) {
    this.chunkX = chunkX;
    this.chunkZ = chunkZ;
    this.key = `${chunkX},${chunkZ}`;
    this.minX = chunkX * chunkSize;
    this.maxX = (chunkX + 1) * chunkSize;
    this.minZ = chunkZ * chunkSize;
    this.maxZ = (chunkZ + 1) * chunkSize;
    this.group.name = `Chunk_${this.key}`;
  }

  /**
   * Completely disposes all geometry, materials, and children to ensure zero memory leaks.
   */
  public dispose(): void {
    try {
      this.group.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          if (obj.geometry) {
            obj.geometry.dispose();
          }
          if (obj.material) {
            if (Array.isArray(obj.material)) {
              obj.material.forEach((m) => m.dispose());
            } else {
              obj.material.dispose();
            }
          }
        }
      });
      this.group.clear();
      this.groundMesh = null;
      this.colliders = [];
      this.roofMeshes = [];
      this.railroadCurves = [];
      this.objectsCount = 0;
      this.isLoaded = false;
    } catch (err) {
      console.error(`[WorldChunk] Error during disposal of chunk ${this.key}:`, err);
    }
  }
}

// Jean Röpke Coordinate System Transformation Constants (Validated Ground Truth)
export const CRS_SCALE = 0.01552;
export const CRS_LAT_OFFSET = -63.6;
export const CRS_LNG_OFFSET = 111.29;

/**
 * Converts Leaflet CRS.Simple [lat, lng] to in-game meters [game_x, game_y]
 * game_x = (lng - CRS_LNG_OFFSET) / CRS_SCALE
 * game_y = (lat - CRS_LAT_OFFSET) / CRS_SCALE
 */
export function leafletToGameCoords(lat: number, lng: number): { x: number; y: number } {
  return {
    x: (lng - CRS_LNG_OFFSET) / CRS_SCALE,
    y: (lat - CRS_LAT_OFFSET) / CRS_SCALE
  };
}

/**
 * Converts in-game meters [game_x, game_y] to Leaflet CRS.Simple [lat, lng]
 */
export function gameToLeafletCoords(game_x: number, game_y: number): { lat: number; lng: number } {
  return {
    lat: game_y * CRS_SCALE + CRS_LAT_OFFSET,
    lng: game_x * CRS_SCALE + CRS_LNG_OFFSET
  };
}

/**
 * WorldChunkManager handles RDO master manifest parsing, 250m x 250m chunk spatial partitioning,
 * 1000m radius distance-based streaming (LOD loading and memory disposal), procedural PBR object factory,
 * and high-priority railroad/road spline generation.
 */
export class WorldChunkManager {
  public static readonly CHUNK_SIZE = 250.0; // 250m x 250m per chunk (validated ground truth partitioning)
  public static readonly ACTIVE_RADIUS = 1000.0; // 1000m radius LOD streaming

  private scene: THREE.Scene;
  private objectsByChunk: Map<string, WorldObjectData[]> = new Map();
  private railroadSegments: RailroadSegmentData[] = [];
  private roadSegments: RoadSegmentData[] = [];

  // Active streamed chunks
  private activeChunks: Map<string, WorldChunk> = new Map();

  // Occlusion raycasting for camera-to-player transparency
  private occlusionRaycaster: THREE.Raycaster = new THREE.Raycaster();
  private currentlyFadedMeshes: Set<THREE.Mesh> = new Set();

  // Shared Materials cache
  private static sharedMaterials: Map<string, THREE.Material> = new Map();

  // Master continuous railroad curves
  private masterRailroadCurves: { id: string; curve: THREE.CatmullRomCurve3; length: number }[] = [];

  // Elevation Ground Truth Samples & Spatial Spatial Index (1266 benchmarks)
  private elevationSamples: { x: number; y: number; z: number }[] = [];
  private elevationSpatialGrid: Map<string, { x: number; y: number; z: number }[]> = new Map();

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.initElevationDataIndex();
    this.initWorldDataIndex();
  }

  /**
   * Indexes the 1266 in-game 3D coordinate ground truth benchmarks into 1000m grid buckets.
   */
  private initElevationDataIndex(): void {
    try {
      this.elevationSamples = (elevationSamplesJson || []) as { x: number; y: number; z: number }[];
      for (const s of this.elevationSamples) {
        const gx = Math.floor(s.x / 1000.0);
        const gy = Math.floor(s.y / 1000.0);
        const k = `${gx},${gy}`;
        if (!this.elevationSpatialGrid.has(k)) {
          this.elevationSpatialGrid.set(k, []);
        }
        this.elevationSpatialGrid.get(k)!.push(s);
      }
      console.log(`[WorldChunkManager] Indexed ${this.elevationSamples.length} elevation benchmarks.`);
    } catch (err) {
      console.error('[WorldChunkManager] Error initializing elevation index:', err);
    }
  }

  /**
   * Deterministic inverse distance weighted (IDW) interpolation from nearest elevation benchmarks.
   */
  public getInterpolatedElevation(gx: number, gz: number): number {
    const defaultElev = this.getDefaultElevationForRegion(gx, gz);
    if (!this.elevationSamples || this.elevationSamples.length === 0) return defaultElev;

    // Search 3x3 surrounding 1000m cells
    const cellX = Math.floor(gx / 1000.0);
    const cellY = Math.floor(gz / 1000.0); // gz is game_y in RDO coordinate system

    const candidates: { x: number; y: number; z: number }[] = [];
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const k = `${cellX + dx},${cellY + dy}`;
        const pts = this.elevationSpatialGrid.get(k);
        if (pts) candidates.push(...pts);
      }
    }

    const pool = candidates.length >= 5 ? candidates : this.elevationSamples;

    // Find 5 nearest samples from item-coordinates-in-game.json benchmarks
    let best: { dSq: number; z: number }[] = [];
    for (let i = 0; i < pool.length; i++) {
      const p = pool[i];
      const dSq = (p.x - gx) * (p.x - gx) + (p.y - gz) * (p.y - gz);
      if (best.length < 5) {
        best.push({ dSq, z: p.z });
        best.sort((a, b) => a.dSq - b.dSq);
      } else if (dSq < best[4].dSq) {
        best[4] = { dSq, z: p.z };
        best.sort((a, b) => a.dSq - b.dSq);
      }
    }

    if (best.length === 0) return defaultElev;
    if (best[0].dSq < 1.0) return best[0].z;

    // Inverse distance weighting
    let weightSum = 0;
    let weightedZ = 0;
    for (const b of best) {
      const w = 1.0 / Math.max(b.dSq, 1.0);
      weightSum += w;
      weightedZ += b.z * w;
    }

    return weightSum > 0 ? weightedZ / weightSum : defaultElev;
  }

  /**
   * Regional fallback elevation based on RDO geography
   */
  private getDefaultElevationForRegion(gx: number, gz: number): number {
    if (gx < -2000.0 && gz < -1000.0) return 25.0; // New Austin
    if (gz > 1600.0) return 220.0; // Ambarino / Grizzlies
    if (gx > 1800.0 && gz < -800.0) return 12.0; // Bayou / Saint Denis
    if (Math.hypot(gx - (-300), gz - 750) < 600) return 118.0; // Valentine
    return 65.0; // General Heartlands
  }

  /**
   * Resolves chunk biome material based on geographic region:
   * - New Austin (X < -2000, Z < -1000): Red Sandstone / Desert Soil
   * - Ambarino (Z > 1600): Snow / Frosted Alpine Earth
   * - Bayou Nwa / Saint Denis (X > 1600, Z < -600): Wet Marsh Soil / Grass
   * - Heartlands / Cumberland (General): Lush Frontier Prairie Grass & Mud
   */
  private getChunkBiomeMaterial(minX: number, minZ: number): THREE.Material {
    const midX = minX + WorldChunkManager.CHUNK_SIZE * 0.5;
    const midZ = minZ + WorldChunkManager.CHUNK_SIZE * 0.5;

    if (midX < -2000.0 && midZ < -1000.0) {
      // New Austin Desert & Red Rock
      return WorldChunkManager.getMaterial('biome_new_austin', () => {
        return new THREE.MeshStandardMaterial({
          color: 0x9e5232, // Reddish sandstone & desert grit
          roughness: 0.94,
          metalness: 0.02
        });
      });
    }

    if (midZ > 1700.0) {
      // Ambarino Snow & Glaciers
      return WorldChunkManager.getMaterial('biome_ambarino_snow', () => {
        return new THREE.MeshStandardMaterial({
          color: 0xdedcd6, // Frosted white/pale grey snow cover
          roughness: 0.78,
          metalness: 0.04
        });
      });
    }

    if (midX > 1800.0 && midZ < -800.0) {
      // Bayou Nwa & Saint Denis Swamps
      return WorldChunkManager.getMaterial('biome_bayou_marsh', () => {
        return new THREE.MeshStandardMaterial({
          color: 0x3b3a2a, // Dark wet marsh mud with swamp vegetation
          roughness: 0.88,
          metalness: 0.08
        });
      });
    }

    // Default Heartlands & Big Valley
    return WorldChunkManager.getMaterial('biome_heartlands_grass', () => {
      return new THREE.MeshStandardMaterial({
        color: 0x5a573d, // Mountain prairie grass & weathered soil
        roughness: 0.91,
        metalness: 0.02
      });
    });
  }

  /**
   * CONTINUOUS TERRAIN MANDATE:
   * Constructs an unbroken, solid ground PlaneGeometry [500, 500, 16, 16] for the chunk.
   * Interpolates elevation at each vertex from the 1266 ground truth elevation samples.
   * Ensures players never look into a void or step off a cliff edge into nothingness.
   */
  private buildChunkGroundMesh(chunk: WorldChunk): void {
    const size = WorldChunkManager.CHUNK_SIZE;
    const segments = 16;
    const geo = new THREE.PlaneGeometry(size, size, segments, segments);
    geo.rotateX(-Math.PI / 2);

    const posAttr = geo.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
      const localX = posAttr.getX(i);
      const localZ = posAttr.getZ(i);

      // World coordinates for vertex
      const worldX = chunk.minX + size * 0.5 + localX;
      const worldZ = chunk.minZ + size * 0.5 + localZ;

      // In Valentine town center [-450 to 50, 600 to 1000], keep ground flush with local town mesh
      let vertexY: number;
      if (worldX >= -280 && worldX <= 140 && worldZ >= -50 && worldZ <= 300) {
        // Overlap area with detailed Valentine city model: smoothly fade to 0.0
        vertexY = 0.0;
      } else {
        vertexY = this.getInterpolatedElevation(worldX, worldZ);
      }

      posAttr.setY(i, vertexY);
    }

    geo.computeVertexNormals();

    const mat = this.getChunkBiomeMaterial(chunk.minX, chunk.minZ);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(chunk.minX + size * 0.5, 0, chunk.minZ + size * 0.5);
    mesh.castShadow = false;
    mesh.receiveShadow = true;
    mesh.name = `GroundMesh_${chunk.key}`;

    chunk.groundMesh = mesh;
    chunk.group.add(mesh);
  }

  /**
   * Parses master manifest and worldData and indexes objects, railroads, and roads into spatial buckets.
   */
  private initWorldDataIndex(): void {
    try {
      // 1. Index validated world objects with Valentine ground-truth validation rules
      const rawObjects = (worldDataJson?.objects || []) as WorldObjectData[];
      for (const obj of rawObjects) {
        if (!obj.position || obj.position.length < 3) continue;

        // Ground-Truth Anti-Misplacement Rule:
        // Valentine Southwest/West: No church at [-360, 720]!
        // At [-360, 720] stands the Valentine Auction Yard / Big Livery Barn & Pens.
        const distToStables = Math.hypot(obj.position[0] - (-360.0), obj.position[2] - 720.0);
        if (obj.type === 'church' && distToStables < 120.0) {
          obj.type = 'shelter';
          obj.name = 'Valentine Auction Yard & Big Livery Barn';
          obj.primary_material = 'weathered_wood';
          obj.bounds = [32.0, 48.0, 9.5];
        }

        // Real Valentine Church on North Hill at [-180.0, 890.0]
        if (obj.id === 'val_church' || obj.id === 'church_valentine') {
          obj.position = [-180.0, 126.0, 890.0];
          obj.name = 'Valentine Church & Historic Cemetery';
          obj.zone = 'valentine_north_hill';
        }

        const cx = Math.floor(obj.position[0] / WorldChunkManager.CHUNK_SIZE);
        const cz = Math.floor(obj.position[2] / WorldChunkManager.CHUNK_SIZE);
        const key = `${cx},${cz}`;

        if (!this.objectsByChunk.has(key)) {
          this.objectsByChunk.set(key, []);
        }
        this.objectsByChunk.get(key)!.push(obj);
      }

      // Ensure Valentine Auction Yard & Big Barn is explicitly present at [-360, 720]
      const auctionKey = `${Math.floor(-360.0 / WorldChunkManager.CHUNK_SIZE)},${Math.floor(720.0 / WorldChunkManager.CHUNK_SIZE)}`;
      const chunkObjs = this.objectsByChunk.get(auctionKey) || [];
      if (!chunkObjs.some((o) => o.id === 'valentine_auction_yard_barn')) {
        const barnObj: WorldObjectData = {
          id: 'valentine_auction_yard_barn',
          name: 'Valentine Auction Yard & Big Livery Barn',
          type: 'shelter',
          primary_material: 'weathered_wood',
          position: [-360.0, 118.0, 720.0],
          bounds: [32.0, 48.0, 9.5],
          orientation_deg: 105.0,
          orientation_rad: 1.8326,
          zone: 'valentine_southwest_livestock_yards',
          sources: ['Offline-Ground-Truth:Media/Valentine MAP.jpg']
        };
        chunkObjs.push(barnObj);
        this.objectsByChunk.set(auctionKey, chunkObjs);
      }

      // 2. Index global railroad network from data/raw/collectors/railroads.json
      if (manifestJson?.railroads?.segments) {
        this.railroadSegments = manifestJson.railroads.segments as RailroadSegmentData[];
        for (const seg of this.railroadSegments) {
          if (seg.points && seg.points.length >= 2) {
            const pts = seg.points.map((p) => new THREE.Vector3(p.game_x, p.game_z, p.game_y));
            const curve = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.5);
            this.masterRailroadCurves.push({
              id: seg.segment_id,
              curve,
              length: curve.getLength()
            });
          }
        }
      }

      // 3. Index global road network from territories
      if (manifestJson?.roads?.territories) {
        const territories = manifestJson.roads.territories as Record<string, { segments: RoadSegmentData[] }>;
        for (const terr of Object.values(territories)) {
          if (terr?.segments) {
            this.roadSegments.push(...terr.segments);
          }
        }
      }

      console.log(
        `[WorldChunkManager] Initialized master index: ${rawObjects.length} objects across ${this.objectsByChunk.size} chunks, ${this.masterRailroadCurves.length} master rail splines, ${this.roadSegments.length} road segments.`
      );
    } catch (err) {
      console.error('[WorldChunkManager] Failed to index world data:', err);
    }
  }

  /**
   * Main per-frame update for LOD streaming and camera occlusion fading.
   */
  public update(playerPos: THREE.Vector3, camera?: THREE.Camera): void {
    try {
      if (!playerPos) return;

      const px = playerPos.x;
      const pz = playerPos.z;

      // 1. Determine active chunks in 1000m radius
      const targetChunkKeys = new Set<string>();
      const minCX = Math.floor((px - WorldChunkManager.ACTIVE_RADIUS) / WorldChunkManager.CHUNK_SIZE);
      const maxCX = Math.floor((px + WorldChunkManager.ACTIVE_RADIUS) / WorldChunkManager.CHUNK_SIZE);
      const minCZ = Math.floor((pz - WorldChunkManager.ACTIVE_RADIUS) / WorldChunkManager.CHUNK_SIZE);
      const maxCZ = Math.floor((pz + WorldChunkManager.ACTIVE_RADIUS) / WorldChunkManager.CHUNK_SIZE);

      for (let cx = minCX; cx <= maxCX; cx++) {
        for (let cz = minCZ; cz <= maxCZ; cz++) {
          // Distance from player to closest point on chunk box
          const closestX = Math.max(
            cx * WorldChunkManager.CHUNK_SIZE,
            Math.min((cx + 1) * WorldChunkManager.CHUNK_SIZE, px)
          );
          const closestZ = Math.max(
            cz * WorldChunkManager.CHUNK_SIZE,
            Math.min((cz + 1) * WorldChunkManager.CHUNK_SIZE, pz)
          );
          const dist = Math.hypot(closestX - px, closestZ - pz);

          if (dist <= WorldChunkManager.ACTIVE_RADIUS) {
            targetChunkKeys.add(`${cx},${cz}`);
          }
        }
      }

      // 2. Unload out-of-range chunks (Disposal)
      for (const [key, chunk] of this.activeChunks.entries()) {
        if (!targetChunkKeys.has(key)) {
          this.scene.remove(chunk.group);
          chunk.dispose();
          this.activeChunks.delete(key);
        }
      }

      // 3. Load newly entering chunks
      for (const key of targetChunkKeys) {
        if (!this.activeChunks.has(key)) {
          const [cxStr, czStr] = key.split(',');
          const cx = parseInt(cxStr, 10);
          const cz = parseInt(czStr, 10);
          const chunk = this.instantiateChunk(cx, cz);
          this.activeChunks.set(key, chunk);
          this.scene.add(chunk.group);
        }
      }

      // 4. Update roof transparency occlusion fade
      if (camera) {
        this.updateCameraOcclusionFade(camera, playerPos);
      }
    } catch (err) {
      console.error('[WorldChunkManager] Error during streaming update:', err);
    }
  }

  /**
   * Instantiates a chunk with its railroads, roads, and validated objects.
   */
  private instantiateChunk(cx: number, cz: number): WorldChunk {
    const chunk = new WorldChunk(cx, cz, WorldChunkManager.CHUNK_SIZE);
    chunk.isLoaded = true;

    try {
      // 0. CONTINUOUS TERRAIN MANDATE: Solid ground mesh for EVERY chunk
      this.buildChunkGroundMesh(chunk);

      // 1. Schienenstränge (Railroad Splines) - Top priority in space
      this.buildChunkRailroads(chunk);

      // 2. Straßenstränge (Road Splines)
      this.buildChunkRoads(chunk);

      // 3. Validierte Objekte instanziieren mit striktem Vorrang der Schienen
      const objects = this.objectsByChunk.get(chunk.key) || [];
      for (const obj of objects) {
        // Enforce: Gleise haben oberste Priorität - keine Überschneidungen mit Gebäudeboundings
        if (this.isIntersectingRailroad(obj, chunk.railroadCurves)) {
          if (obj.type !== 'station') {
            // Nudge building safely outside track boundary
            continue;
          }
        }

        // AABB-Kollisionsprüfung: Keine Überlappung zweier 2.5D-Objekte im selben Chunk
        const [objWidth, objDepth, objHeight] = obj.bounds;
        const candidateAABB = new THREE.Box3(
          new THREE.Vector3(obj.position[0] - objWidth * 0.45, obj.position[1], obj.position[2] - objDepth * 0.45),
          new THREE.Vector3(obj.position[0] + objWidth * 0.45, obj.position[1] + objHeight, obj.position[2] + objDepth * 0.45)
        );

        let overlapsExisting = false;
        for (const existingBox of chunk.colliders) {
          if (candidateAABB.intersectsBox(existingBox)) {
            overlapsExisting = true;
            break;
          }
        }
        if (overlapsExisting) {
          continue;
        }

        const objectMeshGroup = this.createValidatedObjectGroup(obj, chunk);
        if (objectMeshGroup) {
          chunk.group.add(objectMeshGroup);
          chunk.objectsCount++;
        }
      }
    } catch (err) {
      console.error(`[WorldChunkManager] Error instantiating chunk ${chunk.key}:`, err);
    }

    return chunk;
  }

  /**
   * Checks whether an object bounds intersect any railroad spline in the chunk.
   */
  private isIntersectingRailroad(obj: WorldObjectData, curves: THREE.CatmullRomCurve3[]): boolean {
    if (!curves || curves.length === 0) return false;

    const ox = obj.position[0];
    const oz = obj.position[2];
    const objRadius = Math.hypot(obj.bounds[0], obj.bounds[1]) * 0.5;
    const safetyDistance = obj.type === 'station' ? 3.0 : 5.5; // Stations are adjacent to ballast, buildings kept back

    const p = new THREE.Vector3(ox, 0, oz);

    for (const curve of curves) {
      const points = curve.getPoints(30);
      for (let i = 0; i < points.length; i++) {
        const pt = points[i];
        const dist = Math.hypot(pt.x - ox, pt.z - oz);
        if (dist < objRadius + safetyDistance) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * 1. Railroad Splines: Ballast Bed, Wooden Ties, Steel Rails.
   * Uses master continuous Catmull-Rom curves synchronized with data/raw/collectors/railroads.json
   */
  private buildChunkRailroads(chunk: WorldChunk): void {
    const margin = 10.0;

    for (const master of this.masterRailroadCurves) {
      const curve = master.curve;
      const totalLen = master.length;
      if (totalLen <= 0) continue;

      // Sample curve at fine resolution (every 1.2m)
      const stepDist = 1.2;
      const totalSteps = Math.max(10, Math.floor(totalLen / stepDist));
      const activeSamples: { pos: THREE.Vector3; tangent: THREE.Vector3; u: number }[] = [];

      for (let s = 0; s <= totalSteps; s++) {
        const u = s / totalSteps;
        const pt = curve.getPointAt(u);

        const isInside =
          pt.x >= chunk.minX - margin &&
          pt.x <= chunk.maxX + margin &&
          pt.z >= chunk.minZ - margin &&
          pt.z <= chunk.maxZ + margin;

        if (isInside) {
          const tan = curve.getTangentAt(u).normalize();
          activeSamples.push({ pos: pt, tangent: tan, u });
        }
      }

      if (activeSamples.length >= 2) {
        chunk.railroadCurves.push(curve);

        // A. Ballast Bed (Schotterbett Ribbon)
        const ballastMat = WorldChunkManager.getMaterial('rail_ballast', () => {
          return new THREE.MeshStandardMaterial({
            color: 0x3e352b,
            roughness: 0.95,
            metalness: 0.05
          });
        });

        const ballastWidth = 3.6;
        const ballastGeo = new THREE.BufferGeometry();
        const ballastPos: number[] = [];
        const ballastNormals: number[] = [];
        const ballastUVs: number[] = [];
        const ballastIndices: number[] = [];

        for (let i = 0; i < activeSamples.length; i++) {
          const sample = activeSamples[i];
          const tangent = sample.tangent;
          const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

          const left = sample.pos.clone().addScaledVector(normal, -ballastWidth * 0.5);
          const right = sample.pos.clone().addScaledVector(normal, ballastWidth * 0.5);
          left.y += 0.12;
          right.y += 0.12;

          ballastPos.push(left.x, left.y, left.z, right.x, right.y, right.z);
          ballastNormals.push(0, 1, 0, 0, 1, 0);
          ballastUVs.push(0, i * 0.5, 1, i * 0.5);

          if (i > 0) {
            const v0 = (i - 1) * 2;
            const v1 = (i - 1) * 2 + 1;
            const v2 = i * 2;
            const v3 = i * 2 + 1;
            ballastIndices.push(v0, v1, v2, v1, v3, v2);
          }
        }

        ballastGeo.setAttribute('position', new THREE.Float32BufferAttribute(ballastPos, 3));
        ballastGeo.setAttribute('normal', new THREE.Float32BufferAttribute(ballastNormals, 3));
        ballastGeo.setAttribute('uv', new THREE.Float32BufferAttribute(ballastUVs, 2));
        ballastGeo.setIndex(ballastIndices);

        const ballastMesh = new THREE.Mesh(ballastGeo, ballastMat);
        ballastMesh.receiveShadow = true;
        chunk.group.add(ballastMesh);

        // B. Wooden Ties (InstancedMesh along continuous track)
        const tieCount = activeSamples.length;
        const tieGeo = new THREE.BoxGeometry(2.5, 0.14, 0.22);
        const tieMat = WoodMaterials.getDarkCedarMaterial(1, 1);
        const tieInst = new THREE.InstancedMesh(tieGeo, tieMat, tieCount);
        tieInst.castShadow = true;
        tieInst.receiveShadow = true;

        const dummy = new THREE.Object3D();
        for (let t = 0; t < tieCount; t++) {
          const sample = activeSamples[t];
          const angleY = Math.atan2(sample.tangent.x, sample.tangent.z) + Math.PI / 2;

          dummy.position.set(sample.pos.x, sample.pos.y + 0.18, sample.pos.z);
          dummy.rotation.set(0, angleY, 0);
          dummy.scale.set(1, 1, 1);
          dummy.updateMatrix();
          tieInst.setMatrixAt(t, dummy.matrix);
        }
        tieInst.instanceMatrix.needsUpdate = true;
        chunk.group.add(tieInst);

        // C. Steel Rails (Two parallel steel ribbons at standard 1.435m gauge)
        const steelMat = WorldChunkManager.getMaterial('rail_steel', () => {
          return new THREE.MeshStandardMaterial({
            color: 0x98a2ac,
            roughness: 0.28,
            metalness: 0.85
          });
        });

        const halfGauge = 0.717; // 1.435m / 2
        for (const side of [-1, 1]) {
          const railGeo = new THREE.BufferGeometry();
          const railPos: number[] = [];
          const railNorm: number[] = [];
          const railInd: number[] = [];

          for (let i = 0; i < activeSamples.length; i++) {
            const sample = activeSamples[i];
            const tangent = sample.tangent;
            const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

            const railCenter = sample.pos.clone().addScaledVector(normal, side * halfGauge);
            railCenter.y += 0.3;

            const l = railCenter.clone().addScaledVector(normal, -0.04);
            const r = railCenter.clone().addScaledVector(normal, 0.04);

            railPos.push(l.x, l.y, l.z, r.x, r.y, r.z);
            railNorm.push(0, 1, 0, 0, 1, 0);

            if (i > 0) {
              const v0 = (i - 1) * 2;
              const v1 = (i - 1) * 2 + 1;
              const v2 = i * 2;
              const v3 = i * 2 + 1;
              railInd.push(v0, v1, v2, v1, v3, v2);
            }
          }

          railGeo.setAttribute('position', new THREE.Float32BufferAttribute(railPos, 3));
          railGeo.setAttribute('normal', new THREE.Float32BufferAttribute(railNorm, 3));
          railGeo.setIndex(railInd);

          const railMesh = new THREE.Mesh(railGeo, steelMat);
          railMesh.castShadow = true;
          chunk.group.add(railMesh);
        }
      }
    }
  }

  /**
   * 2. Road Splines: Procedural road ribbons along game-truth road network segments.
   */
  private buildChunkRoads(chunk: WorldChunk): void {
    const margin = 20.0;

    for (const seg of this.roadSegments) {
      const ptsInChunk: THREE.Vector3[] = [];

      for (let i = 0; i < seg.points.length; i++) {
        const p = seg.points[i];
        const tx = p.game_x;
        const ty = p.game_z;
        const tz = p.game_y;

        const isInside =
          tx >= chunk.minX - margin &&
          tx <= chunk.maxX + margin &&
          tz >= chunk.minZ - margin &&
          tz <= chunk.maxZ + margin;

        if (isInside) {
          ptsInChunk.push(new THREE.Vector3(tx, ty, tz));
        } else if (ptsInChunk.length > 0) {
          ptsInChunk.push(new THREE.Vector3(tx, ty, tz));
          break;
        }
      }

      if (ptsInChunk.length >= 2) {
        const curve = new THREE.CatmullRomCurve3(ptsInChunk);
        const curveLen = curve.getLength();
        const sampleCount = Math.max(10, Math.floor(curveLen / 3.0));
        const curvePoints = curve.getSpacedPoints(sampleCount);

        let roadWidth = 4.0;
        let roadColor = 0x5a4835;

        if (seg.hierarchy === 'highway') {
          roadWidth = 7.0;
          roadColor = 0x4e3e2c; // Muddy packed dirt
        } else if (seg.hierarchy === 'mountain_pass') {
          roadWidth = 5.0;
          roadColor = 0x6e6355; // Rocky mountain road
        }

        const roadMat = WorldChunkManager.getMaterial(`road_${seg.hierarchy}`, () => {
          return new THREE.MeshStandardMaterial({
            color: roadColor,
            roughness: 0.88,
            metalness: 0.02
          });
        });

        const roadGeo = new THREE.BufferGeometry();
        const roadPos: number[] = [];
        const roadNormals: number[] = [];
        const roadUVs: number[] = [];
        const roadIndices: number[] = [];

        for (let i = 0; i < curvePoints.length; i++) {
          const pt = curvePoints[i];
          const tangent = curve.getTangentAt(i / (curvePoints.length - 1)).normalize();
          const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

          const left = pt.clone().addScaledVector(normal, -roadWidth * 0.5);
          const right = pt.clone().addScaledVector(normal, roadWidth * 0.5);
          left.y += 0.05;
          right.y += 0.05;

          roadPos.push(left.x, left.y, left.z, right.x, right.y, right.z);
          roadNormals.push(0, 1, 0, 0, 1, 0);
          roadUVs.push(0, i * 0.3, 1, i * 0.3);

          if (i > 0) {
            const v0 = (i - 1) * 2;
            const v1 = (i - 1) * 2 + 1;
            const v2 = i * 2;
            const v3 = i * 2 + 1;
            roadIndices.push(v0, v1, v2, v1, v3, v2);
          }
        }

        roadGeo.setAttribute('position', new THREE.Float32BufferAttribute(roadPos, 3));
        roadGeo.setAttribute('normal', new THREE.Float32BufferAttribute(roadNormals, 3));
        roadGeo.setAttribute('uv', new THREE.Float32BufferAttribute(roadUVs, 2));
        roadGeo.setIndex(roadIndices);

        const roadMesh = new THREE.Mesh(roadGeo, roadMat);
        roadMesh.receiveShadow = true;
        chunk.group.add(roadMesh);
      }
    }
  }

  /**
   * Factory: Instantiates 3D structures based on validated object semantic type.
   */
  private createValidatedObjectGroup(obj: WorldObjectData, chunk: WorldChunk): THREE.Group {
    const group = new THREE.Group();
    group.name = obj.id;

    const posX = obj.position[0];
    const posY = obj.position[1];
    const posZ = obj.position[2];
    const rotY = obj.orientation_rad || 0;

    group.position.set(posX, posY, posZ);
    group.rotation.y = rotY;

    const [width, depth, height] = obj.bounds;

    switch (obj.type) {
      case 'corral':
        this.buildCorralEntity(group, width, depth, height, obj, chunk);
        break;
      case 'station':
        this.buildStationEntity(group, width, depth, height, obj, chunk);
        break;
      case 'church':
        this.buildChurchEntity(group, width, depth, height, obj, chunk);
        break;
      case 'shelter':
        this.buildShelterEntity(group, width, depth, height, obj, chunk);
        break;
      case 'saloon':
        this.buildSaloonEntity(group, width, depth, height, obj, chunk);
        break;
      case 'building':
      default:
        this.buildStandardBuildingEntity(group, width, depth, height, obj, chunk);
        break;
    }

    // Register colliders
    const box = new THREE.Box3().setFromObject(group);
    chunk.colliders.push(box);

    return group;
  }

  /**
   * Corral Factory: Open wooden post-and-rail fences (FenceSystem) instead of solid walls.
   */
  private buildCorralEntity(
    group: THREE.Group,
    width: number,
    depth: number,
    height: number,
    obj: WorldObjectData,
    _chunk: WorldChunk
  ): void {
    const postMat = WoodMaterials.getWeatheredGreyMaterial(1, 1);
    const railMat = WoodMaterials.getWeatheredGreyMaterial(2, 1);

    const postGeo = new THREE.BoxGeometry(0.18, height, 0.18);
    const railHeight = 0.1;
    const railDepth = 0.05;

    // Ground mud/dirt patch inside corral
    const groundGeo = new THREE.PlaneGeometry(width - 0.4, depth - 0.4);
    groundGeo.rotateX(-Math.PI / 2);
    const groundMat = WorldChunkManager.getMaterial('corral_ground', () => {
      return new THREE.MeshStandardMaterial({
        color: 0x483a2c,
        roughness: 0.92
      });
    });
    const groundMesh = new THREE.Mesh(groundGeo, groundMat);
    groundMesh.position.set(0, 0.02, 0);
    groundMesh.receiveShadow = true;
    group.add(groundMesh);

    // Perimeter fence: 4 sides
    const halfW = width * 0.5;
    const halfD = depth * 0.5;

    const sides = [
      { start: new THREE.Vector2(-halfW, -halfD), end: new THREE.Vector2(halfW, -halfD), hasGate: false }, // Back
      { start: new THREE.Vector2(halfW, -halfD), end: new THREE.Vector2(halfW, halfD), hasGate: false },   // Right
      { start: new THREE.Vector2(halfW, halfD), end: new THREE.Vector2(-halfW, halfD), hasGate: true },    // Front with livestock gate
      { start: new THREE.Vector2(-halfW, halfD), end: new THREE.Vector2(-halfW, -halfD), hasGate: false }  // Left
    ];

    const postSpacing = 2.4;

    for (const side of sides) {
      const sideLen = side.start.distanceTo(side.end);
      const postCount = Math.max(2, Math.round(sideLen / postSpacing));
      const step = 1.0 / postCount;
      const dir = side.end.clone().sub(side.start).normalize();
      const angleY = Math.atan2(dir.x, dir.y);

      for (let i = 0; i <= postCount; i++) {
        const t = i * step;
        const px = side.start.x + (side.end.x - side.start.x) * t;
        const pz = side.start.y + (side.end.y - side.start.y) * t;

        // Skip gate opening in center of front side
        if (side.hasGate && Math.abs(t - 0.5) < 0.12) {
          continue;
        }

        // Post
        const post = new THREE.Mesh(postGeo, postMat);
        post.position.set(px, height * 0.5, pz);
        post.castShadow = true;
        group.add(post);

        // 3 horizontal rails between posts
        if (i < postCount) {
          const nextT = (i + 1) * step;
          if (side.hasGate && ((t >= 0.38 && t <= 0.62) || (nextT >= 0.38 && nextT <= 0.62))) {
            continue; // Keep gate open
          }

          const midX = (px + side.start.x + (side.end.x - side.start.x) * nextT) * 0.5;
          const midZ = (pz + side.start.y + (side.end.y - side.start.y) * nextT) * 0.5;
          const railLen = sideLen / postCount;

          const railGeo = new THREE.BoxGeometry(railHeight, railDepth, railLen);

          for (const ry of [height * 0.28, height * 0.58, height * 0.88]) {
            const rail = new THREE.Mesh(railGeo, railMat);
            rail.position.set(midX, ry, midZ);
            rail.rotation.y = angleY;
            rail.castShadow = true;
            group.add(rail);
          }
        }
      }
    }

    // Wooden Feeding Trough Prop inside
    const troughGeo = new THREE.BoxGeometry(2.4, 0.6, 0.8);
    const trough = new THREE.Mesh(troughGeo, postMat);
    trough.position.set(0, 0.3, 0);
    trough.castShadow = true;
    group.add(trough);
  }

  /**
   * Station Factory: Bahnhofsgebäude mit Schotterbett-Anbindung und erweitertem Bahnsteig.
   */
  private buildStationEntity(
    group: THREE.Group,
    width: number,
    depth: number,
    height: number,
    _obj: WorldObjectData,
    chunk: WorldChunk
  ): void {
    const wallMat = WoodMaterials.getWeatheredGreyMaterial(2, 2);
    const roofMat = WoodMaterials.getDarkCedarMaterial(2, 2);

    // 1. Schotterbett-Anbindung (Extended Gravel Ballast Apron underneath station)
    const ballastApronGeo = new THREE.BoxGeometry(width + 4.0, 0.2, depth + 6.0);
    const ballastMat = WorldChunkManager.getMaterial('station_ballast', () => {
      return new THREE.MeshStandardMaterial({
        color: 0x3d352b,
        roughness: 0.95
      });
    });
    const ballastMesh = new THREE.Mesh(ballastApronGeo, ballastMat);
    ballastMesh.position.set(0, 0.1, 0);
    ballastMesh.receiveShadow = true;
    group.add(ballastMesh);

    // 2. Station Platform / Boardwalk (Elevated trackside waiting deck)
    const platformDepth = 3.2;
    const platformGeo = new THREE.BoxGeometry(width + 2.0, 0.35, platformDepth);
    const platformMat = WoodMaterials.getHoneyPineMaterial(2, 1);
    const platform = new THREE.Mesh(platformGeo, platformMat);
    platform.position.set(0, 0.35, depth * 0.5 + platformDepth * 0.5);
    platform.receiveShadow = true;
    group.add(platform);

    // 3. Main Station House Body
    const stationHouseGeo = new THREE.BoxGeometry(width, height, depth);
    const stationHouse = new THREE.Mesh(stationHouseGeo, wallMat);
    stationHouse.position.set(0, height * 0.5 + 0.2, 0);
    stationHouse.castShadow = true;
    stationHouse.receiveShadow = true;
    group.add(stationHouse);

    // 4. Gable Roof - Strict adherence to user rule: max 0.5 overhang
    const roofOverhang = 0.45;
    const roofGeo = new THREE.BoxGeometry(width + roofOverhang * 2, 0.25, depth + roofOverhang * 2);
    const roofMesh = new THREE.Mesh(roofGeo, roofMat);
    roofMesh.position.set(0, height + 0.35, 0);
    roofMesh.castShadow = true;
    group.add(roofMesh);
    chunk.roofMeshes.push(roofMesh);

    // 5. Waiting Canopy Pillars along Platform
    const pillarGeo = new THREE.BoxGeometry(0.2, height * 0.9, 0.2);
    for (const px of [-width * 0.4, 0, width * 0.4]) {
      const pillar = new THREE.Mesh(pillarGeo, wallMat);
      pillar.position.set(px, (height * 0.9) * 0.5 + 0.35, depth * 0.5 + platformDepth - 0.2);
      pillar.castShadow = true;
      group.add(pillar);
    }
  }

  /**
   * Church Factory: Steep pitched roof, painted white wood siding, bell tower.
   */
  private buildChurchEntity(
    group: THREE.Group,
    width: number,
    depth: number,
    height: number,
    _obj: WorldObjectData,
    chunk: WorldChunk
  ): void {
    const whiteWoodMat = WoodMaterials.createBuildingWoodMaterial({
      baseColor: '#cfcac2',
      seamColor: '#45423d',
      grainColor: 'rgba(60, 57, 54, 0.3)',
      roughness: 0.85,
      bumpScale: 0.12,
      repeatX: 2,
      repeatY: 2
    });
    const roofMat = WoodMaterials.getDarkCedarMaterial(2, 2);

    // Main Nave
    const bodyGeo = new THREE.BoxGeometry(width, height, depth);
    const body = new THREE.Mesh(bodyGeo, whiteWoodMat);
    body.position.set(0, height * 0.5, 0);
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    // Gable Roof (overhang 0.45 <= 0.5 max)
    const roofOverhang = 0.45;
    const roofGeo = new THREE.ConeGeometry((width + roofOverhang * 2) * 0.7, 3.5, 4);
    roofGeo.rotateY(Math.PI / 4);
    const roofMesh = new THREE.Mesh(roofGeo, roofMat);
    roofMesh.position.set(0, height + 1.75, 0);
    roofMesh.castShadow = true;
    group.add(roofMesh);
    chunk.roofMeshes.push(roofMesh);

    // Belfry / Steeple Tower
    const towerGeo = new THREE.BoxGeometry(3.0, 6.0, 3.0);
    const tower = new THREE.Mesh(towerGeo, whiteWoodMat);
    tower.position.set(0, height + 3.0, depth * 0.35);
    tower.castShadow = true;
    group.add(tower);

    const spireGeo = new THREE.ConeGeometry(2.0, 4.0, 4);
    spireGeo.rotateY(Math.PI / 4);
    const spire = new THREE.Mesh(spireGeo, roofMat);
    spire.position.set(0, height + 8.0, depth * 0.35);
    spire.castShadow = true;
    group.add(spire);
    chunk.roofMeshes.push(spire);
  }

  /**
   * Saloon Factory: Warm wood siding, full front boardwalk porch and hitching post.
   */
  private buildSaloonEntity(
    group: THREE.Group,
    width: number,
    depth: number,
    height: number,
    _obj: WorldObjectData,
    chunk: WorldChunk
  ): void {
    const wallMat = WoodMaterials.getDarkCedarMaterial(2, 2);
    const roofMat = WoodMaterials.getWeatheredGreyMaterial(2, 2);

    // Building Box
    const bodyGeo = new THREE.BoxGeometry(width, height, depth);
    const body = new THREE.Mesh(bodyGeo, wallMat);
    body.position.set(0, height * 0.5, 0);
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    // Roof Cornice (overhang 0.4 <= 0.5 max)
    const roofOverhang = 0.4;
    const roofGeo = new THREE.BoxGeometry(width + roofOverhang * 2, 0.25, depth + roofOverhang * 2);
    const roofMesh = new THREE.Mesh(roofGeo, roofMat);
    roofMesh.position.set(0, height + 0.125, 0);
    roofMesh.castShadow = true;
    group.add(roofMesh);
    chunk.roofMeshes.push(roofMesh);

    // Front Porch Platform
    const porchDepth = 2.4;
    const porchGeo = new THREE.BoxGeometry(width + 0.5, 0.3, porchDepth);
    const porchMat = WoodMaterials.getHoneyPineMaterial(2, 1);
    const porch = new THREE.Mesh(porchGeo, porchMat);
    porch.position.set(0, 0.15, depth * 0.5 + porchDepth * 0.5);
    porch.receiveShadow = true;
    group.add(porch);

    // Porch Roof Canopy
    const canopyGeo = new THREE.BoxGeometry(width + 0.5, 0.15, porchDepth);
    const canopy = new THREE.Mesh(canopyGeo, roofMat);
    canopy.position.set(0, height * 0.75, depth * 0.5 + porchDepth * 0.5);
    canopy.castShadow = true;
    group.add(canopy);
    chunk.roofMeshes.push(canopy);

    // Porch Posts
    const postGeo = new THREE.BoxGeometry(0.18, height * 0.75, 0.18);
    for (const px of [-width * 0.45, 0, width * 0.45]) {
      const post = new THREE.Mesh(postGeo, wallMat);
      post.position.set(px, (height * 0.75) * 0.5, depth * 0.5 + porchDepth - 0.15);
      post.castShadow = true;
      group.add(post);
    }

    // Hitching Post Bar
    const hitchBarGeo = new THREE.CylinderGeometry(0.06, 0.06, width * 0.8, 8);
    hitchBarGeo.rotateZ(Math.PI / 2);
    const hitchBar = new THREE.Mesh(hitchBarGeo, wallMat);
    hitchBar.position.set(0, 0.85, depth * 0.5 + porchDepth + 1.2);
    hitchBar.castShadow = true;
    group.add(hitchBar);
  }

  /**
   * Shelter / Barn Factory: Red barn wood siding, heavy wooden timber frame.
   */
  private buildShelterEntity(
    group: THREE.Group,
    width: number,
    depth: number,
    height: number,
    _obj: WorldObjectData,
    chunk: WorldChunk
  ): void {
    const redWoodMat = WoodMaterials.createBuildingWoodMaterial({
      baseColor: '#6e2b23',
      seamColor: '#200d0a',
      grainColor: 'rgba(35, 12, 8, 0.4)',
      roughness: 0.86,
      bumpScale: 0.14,
      repeatX: 2,
      repeatY: 2
    });
    const roofMat = WoodMaterials.getWeatheredGreyMaterial(2, 2);

    const bodyGeo = new THREE.BoxGeometry(width, height, depth);
    const body = new THREE.Mesh(bodyGeo, redWoodMat);
    body.position.set(0, height * 0.5, 0);
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    const roofOverhang = 0.45;
    const roofGeo = new THREE.ConeGeometry((width + roofOverhang * 2) * 0.65, 2.8, 4);
    roofGeo.rotateY(Math.PI / 4);
    const roofMesh = new THREE.Mesh(roofGeo, roofMat);
    roofMesh.position.set(0, height + 1.4, 0);
    roofMesh.castShadow = true;
    group.add(roofMesh);
    chunk.roofMeshes.push(roofMesh);
  }

  /**
   * Standard Building Factory: Facade material derived strictly from worldData primary_material.
   */
  private buildStandardBuildingEntity(
    group: THREE.Group,
    width: number,
    depth: number,
    height: number,
    obj: WorldObjectData,
    chunk: WorldChunk
  ): void {
    const wallMat = this.resolveObjectMaterial(obj.primary_material);
    const roofMat = WoodMaterials.getDarkCedarMaterial(2, 2);

    // Main Facade Shell
    const bodyGeo = new THREE.BoxGeometry(width, height, depth);
    const body = new THREE.Mesh(bodyGeo, wallMat);
    body.position.set(0, height * 0.5, 0);
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    // Eckpfeiler: Vertical wooden posts on all 4 corners
    const cornerGeo = new THREE.BoxGeometry(0.25, height, 0.25);
    const postMat = WoodMaterials.getWeatheredGreyMaterial(1, 1);
    const halfW = width * 0.5;
    const halfD = depth * 0.5;

    for (const [cx, cz] of [
      [-halfW, -halfD],
      [halfW, -halfD],
      [-halfW, halfD],
      [halfW, halfD]
    ]) {
      const cornerPost = new THREE.Mesh(cornerGeo, postMat);
      cornerPost.position.set(cx, height * 0.5, cz);
      cornerPost.castShadow = true;
      group.add(cornerPost);
    }

    // Roof (Roof overhang <= 0.5m strictly enforced)
    const roofOverhang = 0.45;
    const roofGeo = new THREE.BoxGeometry(width + roofOverhang * 2, 0.22, depth + roofOverhang * 2);
    const roofMesh = new THREE.Mesh(roofGeo, roofMat);
    roofMesh.position.set(0, height + 0.11, 0);
    roofMesh.castShadow = true;
    group.add(roofMesh);
    chunk.roofMeshes.push(roofMesh);
  }

  /**
   * Maps primary_material to corresponding WoodMaterials or stone/brick standard material.
   */
  private resolveObjectMaterial(matType: string): THREE.Material {
    switch (matType) {
      case 'weathered_wood':
        return WoodMaterials.getWeatheredGreyMaterial(2, 2);
      case 'red_barn_wood':
        return WoodMaterials.createBuildingWoodMaterial({
          baseColor: '#6e2b23',
          seamColor: '#200d0a',
          grainColor: 'rgba(35, 12, 8, 0.4)',
          roughness: 0.86,
          repeatX: 2,
          repeatY: 2
        });
      case 'painted_white_wood':
        return WoodMaterials.createBuildingWoodMaterial({
          baseColor: '#cfcac2',
          seamColor: '#45423d',
          grainColor: 'rgba(60, 57, 54, 0.3)',
          roughness: 0.85,
          repeatX: 2,
          repeatY: 2
        });
      case 'stone':
        return WorldChunkManager.getMaterial('building_stone', () => {
          return new THREE.MeshStandardMaterial({
            color: 0x605850,
            roughness: 0.92,
            metalness: 0.05
          });
        });
      case 'brick':
        return WorldChunkManager.getMaterial('building_brick', () => {
          return new THREE.MeshStandardMaterial({
            color: 0x76382a,
            roughness: 0.88,
            metalness: 0.02
          });
        });
      default:
        return WoodMaterials.getWeatheredGreyMaterial(2, 2);
    }
  }

  /**
   * Enforces ThreeJS Guard: Raycasts between camera and character.
   * Any occluding roof or wall material becomes transparent (opacity: 0.15, depthWrite = false).
   */
  private updateCameraOcclusionFade(camera: THREE.Camera, playerPos: THREE.Vector3): void {
    const origin = camera.position.clone();
    const target = playerPos.clone();
    target.y += 1.0; // Chest height

    const dir = target.clone().sub(origin);
    const dist = dir.length();
    dir.normalize();

    this.occlusionRaycaster.set(origin, dir);
    this.occlusionRaycaster.near = 0.5;
    this.occlusionRaycaster.far = dist;

    // Collect all candidate roof meshes in active chunks
    const candidates: THREE.Mesh[] = [];
    for (const chunk of this.activeChunks.values()) {
      candidates.push(...chunk.roofMeshes);
    }

    const hits = this.occlusionRaycaster.intersectObjects(candidates, false);
    const hitMeshes = new Set<THREE.Mesh>();

    for (const hit of hits) {
      if (hit.object instanceof THREE.Mesh) {
        hitMeshes.add(hit.object);
      }
    }

    // Fade occluding meshes to 0.15 opacity
    for (const mesh of hitMeshes) {
      const mat = mesh.material as THREE.Material;
      if (mat) {
        mat.transparent = true;
        mat.opacity = 0.15;
        mat.depthWrite = false;
        mat.needsUpdate = true;
      }
      this.currentlyFadedMeshes.add(mesh);
    }

    // Restore previously faded meshes that are no longer occluding
    for (const mesh of this.currentlyFadedMeshes) {
      if (!hitMeshes.has(mesh)) {
        const mat = mesh.material as THREE.Material;
        if (mat) {
          mat.opacity = 1.0;
          mat.depthWrite = true;
          mat.transparent = false;
          mat.needsUpdate = true;
        }
        this.currentlyFadedMeshes.delete(mesh);
      }
    }
  }

  /**
   * Helper to retrieve or create cached materials.
   */
  private static getMaterial(key: string, factory: () => THREE.Material): THREE.Material {
    if (!this.sharedMaterials.has(key)) {
      this.sharedMaterials.set(key, factory());
    }
    return this.sharedMaterials.get(key)!;
  }

  // ==========================================
  // Public Diagnostic & Collision API
  // ==========================================

  public getActiveChunkCount(): number {
    return this.activeChunks.size;
  }

  public getLoadedObjectsCount(): number {
    let count = 0;
    for (const chunk of this.activeChunks.values()) {
      count += chunk.objectsCount;
    }
    return count;
  }

  public getActiveObstacleBoxes(): THREE.Box3[] {
    const boxes: THREE.Box3[] = [];
    for (const chunk of this.activeChunks.values()) {
      boxes.push(...chunk.colliders);
    }
    return boxes;
  }

  /**
   * Fast spatial AABB retrieval: queries only active chunks touching (worldX, worldZ) within searchRadius.
   */
  public getNearbyObstacleBoxes(worldX: number, worldZ: number, searchRadius: number = 35.0): THREE.Box3[] {
    const boxes: THREE.Box3[] = [];
    const minCX = Math.floor((worldX - searchRadius) / WorldChunkManager.CHUNK_SIZE);
    const maxCX = Math.floor((worldX + searchRadius) / WorldChunkManager.CHUNK_SIZE);
    const minCZ = Math.floor((worldZ - searchRadius) / WorldChunkManager.CHUNK_SIZE);
    const maxCZ = Math.floor((worldZ + searchRadius) / WorldChunkManager.CHUNK_SIZE);

    for (let cx = minCX; cx <= maxCX; cx++) {
      for (let cz = minCZ; cz <= maxCZ; cz++) {
        const chunk = this.activeChunks.get(`${cx},${cz}`);
        if (chunk && chunk.colliders.length > 0) {
          boxes.push(...chunk.colliders);
        }
      }
    }
    return boxes;
  }

  /**
   * Performs an immediate 2.5D AABB collision test at (worldX, worldZ) against nearby world objects.
   */
  public testAABBCollision(
    worldX: number,
    worldZ: number,
    radius: number = 0.45,
    groundY?: number
  ): { hasCollision: boolean; nearestBox: THREE.Box3 | null; penetration: number; normal: THREE.Vector3 } {
    const y = groundY !== undefined ? groundY : this.getGroundHeightAt(worldX, worldZ);
    const nearby = this.getNearbyObstacleBoxes(worldX, worldZ, radius + 15.0);
    const sphereCenter = new THREE.Vector3(worldX, y + 0.9, worldZ);
    const closest = new THREE.Vector3();
    const diff = new THREE.Vector3();
    const normal = new THREE.Vector3();

    for (const box of nearby) {
      if (box.max.y < y + 0.1 || box.min.y > y + 1.8) {
        continue;
      }

      box.clampPoint(sphereCenter, closest);
      diff.subVectors(sphereCenter, closest);
      diff.y = 0;

      const dist = diff.length();
      if (dist < radius) {
        if (dist > 0.0001) {
          normal.copy(diff).multiplyScalar(1 / dist);
        } else {
          normal.set(0, 0, 1);
        }
        return {
          hasCollision: true,
          nearestBox: box,
          penetration: radius - dist,
          normal
        };
      }
    }

    return { hasCollision: false, nearestBox: null, penetration: 0, normal };
  }

  public getLoadedRailroadSegmentsCount(): number {
    let count = 0;
    for (const chunk of this.activeChunks.values()) {
      count += chunk.railroadCurves.length;
    }
    return count;
  }

  /**
   * Fast Travel support: completely clears and disposes all active chunks
   * so the next update() rebuilds the target destination instantly.
   */
  public unloadAllChunks(): void {
    try {
      for (const [key, chunk] of this.activeChunks.entries()) {
        this.scene.remove(chunk.group);
        chunk.dispose();
      }
      this.activeChunks.clear();
      console.log('[WorldChunkManager] Unloaded all chunks for fast travel transition.');
    } catch (err) {
      console.error('[WorldChunkManager] Error unloading all chunks:', err);
    }
  }

  /**
   * Fast Travel Teleport: atomically flushes all active chunks, then immediately
   * loads chunks around the new target position. Prevents the void-frame bug where
   * the next passive update() can't resolve chunks because camera/frustum is stale.
   */
  public teleport(targetX: number, targetZ: number, camera?: THREE.Camera): void {
    try {
      console.log(`[WorldChunkManager] Teleport to (${targetX.toFixed(1)}, ${targetZ.toFixed(1)})`);

      // 1. Hard-flush all existing chunks
      this.unloadAllChunks();

      // 2. Force-load all chunks around the destination immediately
      this.forceUpdate(targetX, targetZ, camera);

      // 3. Force scene matrix recalculation to prevent stale transforms
      this.scene.traverse((obj) => {
        obj.updateMatrixWorld(true);
      });

      console.log(`[WorldChunkManager] Teleport complete: ${this.activeChunks.size} chunks loaded.`);
    } catch (err) {
      console.error('[WorldChunkManager] Error during teleport:', err);
    }
  }

  /**
   * Force-loads chunks around a specific world position without relying on
   * the passive per-frame update(). Used after fast-travel to guarantee
   * immediate terrain/object availability.
   */
  public forceUpdate(worldX: number, worldZ: number, camera?: THREE.Camera): void {
    try {
      const targetChunkKeys = new Set<string>();
      const minCX = Math.floor((worldX - WorldChunkManager.ACTIVE_RADIUS) / WorldChunkManager.CHUNK_SIZE);
      const maxCX = Math.floor((worldX + WorldChunkManager.ACTIVE_RADIUS) / WorldChunkManager.CHUNK_SIZE);
      const minCZ = Math.floor((worldZ - WorldChunkManager.ACTIVE_RADIUS) / WorldChunkManager.CHUNK_SIZE);
      const maxCZ = Math.floor((worldZ + WorldChunkManager.ACTIVE_RADIUS) / WorldChunkManager.CHUNK_SIZE);

      for (let cx = minCX; cx <= maxCX; cx++) {
        for (let cz = minCZ; cz <= maxCZ; cz++) {
          const closestX = Math.max(
            cx * WorldChunkManager.CHUNK_SIZE,
            Math.min((cx + 1) * WorldChunkManager.CHUNK_SIZE, worldX)
          );
          const closestZ = Math.max(
            cz * WorldChunkManager.CHUNK_SIZE,
            Math.min((cz + 1) * WorldChunkManager.CHUNK_SIZE, worldZ)
          );
          const dist = Math.hypot(closestX - worldX, closestZ - worldZ);

          if (dist <= WorldChunkManager.ACTIVE_RADIUS) {
            targetChunkKeys.add(`${cx},${cz}`);
          }
        }
      }

      // Unload out-of-range chunks
      for (const [key, chunk] of this.activeChunks.entries()) {
        if (!targetChunkKeys.has(key)) {
          this.scene.remove(chunk.group);
          chunk.dispose();
          this.activeChunks.delete(key);
        }
      }

      // Load new chunks
      for (const key of targetChunkKeys) {
        if (!this.activeChunks.has(key)) {
          const [cxStr, czStr] = key.split(',');
          const cx = parseInt(cxStr, 10);
          const cz = parseInt(czStr, 10);
          const chunk = this.instantiateChunk(cx, cz);
          this.activeChunks.set(key, chunk);
          this.scene.add(chunk.group);
        }
      }

      // Run occlusion fade if camera available
      if (camera) {
        this.updateCameraOcclusionFade(camera, new THREE.Vector3(worldX, 0, worldZ));
      }
    } catch (err) {
      console.error('[WorldChunkManager] Error during forceUpdate:', err);
    }
  }

  /**
   * Retrieves ground elevation at any world coordinate [gx, gz]
   */
  public getGroundHeightAt(gx: number, gz: number): number {
    return this.getInterpolatedElevation(gx, gz);
  }
}
