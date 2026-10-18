import {VenueActivities} from './venues/VenueActivities';
import { HemisphereLight, Box3, Color, DirectionalLight, Group, Mesh, MeshStandardMaterial, Raycaster, RepeatWrapping, Scene, SphereGeometry, Texture, TextureLoader, Vector2, Vector3, Vector4, WebGLRenderer } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { WorldManifest, WorldPlacement } from '@rdo-rpg/world-contracts';
import { createPlayableBoundary, VALENTINE_BOUNDARY } from '@rdo-rpg/world-contracts';

import { FallbackMenu } from './interaction/FallbackMenu';
import { InteractionRuntime } from './interaction/InteractionRuntime';
import { isDetachedTarget, isEditableTarget } from './input/InputTarget';
import { OrthographicFollowCamera } from './player/OrthographicFollowCamera';
import { OcclusionController } from './player/OcclusionController';
import { prepareSourceRaycasts } from './world/SourceRaycasts';
import { PlayerController } from './player/PlayerController';
import { RoadRecovery, parseSourceRoadTargets, type RoadRecoveryActions, type RoadRecoveryResult, type RoadTarget } from './player/RoadRecovery';
import { Hud } from './presentation/Hud';
import { Minimap } from './presentation/Minimap';
import { ModelAssetCache } from './world/ModelAssetCache';
import { loadValentineManifest } from './world/ManifestLoader';
import { WorldChunkManager } from './world/WorldChunkManager';
import { selectHighestDrawableLod } from './world/DrawableLod';
import { TerrainGround } from './world/TerrainGround';
import { VisibleMeshCollision } from './world/VisibleMeshCollision';
import { sceneAssetUrl, sceneManifestUrl } from './world/SceneSource';
import { placementRoles } from './world/PlacementRoles';
import { SourceTraversal } from './world/SourceTraversal';
import { createAuthoredRoom } from './world/AuthoredBank';
import { BUILDINGS } from './buildings/BuildingRegistry';
import { SpatialContextResolver } from './interiors/SpatialContext';
import {toWorld} from './buildings/RoomTransform';
import {updateInteriorWalls} from './interiors/InteriorWalls';
import {pickEntrance} from './interiors/EntrancePicking';
import {installRoomAppearance} from './interiors/RoomAppearance';
import {placeActivityPrompt} from './interiors/ActivityPrompt';
import {bindNativeContextGuard} from './input/NativeContextGuard';
import { resolveProximityHints } from './interiors/ProximityHints';
import { InteriorPresentation } from './interiors/InteriorPresentation';
import { resolveContextCamera } from './player/ContextCamera';
import { MovementMode, type TravelMode } from './input/MovementMode';
import { CanvasPointerGestures } from './input/CanvasPointerGestures';
import { MinigameHost } from './minigames/MinigameHost';
import { MINIGAMES } from './minigames/MinigameRegistry';
import type { ContextAction } from './interaction/FallbackMenu';
import { validateRoadSurface } from './world/RoadRecoverySurface';
import previewSpawn from './data/preview-spawn.json';

export function selectSpawnPosition(manifest: WorldManifest, roadPoint?: { x: number; z: number }): { x: number; y: number; z: number } {
  if (roadPoint && Number.isFinite(roadPoint.x) && Number.isFinite(roadPoint.z)) {
    return { x: roadPoint.x, y: 0, z: roadPoint.z };
  }
  const placement = manifest.placements.find((candidate) => candidate.layer !== 'terrain') ?? manifest.placements[0];
  return placement ? { ...placement.position } : { x: 0, y: 0, z: 0 };
}

export function placementBlocksPlayerAndCamera(placement: Pick<WorldPlacement, 'layer'>): boolean {
  return placement.layer !== 'terrain';
}

export function isRenderablePlacement(placement: Pick<WorldPlacement, 'asset'>): boolean {
  return !placement.asset.endsWith('_reflection_proxy.glb');
}

export function disableTerrainVertexColorMultiplication(instance: Group): void {
  instance.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of materials) {
      if ('vertexColors' in material && material.vertexColors) {
        material.vertexColors = false;
        material.needsUpdate = true;
      }
    }
  });
}

export function prepareDrawableMaterialPreview(instance: Group): void {
  instance.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of materials) {
      // The converter preserves original shader masks, whose blend equation
      // is not represented by its explicitly labelled diffuse-only preview.
      if (typeof material.userData.rdo_material_status === 'string' && material.vertexColors
        && material.userData.rdo_shader_hash !== '0xe5d7af85') {
        material.vertexColors = false;
        material.needsUpdate = true;
      }
      if (material.userData.rdo_alpha_mode === 'MASK') {
        material.alphaTest = 0.5; material.transparent = false;
      } else if (material.userData.rdo_alpha_mode === 'BLEND') {
        material.transparent = true; material.depthWrite = false;
      }
      if (material.userData.rdo_draw_bucket === 2) {
        material.polygonOffset = true; material.polygonOffsetFactor = -2; material.polygonOffsetUnits = -2;
        object.renderOrder = 2;
        if (material.userData.rdo_decal_albedo_opacity === 0) {
          // The source explicitly writes no albedo. A forward diffuse pass
          // would paint white tire marks. Retain the geometry for source/debug
          // inspection; the native normal/roughness-only pass remains pending.
          material.colorWrite = false;
          material.depthWrite = false;
          material.userData.rdo_preview_limitation = 'normal-roughness-decal-pass-pending';
        }
      }
    }
  });
}

