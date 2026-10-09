import { AmbientLight, Box3, Color, DirectionalLight, Group, Mesh, MeshStandardMaterial, Raycaster, RepeatWrapping, Scene, SphereGeometry, Texture, TextureLoader, Vector3, WebGLRenderer } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { WorldManifest, WorldPlacement } from '@rdo-rpg/world-contracts';

import { FallbackMenu } from './interaction/FallbackMenu';
import { InteractionRuntime } from './interaction/InteractionRuntime';
import { OrthographicFollowCamera } from './player/OrthographicFollowCamera';
import { OcclusionController } from './player/OcclusionController';
import { PlayerController } from './player/PlayerController';
import { Hud } from './presentation/Hud';
import { Minimap } from './presentation/Minimap';
import { ModelAssetCache } from './world/ModelAssetCache';
import { loadValentineManifest } from './world/ManifestLoader';
import { WorldChunkManager } from './world/WorldChunkManager';
import { selectHighestDrawableLod } from './world/DrawableLod';
import { TerrainGround } from './world/TerrainGround';
import { VisibleMeshCollision } from './world/VisibleMeshCollision';
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
      if (typeof material.userData.rdo_material_status === 'string' && material.vertexColors) {
        material.vertexColors = false;
        material.needsUpdate = true;
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
      pending.push((async () => {
        const textures = await Promise.all(names.map((name) => loadTexture(`/runtime/valentine/local-preview/textures/terrain/${encodeURIComponent(name)}`)));
        for (const texture of textures) {
          texture.wrapS = RepeatWrapping;
          texture.wrapT = RepeatWrapping;
        }
        material.vertexColors = false;
        material.onBeforeCompile = (shader) => {
          Object.assign(shader.uniforms, {
            rdoLookup: { value: textures[0] },
            rdoLayer0: { value: textures[1] },
            rdoLayer1: { value: textures[2] },
            rdoLayer2: { value: textures[3] },
            rdoLayer3: { value: textures[4] },
          });
          shader.vertexShader = `attribute vec4 color_1;\nvarying vec4 vRdoColor1;\nvarying vec2 vRdoUv;\n${shader.vertexShader}`
            .replace('#include <color_vertex>', '#include <color_vertex>\nvRdoColor1 = color_1;\nvRdoUv = uv;');
          shader.fragmentShader = `uniform sampler2D rdoLookup;\nuniform sampler2D rdoLayer0;\nuniform sampler2D rdoLayer1;\nuniform sampler2D rdoLayer2;\nuniform sampler2D rdoLayer3;\nvarying vec4 vRdoColor1;\nvarying vec2 vRdoUv;\n${shader.fragmentShader}`
            .replace('vec4 diffuseColor = vec4( diffuse, opacity );', `
              vec3 rdoControl = mix(texture2D(rdoLookup, vRdoUv).rgb, vRdoColor1.rgb, vRdoColor1.a);
              vec3 rdo01 = mix(sRGBTransferEOTF(texture2D(rdoLayer0, vRdoUv)).rgb, sRGBTransferEOTF(texture2D(rdoLayer1, vRdoUv)).rgb, 1.0 - rdoControl.r);
              vec3 rdo23 = mix(sRGBTransferEOTF(texture2D(rdoLayer2, vRdoUv)).rgb, sRGBTransferEOTF(texture2D(rdoLayer3, vRdoUv)).rgb, rdoControl.g);
              vec4 diffuseColor = vec4(mix(rdo01, rdo23, rdoControl.b), opacity);
            `);
        };
        material.customProgramCacheKey = () => 'rdo-terrain-four-layer-v1';
        material.userData.rdo_terrain_preview_ready = true;
        material.needsUpdate = true;
      })());
    }
  });
  await Promise.all(pending);
}

export function createOcclusionRay(cameraPosition: Vector3, playerPosition: Vector3): Raycaster {
  const direction = playerPosition.clone().sub(cameraPosition);
  const distance = direction.length();
  return new Raycaster(cameraPosition, direction.normalize(), 0, distance);
}

