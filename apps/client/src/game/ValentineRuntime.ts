import { AmbientLight, Color, DirectionalLight, Mesh, MeshStandardMaterial, Scene, SphereGeometry, Vector3, WebGLRenderer } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { WorldManifest, WorldPlacement } from '@rdo-rpg/world-contracts';

import { FallbackMenu } from './interaction/FallbackMenu';
import { InteractionRuntime } from './interaction/InteractionRuntime';
import { OrthographicFollowCamera } from './player/OrthographicFollowCamera';
import { PlayerController } from './player/PlayerController';
import { disposeObjectResources } from './world/ResourceDisposer';
import { loadValentineManifest } from './world/ManifestLoader';
import { WorldChunkManager } from './world/WorldChunkManager';

export function selectSpawnPosition(manifest: WorldManifest): { x: number; y: number; z: number } {
  const placement = manifest.placements[0];
  return placement ? { ...placement.position } : { x: 0, y: 0, z: 0 };
}

interface PlacementInstance {
  position: { set(x: number, y: number, z: number): void };
  rotation: { set(x: number, y: number, z: number): void };
  scale: { set(x: number, y: number, z: number): void };
}

export function applyPlacementTransform(instance: PlacementInstance, placement: Pick<WorldPlacement, 'position' | 'rotation' | 'scale'>): void {
  instance.position.set(placement.position.x, placement.position.y, placement.position.z);
  instance.rotation.set(Math.PI / 2, placement.rotation.y, 0);
  instance.scale.set(placement.scale.x, placement.scale.y, -placement.scale.z);
}

export async function startValentineRuntime(root: HTMLElement, renderer: WebGLRenderer): Promise<() => void> {
  const manifest = await loadValentineManifest('/runtime/valentine/local-preview/rdo_world_manifest.json');
  const scene = new Scene();
  scene.background = new Color('#17130e');
  scene.add(new AmbientLight('#d7c5a0', 2.4));
  const sunlight = new DirectionalLight('#ffe7b5', 2.2);
  sunlight.position.set(30, 50, 20);
  scene.add(sunlight);

  const spawn = selectSpawnPosition(manifest);
  const player = new PlayerController(spawn);
  const playerMarker = new Mesh(new SphereGeometry(0.4, 16, 12), new MeshStandardMaterial({ color: '#caa05d' }));
  playerMarker.position.set(spawn.x, spawn.y + 0.4, spawn.z);
  scene.add(playerMarker);
  const cameraController = new OrthographicFollowCamera(Math.max(root.clientWidth, 1) / Math.max(root.clientHeight, 1));
  const loader = new GLTFLoader();
  const world = new WorldChunkManager(manifest, async (placement: WorldPlacement) => {
    const gltf = await loader.loadAsync(`/runtime/valentine/local-preview/${placement.asset}`);
    const instance = gltf.scene;
    applyPlacementTransform(instance, placement);
    scene.add(instance);
    return { dispose: () => {
      scene.remove(instance);
      disposeObjectResources(instance);
    } };
  });
  await world.update(player.position.x, player.position.z);

  const menu = new FallbackMenu();
  const interactions = new InteractionRuntime({ getActivePoi: () => undefined, menu });
  const pressed = new Set<string>();
  const onKeyDown = (event: KeyboardEvent): void => {
    try {
      pressed.add(event.key.toLowerCase());
      interactions.handleKey(event);
    } catch (error) {
      console.error('Could not process game keydown.', error);
    }
  };
  const onKeyUp = (event: KeyboardEvent): void => {
    pressed.delete(event.key.toLowerCase());
  };
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);

  let frame = 0;
  let previous = performance.now();
  let disposed = false;
  const render = (now: number): void => {
    if (disposed) return;
    const delta = Math.min((now - previous) / 1000, 0.1);
    previous = now;
    player.setMovement({ forward: Number(pressed.has('w')) - Number(pressed.has('s')), right: Number(pressed.has('d')) - Number(pressed.has('a')) });
    player.update(delta);
    playerMarker.position.set(player.position.x, player.position.y + 0.4, player.position.z);
    void world.update(player.position.x, player.position.z);
    const target = new Vector3(player.position.x, player.position.y, player.position.z);
    cameraController.update(target);
    renderer.setSize(Math.max(root.clientWidth, 1), Math.max(root.clientHeight, 1), false);
    renderer.render(scene, cameraController.camera);
    frame = requestAnimationFrame(render);
  };
  root.dataset.gameReady = 'true';
  window.dispatchEvent(new Event('rdo-game-ready'));
  frame = requestAnimationFrame(render);

  return () => {
    disposed = true;
    cancelAnimationFrame(frame);
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    menu.close();
    world.dispose();
    playerMarker.geometry.dispose();
    playerMarker.material.dispose();
    delete root.dataset.gameReady;
  };
}