export async function prepareTerrainFourLayerPreview(
  instance: Group,
  loadTexture: (url: string) => Promise<Texture>,
): Promise<void> {
  const pending: Promise<void>[] = [];
  instance.traverse((object) => {
    if (!(object instanceof Mesh) || !object.geometry.getAttribute('uv') || !object.geometry.getAttribute('color_1')) return;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of materials) {
      if (!(material instanceof MeshStandardMaterial) || material.userData.rdo_material_status !== 'terrain-four-layer-preview') continue;
      const names = ['rdo_terrain_lookup', 'rdo_terrain_layer0', 'rdo_terrain_layer1', 'rdo_terrain_layer2', 'rdo_terrain_layer3']
        .map((key) => material.userData[key]);
      if (!names.every((name): name is string => typeof name === 'string' && name.length > 0)) continue;
      const vector4 = (key: string, fallback: number[]): number[] => {
        const value = material.userData[key];
        if (value === undefined) return fallback;
        if (!Array.isArray(value) || value.length !== 4 || !value.every((n) => typeof n === 'number' && Number.isFinite(n))) {
          throw new Error(`Invalid terrain parameter: ${key}`);
        }
        return value;
      };
      const scaleBias = vector4('rdo_terrain_uv_scale_bias', [1, 1, 0, 0]);
      const uvSets = vector4('rdo_terrain_uv_set', [1, 1, 1, 1]);
      for (const set of uvSets) {
        if (![1, 2, 3].includes(set) || !object.geometry.getAttribute(set === 1 ? 'uv' : `uv${set - 1}`)) {
          throw new Error(`Terrain geometry is missing source UV set ${set}`);
        }
      }
      const uvDeclarations = [2, 3].filter((set) => uvSets.includes(set))
        .map((set) => `#ifndef USE_UV${set - 1}\nattribute vec2 uv${set - 1};\n#endif`).join('\n');
      const layerVaryings = uvSets.map((_, i) => `varying vec2 vRdoLayerUv${i};`).join('\n');
      const layerAssignments = uvSets.map((set, i) => `vRdoLayerUv${i} = ${set === 1
        ? 'vec2(uv.x * rdoUvScaleBias.x + rdoUvScaleBias.z, uv.y * rdoUvScaleBias.y + 1.0 - rdoUvScaleBias.y - rdoUvScaleBias.w)'
        : `uv${set - 1}`};`).join('\n');
      pending.push((async () => {
        const textures = await Promise.all(names.map((name) => loadTexture(sceneAssetUrl(`textures/terrain/${encodeURIComponent(name)}`))));
        for (const texture of textures) {
          texture.wrapS = RepeatWrapping;
          texture.wrapT = RepeatWrapping;
          texture.flipY = false;
        }
        material.vertexColors = false;
        material.onBeforeCompile = (shader) => {
          Object.assign(shader.uniforms, {
            rdoLookup: { value: textures[0] },
            rdoLayer0: { value: textures[1] },
            rdoLayer1: { value: textures[2] },
            rdoLayer2: { value: textures[3] },
            rdoLayer3: { value: textures[4] },
            rdoUvScaleBias: { value: new Vector4(...scaleBias as [number, number, number, number]) },
          });
          shader.vertexShader = `uniform vec4 rdoUvScaleBias;\n${uvDeclarations}\n${layerVaryings}\nattribute vec4 color_1;\nvarying vec4 vRdoColor1;\nvarying vec2 vRdoUv;\n${shader.vertexShader}`
            .replace('#include <color_vertex>', `#include <color_vertex>\nvRdoColor1 = color_1;\nvRdoUv = uv;\n${layerAssignments}`);
          shader.fragmentShader = `uniform sampler2D rdoLookup;\nuniform sampler2D rdoLayer0;\nuniform sampler2D rdoLayer1;\nuniform sampler2D rdoLayer2;\nuniform sampler2D rdoLayer3;\n${layerVaryings}\nvarying vec4 vRdoColor1;\nvarying vec2 vRdoUv;\n${shader.fragmentShader}`
            .replace('vec4 diffuseColor = vec4( diffuse, opacity );', `
              vec3 rdoControl = mix(texture2D(rdoLookup, vRdoUv).rgb, vRdoColor1.rgb, vRdoColor1.a);
              vec3 rdo01 = mix(sRGBTransferEOTF(texture2D(rdoLayer0, vRdoLayerUv0)).rgb, sRGBTransferEOTF(texture2D(rdoLayer1, vRdoLayerUv1)).rgb, 1.0 - rdoControl.r);
              vec3 rdo23 = mix(sRGBTransferEOTF(texture2D(rdoLayer2, vRdoLayerUv2)).rgb, sRGBTransferEOTF(texture2D(rdoLayer3, vRdoLayerUv3)).rgb, rdoControl.g);
              vec4 diffuseColor = vec4(mix(rdo01, rdo23, rdoControl.b), opacity);
            `);
        };
        material.customProgramCacheKey = () => `rdo-terrain-four-layer-v2:${uvSets.join(',')}`;
        material.userData.rdo_terrain_preview_ready = true;
        material.needsUpdate = true;
      })());
    }
  });
  await Promise.all(pending);
}

const PLAYER_MARKER_RADIUS = 0.4;

/** Player positions are feet; occlusion protects the centre of the rendered marker. */
export function createOcclusionRay(cameraPosition: Vector3, playerPosition: Vector3): Raycaster {
  const direction = playerPosition.clone();
  direction.y += PLAYER_MARKER_RADIUS;
  direction.sub(cameraPosition);
  const distance = direction.length();
  return new Raycaster(cameraPosition, direction.normalize(), 0, distance);
}

export function applyPlacementTransform(instance: Group, placement: Pick<WorldPlacement, 'position' | 'rotation' | 'scale'>): void {
  instance.position.set(placement.position.x, placement.position.y, placement.position.z);
  // GLB and world both use the proper-rotation (game X, game Z, -game Y)
  // basis. A negative instance scale would reflect signs and facades.
  instance.rotation.set(placement.rotation.x, placement.rotation.y, placement.rotation.z, 'XYZ');
  instance.scale.set(placement.scale.x, placement.scale.y, placement.scale.z);
}