export function applyPlacementTransform(instance: Group, placement: Pick<WorldPlacement, 'position' | 'rotation' | 'scale'>): void {
  instance.position.set(placement.position.x, placement.position.y, placement.position.z);
  // GLB local basis is (game X, game Z, -game Y); world requires +game Y.
  instance.rotation.set(placement.rotation.x, placement.rotation.y, placement.rotation.z, 'XYZ');
  instance.scale.set(placement.scale.x, placement.scale.y, -placement.scale.z);
}

interface RuntimePoi {
  id: string;
  name: string;
  position: { x: number; y: number; z: number };
  radius: number;
  category: string;
}

declare global {
  interface Window {
    __rdoPreview?: {
      teleport(position: { x: number; y: number; z: number }): void;
      setReferenceCamera(position: { x: number; y: number; z: number }, target: { x: number; y: number; z: number }): void;
      waitForChunks(): Promise<void>;
      getState(): { frame: number; player: { x: number; y: number; z: number }; cameraType: string; viewHeight: number };
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
    const response = await fetch('/runtime/valentine/local-preview/missing-models.json');
    if (!response.ok) return 0;
    const payload: unknown = await response.json();
    const models = payload && typeof payload === 'object' ? (payload as { missingModels?: unknown }).missingModels : undefined;
    return Array.isArray(models) ? models.length : 0;
  } catch { return 0; }
}

export async function startValentineRuntime(root: HTMLElement, renderer: WebGLRenderer): Promise<() => void> {
  const manifest = await loadValentineManifest('/runtime/valentine/local-preview/rdo_world_manifest.json');
  const [pois, missingModelCount] = await Promise.all([loadPois(), loadMissingModelCount()]);
  const scene = new Scene();
  scene.background = new Color('#17130e');
  scene.add(new AmbientLight('#d7c5a0', 2.4));
  const sunlight = new DirectionalLight('#ffe7b5', 2.2);
  sunlight.position.set(30, 50, 20);
  scene.add(sunlight);

  const spawn = selectSpawnPosition(manifest, previewSpawn.position);
  const collision = new VisibleMeshCollision();
  const ground = new TerrainGround();
  let player: PlayerController | undefined;
  const canOccupy = (position: { x: number; y: number; z: number }): boolean => {
    return !player || !collision.blocksTransition(player.position, position);
  };
  player = new PlayerController(spawn, 6, canOccupy);
  const playerMarker = new Mesh(new SphereGeometry(0.4, 16, 12), new MeshStandardMaterial({ color: '#caa05d' }));
  playerMarker.position.set(spawn.x, spawn.y + 0.4, spawn.z);
  scene.add(playerMarker);
  const cameraController = new OrthographicFollowCamera(Math.max(root.clientWidth, 1) / Math.max(root.clientHeight, 1));
  const loader = new GLTFLoader();
  const textureLoader = new TextureLoader();
  const assets = new ModelAssetCache(async (asset) => {
    const gltf = await loader.loadAsync(`/runtime/valentine/local-preview/${asset}`);
    prepareDrawableMaterialPreview(gltf.scene);
    await prepareTerrainFourLayerPreview(gltf.scene, (url) => textureLoader.loadAsync(url));
    selectHighestDrawableLod(gltf.scene);
    return gltf.scene;
  });
  const occluders: Group[] = [];
  const world = new WorldChunkManager(manifest, async (placement: WorldPlacement) => {
    if (!isRenderablePlacement(placement)) return { dispose() {} };
    const lease = await assets.acquire(placement.asset);
    const instance = lease.instance;
    applyPlacementTransform(instance, placement);
    if (placement.layer === 'terrain') disableTerrainVertexColorMultiplication(instance);
    scene.add(instance);
    if (placementBlocksPlayerAndCamera(placement)) occluders.push(instance);
    instance.updateWorldMatrix(true, true);
    if (placement.layer === 'terrain') ground.add(instance);
    if (placementBlocksPlayerAndCamera(placement)) collision.add(instance);
    return { dispose: () => {
      scene.remove(instance);
      const index = occluders.indexOf(instance);
      if (index >= 0) occluders.splice(index, 1);
      collision.remove(instance);
      if (placement.layer === 'terrain') ground.remove(instance);
      lease.dispose();
    } };
  });
  await world.update(player.position.x, player.position.z);
  const spawnGroundHeight = ground.heightAt(player.position.x, player.position.z);
  if (spawnGroundHeight !== undefined) {
    player.position.y = spawnGroundHeight;
    playerMarker.position.y = spawnGroundHeight + 0.4;
  }

  const menu = new FallbackMenu();
  const hud = new Hud(root);
  const minimap = new Minimap();
  const occlusion = new OcclusionController(occluders);
  const nearbyPoi = (): RuntimePoi | undefined => pois.find((poi) => Math.hypot(player.position.x - poi.position.x, player.position.z - poi.position.z) <= poi.radius);
  const interactions = new InteractionRuntime({ getActivePoi: () => nearbyPoi(), menu });
  window.__rdoPreview = {
    teleport(position): void {
      player.position.x = position.x;
      player.position.y = position.y;
      player.position.z = position.z;
    },
    setReferenceCamera(position, target): void {
      cameraController.setReferencePose(position, target);
    },
    waitForChunks: () => world.waitForIdle(),
    getState: () => ({ frame: frameCount, player: { ...player.position }, cameraType: cameraController.camera.type,
      viewHeight: (cameraController.camera.top - cameraController.camera.bottom) / cameraController.camera.zoom }),
  };
  const pressed = new Set<string>();
  const onKeyDown = (event: KeyboardEvent): void => {
    try {
      const target = event.target;
      if (target instanceof Element && target.closest('input, textarea, select, [contenteditable="true"]')) return;
      if (!menu.isOpen && !event.ctrlKey && !event.metaKey && !event.altKey) {
        if (['+', '=', '-', '0'].includes(event.key)) {
          event.preventDefault();
          if (event.key === '0') cameraController.resetZoom();
          else cameraController.adjustZoom(event.key === '-' ? 120 : -120);
          return;
        }
      }
      if (!menu.isOpen) pressed.add(event.key.toLowerCase());
      interactions.handleKey(event);
      if (menu.isOpen) pressed.clear();
    } catch (error) {
      console.error('Could not process game keydown.', error);
    }
  };
  const onKeyUp = (event: KeyboardEvent): void => {
    try { pressed.delete(event.key.toLowerCase()); }
    catch (error) { console.error('Could not process game keyup.', error); }
  };
  const clearMovement = (): void => {
    try { pressed.clear(); }
    catch (error) { console.error('Could not clear game movement.', error); }
  };
  const onVisibilityChange = (): void => {
    try { if (document.hidden) clearMovement(); }
    catch (error) { console.error('Could not process game visibility.', error); }
  };
  window.addEventListener('keydown', onKeyDown);
  const onWheel = (event: WheelEvent): void => {
    try {
      if (menu.isOpen || event.ctrlKey || event.metaKey || event.altKey) return;
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
  let disposed = false;
  let frameCount = 0;
  const render = (now: number): void => {
    if (disposed) return;
    const delta = Math.min((now - previous) / 1000, 0.5);
    previous = now;
    player.setMovement(menu.isOpen ? { forward: 0, right: 0 } : { forward: Number(pressed.has('w')) - Number(pressed.has('s')), right: Number(pressed.has('d')) - Number(pressed.has('a')) });
    player.update(delta);
    const terrainHeight = ground.heightAt(player.position.x, player.position.z);
    if (terrainHeight !== undefined) player.position.y = terrainHeight;
    playerMarker.position.set(player.position.x, player.position.y + 0.4, player.position.z);
    hud.update(player.position, nearbyPoi()?.name, minimap.project(player.position), missingModelCount, player.blocked);
    void world.update(player.position.x, player.position.z);
    const target = new Vector3(player.position.x, player.position.y, player.position.z);
    cameraController.update(target, delta);
    const ray = createOcclusionRay(cameraController.camera.position, target);
    occlusion.update(ray);
    renderer.setSize(Math.max(root.clientWidth, 1), Math.max(root.clientHeight, 1), false);
    cameraController.resize(Math.max(root.clientWidth, 1) / Math.max(root.clientHeight, 1));
    renderer.render(scene, cameraController.camera);
    frameCount += 1;
    frame = requestAnimationFrame(render);
  };
  root.dataset.gameReady = 'true';
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
    hud.dispose();
    world.dispose();
    occlusion.dispose();
    playerMarker.geometry.dispose();
    playerMarker.material.dispose();
    delete root.dataset.gameReady;
    delete window.__rdoPreview;
  };
}