interface RuntimePoi {
  id: string;
  name: string;
  position: { x: number; y: number; z: number };
  radius: number;
  category: string;
  manifestRef?: string;
}

declare global {
  interface Window {
    __rdoPreview?: {
      teleport(position: { x: number; y: number; z: number }): void;
      setReferenceCamera(position: { x: number; y: number; z: number }, target: { x: number; y: number; z: number }, visibleHeight?: number): void;
      waitForChunks(): Promise<void>;
      getState(): { frame: number; player: { x: number; y: number; z: number }; cameraType: string; context:{mode:string;buildingId?:string;floorId?:string};travelMode:string;speed:number;visibleSources:number;viewHeight: number; cameraPosition: {x:number;y:number;z:number}; moveTarget?: {x:number;y:number;z:number} };
      project(position: {x:number;y:number;z:number}): {x:number;y:number};
      getCollisionHit(): { asset: string; mesh: string } | undefined;
      getInteriorVisuals(): {room:string;models:string[];texturedMeshes:number;missing:string[]}[];
      getLoadedTransforms(): { asset: string; determinant: number }[];
      getSceneState(): { manifestUrl: string; placements: WorldPlacement[]; blockedReason?: string; blocked: boolean; boundary: typeof VALENTINE_BOUNDARY };
      sampleGround(x: number, z: number, referenceY?: number): number | undefined;
      probeMove(from: { x: number; y: number; z: number }, to: { x: number; y: number; z: number }): {
        allowed: boolean; position: { x: number; y: number; z: number }; reason?: string; hit?: { asset: string; mesh: string };
      };
      getRecoveryState(): {result?:RoadRecoveryResult;lastSafe?:RoadTarget;lastBlock?:unknown;recovering:boolean};
      getOcclusionState(): ReturnType<OcclusionController['getState']>;
    };
  }
}

async function loadPois(): Promise<RuntimePoi[]> {
  try {
    const response = await fetch('/runtime/valentine/pois.json');
    const payload: unknown = await response.json();
    return Array.isArray(payload) ? payload.filter((poi): poi is RuntimePoi => {
      if (!poi || typeof poi !== 'object') return false;
      const value = poi as Record<string, unknown>;
      const position = value.position as Record<string, unknown> | undefined;
      return typeof value.id === 'string' && typeof value.name === 'string' && typeof value.category === 'string'
        && typeof value.radius === 'number' && Number.isFinite(value.radius) && value.radius > 0
        && Boolean(position) && ['x', 'y', 'z'].every((axis) => typeof position?.[axis] === 'number' && Number.isFinite(position[axis] as number));
    }) : [];
  } catch (error) {
    console.error('Could not load Valentine POIs.', error);
    return [];
  }
}

async function loadMissingModelCount(): Promise<number> {
  try {
    const response = await fetch(sceneAssetUrl('missing-models.json'));
    if (!response.ok) return 0;
    const payload: unknown = await response.json();
    const models = payload && typeof payload === 'object' ? (payload as { missingModels?: unknown }).missingModels : undefined;
    return Array.isArray(models) ? models.length : 0;
  } catch { return 0; }
}

export interface ValentineRuntimeOptions {
  onAccountChanged?:()=>void;
  signal?: AbortSignal;
  isInputCaptured?: () => boolean;
  reducedMotion?: () => boolean;
  onInteractionMenu?: (menu: {readonly isOpen: boolean;close(): void}) => void;
  onRoadRecovery?: (actions:RoadRecoveryActions) => void;
}

export async function startValentineRuntime(root: HTMLElement, renderer: WebGLRenderer, options: ValentineRuntimeOptions = {}): Promise<() => void> {
  const manifest = await loadValentineManifest(sceneManifestUrl());
  options.signal?.throwIfAborted();
  const [pois, missingModelCount, roadTargets] = await Promise.all([loadPois(), loadMissingModelCount(),
    fetch('/runtime/valentine/local-preview/ground-truth-traces.json').then(async response=>response.ok?parseSourceRoadTargets(await response.json()):[]).catch(()=>[]),
  ]);
  options.signal?.throwIfAborted();
  const scene = new Scene();
  scene.background = new Color('#151c21');
  scene.add(new HemisphereLight('#dfeeff','#8d9180',2.1));
  const sunlight = new DirectionalLight('#fff8ec', 2.6);
  sunlight.position.set(30, 50, 20);
  scene.add(sunlight);

  const spawn = selectSpawnPosition(manifest, previewSpawn.position);
  const collision = new VisibleMeshCollision();
  const ground = new TerrainGround();
  const boundary = createPlayableBoundary(VALENTINE_BOUNDARY.polygon, VALENTINE_BOUNDARY.playerRadiusMetres);
  const traversal = new SourceTraversal(ground, collision, boundary);
  const authoredRooms = new Map(BUILDINGS.playable.flatMap(building=>building.floors.map(floor=>[
    floor.layout.placementId,{...createAuthoredRoom(floor.layout),floorY:floor.layout.floorY,key:`${building.id}/${floor.id}`},
  ] as const)));
  const presentation=new InteriorPresentation();
  const spatial=new SpatialContextResolver(BUILDINGS.playable,(_building,floor,position)=>{
    const c=floor.layout,candidate=toWorld(c,{x:c.doorX,y:position.y,z:c.front+c.frontDirection*.3});
    return traversal.resolve(position,candidate);
  });
  const movementMode=new MovementMode();
  let pathMode:TravelMode='walk',travelMode:TravelMode|'stopped'='walk';
  let player: PlayerController | undefined;
  let blockedReason: 'terrain' | 'obstacle' | 'boundary' | undefined;
  let disposed=false,recovering=false;
  let recoveryResult:RoadRecoveryResult|undefined;
  let lastBlock: {reason?:string;from:{x:number;y:number;z:number};attempt:{x:number;y:number;z:number};hit?:{asset:string;mesh:string}}|undefined;
  const canOccupy = (position: { x: number; y: number; z: number }): boolean => {
    if (!player) return false;
    const allowed = traversal.resolve(player.position, position);
    if (!allowed && blockedReason !== 'terrain') blockedReason = traversal.blockedReason;
    if(!allowed) lastBlock={reason:traversal.blockedReason,from:{...player.position},attempt:{...position},hit:collision.lastHit?{...collision.lastHit}:undefined};
    return allowed;
  };
  player = new PlayerController(spawn, 6, canOccupy,position=>{
    const restricted=spatial.restrictsRunning(position);
    if(restricted)pathMode='walk';
    travelMode=movementMode.resolve(restricted,false,moveTarget?pathMode:undefined);
    return travelMode==='run'?1.5:1;
  });
  const playerMarker = new Mesh(new SphereGeometry(PLAYER_MARKER_RADIUS, 16, 12), new MeshStandardMaterial({ color: '#eac573', emissive:'#6e4a16', depthTest:false,transparent:true,depthWrite:false }));
  playerMarker.renderOrder=1000;
  playerMarker.position.set(spawn.x, spawn.y + PLAYER_MARKER_RADIUS, spawn.z);
  scene.add(playerMarker);
  const cameraController = new OrthographicFollowCamera(Math.max(root.clientWidth, 1) / Math.max(root.clientHeight, 1));
  const loader = new GLTFLoader();
  const textureLoader = new TextureLoader();
  const assets = new ModelAssetCache(async (asset) => {
    const gltf = await loader.loadAsync(sceneAssetUrl(asset));
    prepareDrawableMaterialPreview(gltf.scene);
    await prepareTerrainFourLayerPreview(gltf.scene, (url) => textureLoader.loadAsync(url));
    selectHighestDrawableLod(gltf.scene);
    return gltf.scene;
  });
  const occluders: Group[] = [];
  const world = new WorldChunkManager(manifest, async (placement: WorldPlacement) => {
    if (options.signal?.aborted) return {dispose() {}};
    if (!isRenderablePlacement(placement)) return { dispose() {} };
    const lease = await assets.acquire(placement.asset);
    if (options.signal?.aborted) {lease.dispose();return {dispose() {}};}
    const instance = lease.instance;
    prepareSourceRaycasts(instance);
    instance.userData.sourceAsset = placement.asset;
    instance.userData.placementId = placement.id;
    applyPlacementTransform(instance, placement);
    if (placement.layer === 'terrain') disableTerrainVertexColorMultiplication(instance);
    scene.add(instance);
    const roles = placementRoles(placement);
    const authoredRoom = authoredRooms.get(placement.id);
    if(authoredRoom) {
      scene.add(authoredRoom.support,authoredRoom.interior); ground.add(authoredRoom.support,'structure'); collision.add(authoredRoom.walls);
      presentation.registerRoom(authoredRoom.key,authoredRoom);
    }
    if (roles.occluder) occluders.push(instance);
    instance.updateWorldMatrix(true, true);
    if (roles.support) ground.add(instance, placement.layer === 'terrain' ? 'terrain' : 'structure');
    if (roles.obstacle && !authoredRoom) collision.add(instance);
    presentation.trackSource(instance);
    return { dispose: () => {
      presentation.untrackSource(instance);scene.remove(instance);
      const index = occluders.indexOf(instance);
      if (index >= 0) occluders.splice(index, 1);
      collision.remove(instance);
      ground.remove(instance);
      if(authoredRoom) {presentation.unregisterRoom(authoredRoom.key);scene.remove(authoredRoom.support,authoredRoom.interior);ground.remove(authoredRoom.support);collision.remove(authoredRoom.walls);}
      lease.dispose();
    } };
  });
  const appearanceLeases:Awaited<ReturnType<typeof installRoomAppearance>>[]=[];
  const releaseAppearances=()=>{appearanceLeases.splice(0).forEach(lease=>lease.dispose());};
  const cancelStartup=(): void=> {try {world.dispose();}catch(error){console.error('Could not cancel source startup.',error);}};
  options.signal?.addEventListener('abort',cancelStartup,{once:true});
  try {
    for(const building of BUILDINGS.playable)for(const floor of building.floors){
      const appearance=floor.layout.appearance,room=authoredRooms.get(floor.layout.placementId);if(!appearance || !room)continue;
      const lease=await installRoomAppearance(room,appearance,url=>assets.acquire(url),url=>textureLoader.loadAsync(sceneAssetUrl(url)));
      appearanceLeases.push(lease);if(lease.missing.length)console.warn('Interior source visuals missing; keeping fallback.',lease.missing);
    }
    options.signal?.throwIfAborted();
    await world.update(player.position.x, player.position.z);
  }
  catch(error) {world.dispose();releaseAppearances();authoredRooms.forEach(room=>room.dispose());playerMarker.geometry.dispose();playerMarker.material.dispose();throw error;}
  finally { options.signal?.removeEventListener('abort',cancelStartup); }
  const spawnGroundHeight = ground.heightAt(player.position.x, player.position.z);
  if (options.signal?.aborted || spawnGroundHeight===undefined) {
    world.dispose();releaseAppearances();authoredRooms.forEach(room=>room.dispose());playerMarker.geometry.dispose();playerMarker.material.dispose();
    if(options.signal?.aborted) options.signal.throwIfAborted();
    throw new Error('Am Startpunkt fehlt belegtes Terrain. Bitte Quelldaten prüfen.');
  }
  if (spawnGroundHeight !== undefined) {
    player.position.y = spawnGroundHeight;
    playerMarker.position.y = spawnGroundHeight + PLAYER_MARKER_RADIUS;
  }

  spatial.reset(player.position);presentation.apply(spatial.current);
  ground.setPickFilter(group=>group.visible);
  const releaseNativeContext=bindNativeContextGuard(root);
  const menu = new FallbackMenu();
  const darts = new MinigameHost(root,MINIGAMES,message=>menu.open(message));
  const venues=new VenueActivities(root,options.onAccountChanged);
  options.onInteractionMenu?.({get isOpen(){return menu.isOpen || darts.isOpen || venues.isOpen;},close(){menu.close();darts.close();venues.close();}});
  const hud = new Hud(root);
  const minimap = new Minimap();
  const occlusion = new OcclusionController(occluders);
  const saloon=BUILDINGS.byId.get('smithfields-saloon')!;
  const activeHints=()=>resolveProximityHints(spatial.current,player.position,(from,to)=>!collision.blocksTransition(from,to),action=>{
    if(venues.supports(action.kind))return true;
    try{MINIGAMES.resolve(action.gameId!,action.variantId!);return true;}catch{return false;}
  });
  const nearbyAction=()=>{
    const context=spatial.current;if(context.mode!=='indoor')return;
    const hints=activeHints().filter(h=>h.kind==='action').sort((a,b)=>Math.hypot(player.position.x-a.position.x,player.position.z-a.position.z)-Math.hypot(player.position.x-b.position.x,player.position.z-b.position.z));
    const hint=hints[0],action=context.building?.actions.find(a=>a.id===hint?.actionId);
    return hint && action && context.building?{hint,action,building:context.building}:undefined;
  };
  const nearbyPoi = (): RuntimePoi | undefined => {
    const context=spatial.current;
    if(context.mode==='indoor'){const current=nearbyAction();return current?{id:'authored-'+current.building.id+'-'+current.action.id,name:current.action.label??current.action.id,
      category:'building-action',position:current.hint.position,radius:current.action.radius!}:undefined;}
    return pois.filter(p=>p.category!=='saloon-darts' && p.manifestRef!==saloon.sourcePlacementIds[0]).find((poi)=>Math.hypot(player.position.x-poi.position.x,player.position.z-poi.position.z)<=poi.radius);
  };
  let moveTarget: {x:number;y:number;z:number}|undefined;
  const openPoi = (): void => {
    moveTarget=undefined;pressed.clear();movementMode.cancel();gestures?.cancel();
    const poi=nearbyPoi();
    if(poi?.category==='building-action'){const current=nearbyAction();if(!current)return;const {action,building}=current;
      if(venues.supports(action.kind))venues.open(action.kind);else void darts.open(action.gameId!,action.variantId!,{buildingId:building.id,floorId:action.floorId!,actionId:action.id});}
    else if(poi) menu.open(`Interaktion für „${poi.name}“ ist noch nicht verfügbar.`);
  };
  const interactions = new InteractionRuntime({ getActivePoi: () => nearbyPoi(), menu,onInteract:openPoi });
  const dartsPrompt=document.createElement('button');
  dartsPrompt.type='button';dartsPrompt.className='rdo-activity-prompt';dartsPrompt.textContent='Darts spielen · F';
  dartsPrompt.setAttribute('aria-label','Saloon-Darts spielen');dartsPrompt.hidden=true;root.append(dartsPrompt);
  const onDartsPrompt=(event:MouseEvent):void=>{
    try {if(!event || event.defaultPrevented || !dartsPrompt.isConnected || inputCaptured() || !nearbyAction())return;
      event.preventDefault();openPoi();
    } catch(error){console.error('Could not open saloon activity.',error);}
  };
  dartsPrompt.addEventListener('click',onDartsPrompt);
  const exitPrompt=document.createElement('button');exitPrompt.type='button';exitPrompt.className='rdo-activity-prompt';exitPrompt.textContent='↗ Draußen';exitPrompt.setAttribute('aria-label','Gebäude verlassen');
  exitPrompt.hidden=true;root.append(exitPrompt);
  const onExitPrompt=(event:MouseEvent)=>{try{
    if(!event || event.defaultPrevented || !exitPrompt.isConnected || inputCaptured() || spatial.current.mode!=='indoor' || !spatial.current.floor)return;
    const c=spatial.current.floor.layout,destination=toWorld(c,{x:c.doorX,y:c.floorY,z:c.front+c.frontDirection*.85});
    if(!traversal.resolve(player.position,destination))return;
    event.preventDefault();movementMode.cancel();pressed.clear();gestures.cancel();pathMode='walk';moveTarget=destination;
  }catch(error){console.error('Could not leave interior.',error);}};
  exitPrompt.addEventListener('click',onExitPrompt);
  const validateRoadTarget=(target:RoadTarget)=>validateRoadSurface(target.position,ground,collision,boundary);
  const spawnTarget:RoadTarget={id:`${previewSpawn.source.traceId}#${previewSpawn.source.pointIndex}`,position:{...previewSpawn.position},
    source:{path:previewSpawn.source.file,traceId:previewSpawn.source.traceId,pointIndex:previewSpawn.source.pointIndex}};
  const recovery=new RoadRecovery(roadTargets,spawnTarget,{
    prepare:target=>world.prepareRegion(target.position.x,target.position.z),validate:validateRoadTarget,
    isActive:()=>!disposed && !options.signal?.aborted && root.isConnected,
    apply:position=>{
      pressed.clear();moveTarget=undefined;gestures?.cancel();player.setMovement({forward:0,right:0});Object.assign(player.position,position);player.blocked=false;
      blockedReason=undefined;frameFailed=false;menu.close();cameraController.clearReferencePose();
      playerMarker.position.set(position.x,position.y+PLAYER_MARKER_RADIUS,position.z);
      movementMode.cancel();spatial.reset(position);presentation.apply(spatial.current);
      cameraController.update(position);lastBlock=undefined;
    },
  });
  let pendingRecovery:Promise<RoadRecoveryResult>|undefined;
  const recoveryActions:RoadRecoveryActions={resetToRoad:()=>{
    if(pendingRecovery) return pendingRecovery;
    if(disposed || options.signal?.aborted || !root.isConnected) return Promise.resolve({status:'cancelled',message:'Die Szene ist beendet.'});
    recovering=true;movementMode.cancel();pressed.clear();moveTarget=undefined;gestures?.cancel();player.setMovement({forward:0,right:0});menu.close();darts.close();venues.close();
    pendingRecovery=(async()=>{
      try {recoveryResult=await recovery.reset();return recoveryResult;}
      finally {
        try {if(!disposed && !options.signal?.aborted) await world.update(player.position.x,player.position.z);}
        finally {recovering=false;pendingRecovery=undefined;}
      }
    })();return pendingRecovery;
  }};
  const previewApi: Window['__rdoPreview'] = import.meta.env.DEV ? {
    teleport(position): void {
      moveTarget=undefined;
      player.position.x = position.x;
      player.position.y = position.y;
      player.position.z = position.z;
      movementMode.cancel();spatial.reset(position);presentation.apply(spatial.current);
    },
    setReferenceCamera(position, target, visibleHeight): void {
      cameraController.setReferencePose(position, target, visibleHeight);
    },
    waitForChunks: () => world.waitForIdle(),
    getCollisionHit: () => collision.lastHit,
    getRecoveryState:()=>({result:recoveryResult,lastSafe:recovery.lastSafeTarget,lastBlock,recovering}),
    getOcclusionState:()=>occlusion.getState(),
    getSceneState: () => ({ manifestUrl: sceneManifestUrl(), placements: manifest.placements, blockedReason, blocked: player.blocked,
      boundary: VALENTINE_BOUNDARY }),
    sampleGround: (x, z, referenceY) => ground.heightAt(x, z, referenceY),
    probeMove: (from, to) => {
      const candidate = { ...to };
      const allowed = traversal.resolve(from, candidate);
      return { allowed, position: candidate, reason: traversal.blockedReason, hit: collision.lastHit };
    },
    getInteriorVisuals:()=>Array.from(authoredRooms.values()).map(room=>{
      let texturedMeshes=0;for(const group of [room.support,room.interior])group.traverse(object=>{
        if(object instanceof Mesh && (Array.isArray(object.material)?object.material:[object.material]).some(material=>material instanceof MeshStandardMaterial && Boolean(material.map)))texturedMeshes++;
      });
      return {room:room.key,models:room.interior.children.filter(child=>child.userData.provenance==='source-derived-gameplay-variant').map(child=>String(child.userData.sourceAsset)),texturedMeshes,missing:appearanceLeases.flatMap(lease=>lease.missing)};
    }),
    getLoadedTransforms: () => {
      scene.updateMatrixWorld(true);
      const transforms: { asset: string; determinant: number }[] = [];
      scene.traverse((object) => {
        if (typeof object.userData.sourceAsset === 'string') {
          transforms.push({ asset: object.userData.sourceAsset, determinant: object.matrixWorld.determinant() });
        }
      });
      return transforms;
    },
    getState: () => ({ frame: frameCount, player: { ...player.position }, cameraType: cameraController.camera.type,context:{mode:spatial.current.mode,buildingId:spatial.current.building?.id,floorId:spatial.current.floor?.id},travelMode,speed:player.speedPerSecond,visibleSources:occluders.filter(g=>g.visible).length,
      cameraPosition:{x:cameraController.camera.position.x,y:cameraController.camera.position.y,z:cameraController.camera.position.z},moveTarget,
      viewHeight: (cameraController.camera.top - cameraController.camera.bottom) / cameraController.camera.zoom }),
    project: position=> {const p=new Vector3(position.x,position.y,position.z).project(cameraController.camera);
      const rect=renderer.domElement.getBoundingClientRect();return {x:rect.left+(p.x+1)*rect.width/2,y:rect.top+(1-p.y)*rect.height/2};},
  } : undefined;
  if (previewApi) window.__rdoPreview = previewApi;
  const pressed = new Set<string>();
  const inputCaptured=():boolean=>recovering || disposed || menu.isOpen || darts.isOpen || venues.isOpen || Boolean(options.isInputCaptured?.()) || !root.isConnected;
  const pickDestination=(x:number,y:number):{point?:Vector3;message:string}=> {
    const rect=renderer.domElement.getBoundingClientRect();
    if(rect.width<=0 || rect.height<=0)return {message:'Die Weltansicht ist noch nicht bereit.'};
    const ray=new Raycaster();ray.setFromCamera(new Vector2((x-rect.left)/rect.width*2-1,1-(y-rect.top)/rect.height*2),cameraController.camera);
    const entrance=pickEntrance(ray,player.position,BUILDINGS.playable,point=>traversal.resolve(player.position,{...point}));
    if(entrance)return {point:entrance,message:'Der Eingang ist frei.'};
    let message='Dort ist kein erreichbarer Boden sichtbar.';
    const point=ground.pick(ray,player.position.y,hit=>{
      if(Math.hypot(hit.x-player.position.x,hit.z-player.position.z)>30){message='Bitte wähle ein näheres Ziel (bis 30 Meter).';return false;}
      const candidate={x:hit.x,y:hit.y,z:hit.z};
      if(!traversal.resolve(player.position,candidate)){message=traversal.blockedReason==='boundary'?'Das Ziel liegt hinter der Ortsgrenze.':
        traversal.blockedReason==='terrain'?'Auf dem direkten Weg fehlt begehbarer Boden.':'Der direkte Weg ist versperrt. Wähle Zwischenziele um das Hindernis.';return false;}
      // A ray may hit an inaccessible roof first: only accept the surface actually reached by walking.
      return Math.abs(candidate.y-hit.y)<0.08;
    });
    return point?{point,message:'Direkter Weg ist frei.'}:{message};
  };
  const gestures=new CanvasPointerGestures(renderer.domElement,{
    isCaptured:inputCaptured,
    onCancel:()=>{movementMode.cancel();pressed.clear();moveTarget=undefined;},
    onRotate:delta=>cameraController.rotate(delta),
    onMoveClick:(x,y)=> {
      const poi=nearbyPoi();
      if(poi && poi.category!=='building-action') {
        const rect=renderer.domElement.getBoundingClientRect();
        const ray=new Raycaster();ray.setFromCamera(new Vector2((x-rect.left)/rect.width*2-1,1-(y-rect.top)/rect.height*2),cameraController.camera);
        const hit=ray.intersectObjects(occluders,true)[0];
        let object: typeof hit.object | undefined=hit?.object;
        while(object && typeof object.userData.placementId!=='string')object=object.parent??undefined;
        if(object && object.userData.placementId===poi.manifestRef) {openPoi();return;}
      }
      const result=pickDestination(x,y);moveTarget=undefined;pressed.clear();
      if(result.point){pathMode='walk';moveTarget={x:result.point.x,y:result.point.y,z:result.point.z};}
      else menu.open(result.message);
    },
    onContext:(x,y)=> {
      moveTarget=undefined;pressed.clear();
      const result=pickDestination(x,y), actions:ContextAction[]=[];
      if(result.point){const point={x:result.point.x,y:result.point.y,z:result.point.z};actions.push({label:'LAUFEN',run:()=>{pathMode='walk';moveTarget=point;}});
        if(!spatial.restrictsRunning(player.position) && spatial.current.mode!=='indoor')actions.push({label:'RENNEN',run:()=>{pathMode='run';moveTarget=point;}});}
      const poi=nearbyPoi();
      if(poi)actions.push({label:poi.category==='building-action'?poi.name:`${poi.name}: Interagieren`,run:openPoi});
      menu.open(poi?`${poi.name} · ${result.message}`:result.message,actions);
    },
  });
  let frameFailed = false;
  const onKeyDown = (event: KeyboardEvent): void => {
    try {
      if (!event || frameFailed || !root.isConnected || isDetachedTarget(event) || event.defaultPrevented || event.isComposing
        || event.ctrlKey || event.metaKey || event.altKey || event.key==='Process'
        || isEditableTarget(event.target) || isEditableTarget(document.activeElement)) {
        pressed.clear();movementMode.cancel();return;
      }
      if (recovering || darts.isOpen || venues.isOpen || options.isInputCaptured?.()) {
        pressed.clear();movementMode.cancel();if(event.key==='Escape') {menu.close();darts.close();venues.close();}return;
      }
      if (!menu.isOpen && !event.ctrlKey && !event.metaKey && !event.altKey) {
        if (['+', '=', '-', '0'].includes(event.key)) {
          event.preventDefault();
          if (event.key === '0') cameraController.resetView();
          else cameraController.adjustZoom(event.key === '-' ? 120 : -120);
          return;
        }
      }
      // A key held across a captured field/menu needs a fresh press to re-enter gameplay.
      if (event.repeat && !pressed.has(event.key.toLowerCase())) return;
      if (!menu.isOpen) {
        if(['w','a','s','d'].includes(event.key.toLowerCase()))moveTarget=undefined;
        if(['q','e'].includes(event.key.toLowerCase()))event.preventDefault();
        pressed.add(event.key.toLowerCase());
        if(event.key==='Shift')movementMode.setShift(true);
      }
      interactions.handleKey(event);
      if (menu.isOpen) {pressed.clear();movementMode.cancel();}
    } catch (error) {
      console.error('Could not process game keydown.', error);
    }
  };
  const onKeyUp = (event: KeyboardEvent): void => {
    try { if(!event)return;pressed.delete(event.key.toLowerCase());if(event.key==='Shift')movementMode.setShift(false); }
    catch (error) { console.error('Could not process game keyup.', error); }
  };
  const clearMovement = (): void => {
    try { movementMode.cancel();pressed.clear();moveTarget=undefined;gestures.cancel(); }
    catch (error) { console.error('Could not clear game movement.', error); }
  };
  const onVisibilityChange = (): void => {
    try { if (document.hidden) clearMovement(); }
    catch (error) { console.error('Could not process game visibility.', error); }
  };
  window.addEventListener('keydown', onKeyDown);
  const onWheel = (event: WheelEvent): void => {
    try {
      if (!root.isConnected || isDetachedTarget(event) || event.defaultPrevented || isEditableTarget(document.activeElement)) return;
      if (inputCaptured() || event.ctrlKey || event.metaKey || event.altKey) return;
      if (!(event.target instanceof Element) || !event.target.closest('canvas')) return;
      event.preventDefault();
      const scale = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? Math.max(root.clientHeight, 1) : 1;
      cameraController.adjustZoom(event.deltaY * scale);
    } catch (error) { console.error('Could not process camera zoom.', error); }
  };
  root.addEventListener('wheel', onWheel, { passive: false });
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', clearMovement);
  document.addEventListener('visibilitychange', onVisibilityChange);

  let frame = 0;
  let previous = performance.now();
  let frameCount = 0;
  let lastRoadObservation=0;
  const render = (now: number): void => {
    if (disposed) return;
    try {
      const delta = Math.min((now - previous) / 1000, 0.5);
      previous = now;
      const captured=inputCaptured() || isEditableTarget(document.activeElement) || frameFailed;
      if(captured) {movementMode.cancel();travelMode='stopped';pressed.clear();moveTarget=undefined;gestures.cancel();}
      if(!captured)cameraController.rotate((Number(pressed.has('e'))-Number(pressed.has('q')))*Math.min(delta,0.1)*1.8);
      let movement=cameraController.getMovement(Number(pressed.has('w'))-Number(pressed.has('s')),Number(pressed.has('d'))-Number(pressed.has('a')));
      if(moveTarget && !captured) {
        const dx=moveTarget.x-player.position.x,dz=moveTarget.z-player.position.z,length=Math.hypot(dx,dz);
        if(length<0.12)moveTarget=undefined;
        else {const speed=Math.min(1,length/Math.max(player.speedPerSecond*delta,0.001));movement={forward:-dz/length*speed,right:dx/length*speed};}
      }
      player.setMovement(captured?{forward:0,right:0}:movement);
      blockedReason = undefined;
      const previousPosition={...player.position};
      player.update(delta);
      if(player.blocked)moveTarget=undefined;
      const terrainHeight = ground.heightAt(player.position.x, player.position.z, player.position.y);
      if (terrainHeight !== undefined) player.position.y = terrainHeight;
      spatial.update(previousPosition,player.position,delta);presentation.apply(spatial.current);
      venues.setBuilding(spatial.current.mode==='indoor'?spatial.current.building?.id:undefined);
      if(spatial.current.mode==='indoor')pathMode='walk';
      playerMarker.position.set(player.position.x, player.position.y + PLAYER_MARKER_RADIUS, player.position.z);
      hud.update(player.position, nearbyPoi()?.name, minimap.project(player.position), missingModelCount, player.blocked ? blockedReason : undefined,spatial.current.mode==='indoor'?`${spatial.current.building?.name} · ${spatial.current.floor?.label}`:undefined);
      if(!recovering) {
        void world.update(player.position.x, player.position.z);
        if(!captured && !menu.isOpen && now-lastRoadObservation>=500) {lastRoadObservation=now;recovery.observe(player.position);}
      }
      const target = new Vector3(player.position.x, player.position.y, player.position.z);
      const aspect=Math.max(root.clientWidth,1)/Math.max(root.clientHeight,1);
      cameraController.resize(aspect);
      cameraController.setContextGoal(resolveContextCamera(spatial.current,player.position,aspect,cameraController.yawRadians),options.reducedMotion?.()??false);
      cameraController.update(target, delta);
      const actionHint=nearbyAction(),anchor=actionHint?.hint.position??player.position;
      const activityPoint=new Vector3(anchor.x,anchor.y,anchor.z).project(cameraController.camera);
      dartsPrompt.hidden=captured || !actionHint || Math.abs(activityPoint.x)>.95 || Math.abs(activityPoint.y)>.9 || Math.abs(activityPoint.z)>1;
      if(!dartsPrompt.hidden && actionHint){
        const label=actionHint.action.label??actionHint.action.id;dartsPrompt.textContent=label+' · F';dartsPrompt.setAttribute('aria-label',label);
        const p=placeActivityPrompt({x:(activityPoint.x+1)*root.clientWidth/2,y:(1-activityPoint.y)*root.clientHeight/2},{width:root.clientWidth,height:root.clientHeight});dartsPrompt.style.left=`${p.x}px`;dartsPrompt.style.top=`${p.y}px`;
      }
      const exitHint=activeHints().find(h=>h.kind==='exit');
      exitPrompt.hidden=captured || !exitHint;
      if(!exitPrompt.hidden && exitHint){const p=new Vector3(exitHint.position.x,exitHint.position.y,exitHint.position.z).project(cameraController.camera);
        exitPrompt.style.left=`${(p.x+1)*root.clientWidth/2}px`;exitPrompt.style.top=`${(1-p.y)*root.clientHeight/2}px`;exitPrompt.style.opacity=String(exitHint.opacity);}
      for(const room of authoredRooms.values()){
        const stripe=room.support.getObjectByName('entrance-stripe');
        if(stripe){const position=new Vector3();stripe.getWorldPosition(position);stripe.visible=spatial.current.mode==='indoor' && room.interior.visible && position.distanceTo(new Vector3(player.position.x,player.position.y,player.position.z))<3.5;}
        if(room.interior.visible)updateInteriorWalls(room.interior,cameraController.camera.position,options.reducedMotion?.()?10:delta);
      }
      const ray = createOcclusionRay(cameraController.camera.position, target);
      occlusion.update(ray,target,delta);
      renderer.setSize(Math.max(root.clientWidth, 1), Math.max(root.clientHeight, 1), false);
      cameraController.resize(Math.max(root.clientWidth, 1) / Math.max(root.clientHeight, 1));
      renderer.render(scene, cameraController.camera);
      frameCount += 1;
      frameFailed = false;
    } catch (error) {
      pressed.clear();player.setMovement({forward:0,right:0});
      if (!frameFailed) console.error('Could not update game frame.',error);
      frameFailed = true;
    } finally {
      if (!disposed) frame = requestAnimationFrame(render);
    }
  };
  root.dataset.gameReady = 'true';
  options.onRoadRecovery?.(recoveryActions);
  window.dispatchEvent(new Event('rdo-game-ready'));
  frame = requestAnimationFrame(render);

  return () => {
    disposed = true;
    cancelAnimationFrame(frame);
    window.removeEventListener('keydown', onKeyDown);
    root.removeEventListener('wheel', onWheel);
    window.removeEventListener('keyup', onKeyUp);
    window.removeEventListener('blur', clearMovement);
    document.removeEventListener('visibilitychange', onVisibilityChange);
    menu.close();
    darts.dispose();venues.dispose();gestures.dispose();releaseNativeContext();
    dartsPrompt.removeEventListener('click',onDartsPrompt);dartsPrompt.remove();exitPrompt.removeEventListener('click',onExitPrompt);exitPrompt.remove();
    hud.dispose();
    world.dispose();presentation.dispose();
    releaseAppearances();authoredRooms.forEach(room=>room.dispose());
    occlusion.dispose();
    playerMarker.geometry.dispose();
    playerMarker.material.dispose();
    delete root.dataset.gameReady;
    if (previewApi && window.__rdoPreview === previewApi) delete window.__rdoPreview;
  };
}
