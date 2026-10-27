import {
  AmbientLight, Box3, Box3Helper, BufferGeometry, Color, DirectionalLight, GridHelper, Group, LineLoop, LineBasicMaterial,
  Mesh, MeshBasicMaterial, MeshStandardMaterial, OrthographicCamera, Plane,
  Raycaster, Scene, Vector2, Vector3, WebGLRenderer,
} from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { type WorldPlacement } from '@rdo-rpg/world-contracts';
import circuit from '../../../../../data/reference/valentine/annotated-circuit.json';
import { loadValentineManifest } from '../world/ManifestLoader';
import { selectHighestDrawableLod } from '../world/DrawableLod';
import { disposeObjectResources } from '../world/ResourceDisposer';
import { TerrainGround } from '../world/TerrainGround';
import { VisibleMeshCollision } from '../world/VisibleMeshCollision';
import { applyPlacementTransform, prepareDrawableMaterialPreview, prepareTerrainFourLayerPreview } from '../ValentineRuntime';
import { TextureLoader } from 'three';
import { palette, sourceCoordinates, visualCategory } from './MapData';
import { sceneManifestUrl, sceneAssetUrl } from '../world/SceneSource';
import { VALENTINE_BOUNDARY } from '@rdo-rpg/world-contracts';
import { placementRoles } from '../world/PlacementRoles';
import {prepareSourceAppearance} from '../world/SourceAppearance';
import { describeSelection, type MapSelection } from './MapDiagnostics';
import { isDetachedTarget, isEditableTarget } from '../input/InputTarget';
import './MapInspector.css';

type Entry = { placement: WorldPlacement; model: string; source: string; instance: Group; bounds: Box3; label?: HTMLElement };

export async function startMapInspector(root: HTMLElement): Promise<() => void> {
  if (!root) throw new Error('Map root missing');
  const renderer = new WebGLRenderer({ antialias: false });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.domElement.setAttribute('aria-label', 'Valentine source map: drag to pan, wheel to zoom');
  renderer.domElement.style.touchAction = 'none';
  root.append(renderer.domElement);
  const scene = new Scene();
  scene.background = new Color('#343d33');
  scene.add(new AmbientLight('#e4d7b5', 2));
  const sunlight = new DirectionalLight('#fff0c9', 2.1);
  sunlight.position.set(-100, 400, 80);
  scene.add(sunlight);
  const camera = new OrthographicCamera(-200, 200, 200, -200, 0.1, 3000);
  const target = new Vector3();
  let viewHeight = 460;
  let overhead = false;
  let debug = false;
  let disposed = false;
  let frame = 0;
  let frames = 0;
  const errors: string[] = [];
  const cleanup: (() => void)[] = [];
  const entries: Entry[] = [];
  const sourceEvidence = new Map<string, unknown[]>();
  let selected: MapSelection | undefined;
  const ground = new TerrainGround();
  const collision = new VisibleMeshCollision();
  const bounds = new Box3();
  const townBounds = new Box3();
  const debugGroup = new Group();
  const boundsGroup = new Group();
  const collisionGroup = new Group();
  debugGroup.add(boundsGroup, collisionGroup);
  debugGroup.visible = false;
  scene.add(debugGroup);
  const ui = document.createElement('section');
  ui.className = 'map-inspector';
  ui.setAttribute('aria-label', 'DEV map inspector');
  ui.innerHTML = `<div class="labels"></div><header><div><div class="eyebrow">RDO / WORLD STUDIES — DEV 01</div><h1>Valentine</h1><div class="subtitle">NEW HANOVER · SOURCE-BOUND EXTERIOR STUDY</div></div><nav aria-label="Map controls"><button data-action="debug" aria-pressed="false">F2 · Debug</button><button data-action="top" aria-pressed="false">Top down</button><button data-action="fit">Fit town</button><button data-action="in" aria-label="Zoom in">+</button><button data-action="out" aria-label="Zoom out">−</button></nav></header><div class="north">↑<br>N</div><aside class="panel"><h2>EXTRACTED WORLD / LIVE GEOMETRY</h2><div class="legend"><span><i style="background:#797855"></i>Source terrain / grass & dirt</span><span><i style="background:#654735"></i>Mud / road surfaces</span><span><i style="background:#c39760"></i>Boardwalks / source timber</span><span><i style="background:#a59069"></i>Fences / livestock structures</span></div><p class="note">Actual GLB geometry. Doors and porches stay at their extracted positions. Missing terrain stays empty.</p><div data-debug hidden><p class="note">10 m grid · green = source surfaces<br>red = collider candidates · amber = AABBs<br>Bounds are not a navigation mesh.</p><output data-selection class="selection">Hover an entity to inspect its ID.</output></div></aside><footer><output data-status role="status">Loading verified manifest…</output><output data-coordinates>Drag to pan · wheel to zoom · F2 inspect · 0 fit</output></footer>`;
  root.append(ui);
  const boundaryButton = document.createElement('button');
  boundaryButton.textContent = 'Ortsgrenze'; boundaryButton.dataset.action = 'boundary';
  ui.querySelector('nav')?.append(boundaryButton);
  const status = ui.querySelector<HTMLOutputElement>('[data-status]')!;
  const coordinates = ui.querySelector<HTMLOutputElement>('[data-coordinates]')!;
  const selection = ui.querySelector<HTMLOutputElement>('[data-selection]')!;
  const labels = ui.querySelector<HTMLElement>('.labels')!;
  const debugPanel = ui.querySelector<HTMLElement>('[data-debug]')!;
  const debugButton = ui.querySelector<HTMLButtonElement>('[data-action=debug]')!;
  const topButton = ui.querySelector<HTMLButtonElement>('[data-action=top]')!;
  const debugControls = document.createElement('div');
  debugControls.className = 'debug-controls';
  for (const name of ['Grid', 'Bounds', 'Collision', 'Labels']) {
    const button = document.createElement('button'); button.textContent = name;
    button.dataset.layer = name; button.setAttribute('aria-pressed', 'true');
    debugControls.append(button);
  }
  debugPanel.prepend(debugControls);
  const copySelection = document.createElement('button');
  copySelection.type = 'button'; copySelection.textContent = 'Auswahl kopieren'; copySelection.disabled = true;
  debugControls.append(copySelection);
  let labelsEnabled = true;
  let grid: GridHelper | undefined;

  const updateCamera = (): void => {
    const width = Math.max(root.clientWidth, 1), height = Math.max(root.clientHeight, 1);
    const aspect = width / height;
    camera.left = -viewHeight * aspect / 2; camera.right = viewHeight * aspect / 2;
    camera.top = viewHeight / 2; camera.bottom = -viewHeight / 2;
    camera.up.set(0, overhead ? 0 : 1, overhead ? -1 : 0);
    camera.position.copy(target).add(new Vector3(0, 700, overhead ? 0 : 340));
    camera.lookAt(target); camera.updateProjectionMatrix(); camera.updateMatrixWorld();
    renderer.setSize(width, height, false);
  };
  const fit = (): void => {
    if (bounds.isEmpty()) return;
    const extent = townBounds.isEmpty() ? bounds : townBounds;
    extent.getCenter(target);
    const size = extent.getSize(new Vector3());
    viewHeight = Math.max(size.z, size.x / (Math.max(root.clientWidth, 1) / Math.max(root.clientHeight, 1))) * 1.25;
    updateCamera();
  };
  const zoom = (factor: number): void => { viewHeight = Math.max(18, Math.min(1200, viewHeight * factor)); updateCamera(); };
  const toggleDebug = (): void => {
    debug = !debug; debugGroup.visible = debug; debugPanel.hidden = !debug;
    debugButton.setAttribute('aria-pressed', String(debug)); labels.hidden = !debug || !labelsEnabled;
    root.dataset.mapDebug = String(debug);
  };
  /** Every input callback is guarded; a detached UI cannot kill the render loop. */
  const listen = (node: EventTarget | null, type: string, callback: (event: Event) => void, options?: AddEventListenerOptions): void => {
    if (!node) return;
    const guarded = (event: Event): void => { try { if (!disposed && root.isConnected && !event.defaultPrevented && !isDetachedTarget(event)) callback(event); } catch (error) { console.error(`Map inspector ${type} failed.`, error); } };
    node.addEventListener(type, guarded, options);
    cleanup.push(() => node.removeEventListener(type, guarded, options));
  };
  listen(copySelection, 'click', () => {
    void (async () => {
      try {
        if (disposed || !copySelection.isConnected || !selected || !navigator.clipboard) return;
        await navigator.clipboard.writeText(JSON.stringify(selected, null, 2));
        if (!disposed && copySelection.isConnected) copySelection.textContent = 'Kopiert';
      } catch (error) {
        if (!disposed && selection.isConnected) selection.textContent = `${JSON.stringify(selected, null, 2)}\nKopieren nicht verfügbar: ${String(error)}`;
      }
    })();
  });
  listen(ui.querySelector('nav'), 'click', (event) => {
    if (!(event.target instanceof Element)) return;
    const action = event.target.closest<HTMLButtonElement>('button')?.dataset.action;
    if (action === 'debug') toggleDebug();
    if (action === 'fit') fit();
    if (action === 'boundary') {
      if (!debug) toggleDebug();
      const extent = new Box3().setFromPoints(VALENTINE_BOUNDARY.polygon.map(([x,z]) => new Vector3(x, target.y, z)));
      extent.getCenter(target);
      const size = extent.getSize(new Vector3());
      viewHeight = Math.max(size.z, size.x / (Math.max(root.clientWidth,1)/Math.max(root.clientHeight,1))) * 1.12;
      updateCamera();
    }
    if (action === 'top') { overhead = !overhead; topButton.setAttribute('aria-pressed', String(overhead)); updateCamera(); }
    if (action === 'in') zoom(0.8);
    if (action === 'out') zoom(1.25);
  });
  listen(debugControls, 'click', (event) => {
    if (!(event.target instanceof Element)) return;
    const button = event.target.closest<HTMLButtonElement>('button[data-layer]');
    if (!button) return;
    const enabled = button.getAttribute('aria-pressed') !== 'true';
    button.setAttribute('aria-pressed', String(enabled));
    if (button.dataset.layer === 'Bounds') boundsGroup.visible = enabled;
    if (button.dataset.layer === 'Collision') collisionGroup.visible = enabled;
    if (button.dataset.layer === 'Grid' && grid) grid.visible = enabled;
    if (button.dataset.layer === 'Labels') { labelsEnabled = enabled; labels.hidden = !debug || !enabled; }
  });
  listen(window, 'keydown', (event) => {
    const key = event as KeyboardEvent;
    if (isEditableTarget(key.target) || isEditableTarget(document.activeElement)) return;
    if (key.repeat || key.isComposing || key.ctrlKey || key.metaKey || key.altKey || key.key==='Process') return;
    if (key.key === 'F2') { key.preventDefault(); toggleDebug(); }
    if (key.key === '0') fit();
    if (key.key === '+') zoom(0.8);
    if (key.key === '-') zoom(1.25);
  });
  listen(window, 'resize', updateCamera);
  const ndc = new Vector2();
  const ray = new Raycaster();
  const pick = (event: PointerEvent, groundOnly = false): Vector3 | undefined => {
    const rect = renderer.domElement.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    ndc.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
    ray.setFromCamera(ndc, camera);
    if (!groundOnly) {
      const hits = ray.intersectObjects(entries.filter((entry) => ray.ray.intersectsBox(entry.bounds)).map((entry) => entry.instance), true).filter((hit) => {
        let node: typeof hit.object | null = hit.object;
        while (node) { if (!node.visible) return false; node = node.parent; }
        return true;
      });
      const hit = hits[0];
      if (hit) {
        let owner = hit.object;
        while (owner.parent && !owner.userData.inspectorId) owner = owner.parent;
        const entry = entries.find((item) => item.placement.id === owner.userData.inspectorId);
        if (entry && hit.object instanceof Mesh) {
          selected = describeSelection(entry.placement, hit.object, hit.point, sourceEvidence.get(entry.placement.id));
          selection.textContent = JSON.stringify(selected, null, 2);
          copySelection.disabled = false; copySelection.textContent = 'Auswahl kopieren';
        }
        return hit.point;
      }
    }
    return ray.ray.intersectPlane(new Plane(new Vector3(0, 1, 0), -target.y), new Vector3()) ?? undefined;
  };
  let drag: { id: number; point: Vector3 } | undefined;
  let lastHover = 0;
  listen(renderer.domElement, 'pointerdown', (event) => {
    const pointer = event as PointerEvent;
    if (pointer.button !== 0 && pointer.button !== 1) return;
    const point = pick(pointer, true);
    if (!point) return;
    drag = { id: pointer.pointerId, point }; renderer.domElement.setPointerCapture(pointer.pointerId);
  });
  listen(renderer.domElement, 'pointermove', (event) => {
    const pointer = event as PointerEvent;
    if (drag?.id === pointer.pointerId) {
      const point = pick(pointer, true);
      if (point) { target.add(drag.point.clone().sub(point)); updateCamera(); }
      return;
    }
    if (!debug) return;
    if (performance.now() - lastHover < 50) return;
    lastHover = performance.now();
    const point = pick(pointer);
    if (!point) return;
    const source = sourceCoordinates(point);
    const rect = renderer.domElement.getBoundingClientRect();
    const height = ground.heightAt(point.x, point.z);
    let passability = 'NO SOURCE TERRAIN';
    if (height !== undefined) {
      const position = { x: point.x, y: height, z: point.z };
      const blocked = collision.blocksTransition({ ...position, x: position.x - 0.6 }, { ...position, x: position.x + 0.6 })
        || collision.blocksTransition({ ...position, z: position.z - 0.6 }, { ...position, z: position.z + 0.6 });
      passability = blocked ? 'BLOCKED local probe' : 'CLEAR local probe';
    }
    coordinates.textContent = `Canvas ${Math.round(pointer.clientX - rect.left)}, ${Math.round(pointer.clientY - rect.top)} px\nRDR surface ${source.x.toFixed(2)}, ${source.y.toFixed(2)}, ${source.z.toFixed(2)} · ${passability}`;
  });
  const endDrag = (event: Event): void => {
    const pointer = event as PointerEvent;
    if (drag?.id !== pointer.pointerId) return;
    drag = undefined;
    if (renderer.domElement.hasPointerCapture(pointer.pointerId)) renderer.domElement.releasePointerCapture(pointer.pointerId);
  };
  listen(renderer.domElement, 'pointerup', endDrag);
  listen(renderer.domElement, 'pointercancel', endDrag);
  listen(renderer.domElement, 'lostpointercapture', () => { drag = undefined; });
  listen(window, 'blur', () => { drag = undefined; });
  listen(renderer.domElement, 'wheel', (event) => {
    const wheel = event as WheelEvent;
    if (wheel.ctrlKey || wheel.metaKey || wheel.altKey
      || isEditableTarget(wheel.target) || isEditableTarget(document.activeElement)) return;
    wheel.preventDefault();
    zoom(Math.exp(Math.max(-500, Math.min(500, wheel.deltaY * (wheel.deltaMode === 1 ? 16 : wheel.deltaMode === 2 ? root.clientHeight : 1))) * 0.0015));
  }, { passive: false });
  updateCamera();

  const render = (): void => {
    if (disposed) return;
    try {
      renderer.render(scene, camera);
      if (debug) {
        const occupied: { x: number; y: number }[] = [];
        for (const entry of entries) {
          if (!entry.label) continue;
          const position = new Vector3(entry.placement.position.x, entry.bounds.max.y + 1, entry.placement.position.z).project(camera);
          const x = (position.x + 1) / 2 * root.clientWidth, y = (1 - position.y) / 2 * root.clientHeight;
          const hidden = position.z < -1 || position.z > 1 || x < 0 || y < 100 || x > root.clientWidth || y > root.clientHeight - 65
            || occupied.some((other) => Math.abs(other.x - x) < 150 && Math.abs(other.y - y) < 34);
          entry.label.hidden = hidden;
          if (!hidden) { occupied.push({ x, y }); entry.label.style.left = `${x}px`; entry.label.style.top = `${y}px`; }
        }
      }
      frames++;
    } catch (error) { status.textContent = `Render error: ${String(error)}`; }
    frame = requestAnimationFrame(render);
  };
  frame = requestAnimationFrame(render);
  const dispose = (): void => {
    disposed = true; cancelAnimationFrame(frame); cleanup.forEach((stop) => stop());
    disposeObjectResources(scene); renderer.dispose(); renderer.domElement.remove(); ui.remove();
    delete root.dataset.mapReady; delete root.dataset.mapDebug; delete window.__rdoMapInspector;
  };
  cleanup.push(() => { delete root.dataset.gameReady; });
  listen(window, 'pagehide', dispose);

  try {
    const manifest = await loadValentineManifest(sceneManifestUrl());
    try {
      const response = await fetch(sceneAssetUrl('scene-report.json'));
      if (!response.ok) throw new Error(`Scene evidence HTTP ${response.status}`);
      const report = await response.json() as { placements?: { id: string; sources: unknown[] }[] };
      for (const item of report.placements ?? []) if (item && typeof item.id === 'string' && Array.isArray(item.sources)) {
        sourceEvidence.set(item.id, item.sources);
      }
    } catch (error) { errors.push(`Source evidence unavailable: ${String(error)}`); }
    const records = manifest.placements.map((placement) => ({ placement, source: 'verified-scene/rdo_world_manifest.json', url: sceneAssetUrl(placement.asset) }));
    const loader = new GLTFLoader();
    const textures = new TextureLoader();
    // Bounded parallelism avoids loading the entire source library at once.
    let index = 0;
    const loadNext = async (): Promise<void> => {
      while (!disposed && index < records.length) {
        const record = records[index++];
        try {
          const { scene: instance } = await loader.loadAsync(record.url);
          if (disposed) { disposeObjectResources(instance); return; }
          selectHighestDrawableLod(instance);
          if (record.placement.asset.endsWith('_reflection_proxy.glb')) { disposeObjectResources(instance); continue; }
          prepareDrawableMaterialPreview(instance);
          await prepareSourceAppearance(instance,{asset:record.placement.asset,loadTexture:url=>textures.loadAsync(url)});
          await prepareTerrainFourLayerPreview(instance, (url) => textures.loadAsync(url));
          if (disposed) { disposeObjectResources(instance); return; }
          applyPlacementTransform(instance, record.placement);
          instance.userData.inspectorId = record.placement.id;
          instance.userData.sourceAsset = record.placement.asset;
          const model = record.placement.asset.split('/').pop()!.replace('.glb', '');
          const category = visualCategory(model, record.placement.layer);
          instance.traverse((node) => {
            if (!(node instanceof Mesh)) return;
            const materials = Array.isArray(node.material) ? node.material : [node.material];
            for (const material of materials) {
              if (!(material instanceof MeshStandardMaterial)) continue;
              material.flatShading = true; material.metalness = 0; material.roughness = 1;
              if (category === 'mud') { material.map = null; material.color.set(palette.mud); material.vertexColors = false; }
              if (category === 'terrain') material.color.set('#b7b894');
              material.needsUpdate = true;
            }
          });
          instance.updateWorldMatrix(true, true);
          const entry: Entry = { ...record, model, instance, bounds: new Box3().setFromObject(instance) };
          scene.add(instance); entries.push(entry); bounds.union(entry.bounds);
          const roles = placementRoles(record.placement);
          if (roles.support) ground.add(instance, category === 'terrain' ? 'terrain' : 'structure');
          if (roles.obstacle) collision.add(instance);
          const helper = new Box3Helper(entry.bounds, '#d0ab5b');
          for (const material of Array.isArray(helper.material) ? helper.material : [helper.material]) {
            material.depthTest = false; material.transparent = true; material.opacity = 0.35;
          }
          boundsGroup.add(helper);
          // Same source meshes, no invented box collision volumes or door locations.
          const tint = new MeshBasicMaterial({ color: category === 'terrain' || category === 'mud' || category === 'timber' ? '#6ec59a' : '#d16f57', transparent: true, opacity: 0.15, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
          const overlay = instance.clone(true);
          overlay.traverse((node) => { if (node instanceof Mesh) { node.material = tint; node.renderOrder = 10; } });
          collisionGroup.add(overlay);
          const landmark = circuit.landmarks.find((item) => item.models.includes(model));
          if (landmark) townBounds.union(entry.bounds);
          if (landmark || category === 'fence' || category === 'timber') {
            entry.label = document.createElement('div'); entry.label.className = 'label';
            entry.label.append(document.createTextNode(landmark?.label ?? model));
            entry.label.append(document.createElement('br'));
            const id = document.createElement('small'); id.textContent = record.placement.id; entry.label.append(id);
            labels.append(entry.label);
          }
          status.textContent = `${entries.length} / ${records.length} source entities · loading…`;
        } catch (error) { errors.push(`${record.placement.id}: ${String(error)}`); }
      }
    };
    await Promise.all([loadNext(), loadNext(), loadNext()]);
    if (disposed) return dispose;
    // Important landmarks win label collisions; async network order has no visual effect.
    const labelRank = (entry: Entry): number => {
      const rank = circuit.landmarks.findIndex((landmark) => landmark.models.includes(entry.model));
      return rank < 0 ? circuit.landmarks.length : rank;
    };
    entries.sort((a, b) => labelRank(a) - labelRank(b) || a.placement.id.localeCompare(b.placement.id));
    const center = bounds.getCenter(new Vector3());
    grid = new GridHelper(1200, 120, '#a9ad8e', '#929a78');
    grid.position.set(Math.floor(center.x / 10) * 10, center.y, Math.floor(center.z / 10) * 10);
    grid.material.transparent = true; grid.material.opacity = 0.17; grid.material.depthTest = false;
    debugGroup.add(grid);
    const boundaryLine = new LineLoop(new BufferGeometry().setFromPoints(
      VALENTINE_BOUNDARY.polygon.map(([x,z]) => new Vector3(x, center.y, z))),
      new LineBasicMaterial({ color: '#00ffff', depthTest: false, depthWrite: false }));
    boundaryLine.renderOrder = 100;
    debugGroup.add(boundaryLine);
    const boundaryNote = document.createElement('p'); boundaryNote.className = 'note';
    boundaryNote.textContent = `Cyan = freigegebene Ortsgrenze · Bildgenauigkeit ±${VALENTINE_BOUNDARY.uncertaintyMetres.toFixed(1)} m · Kulisse bleibt sichtbar`;
    debugPanel.append(boundaryNote);
    fit();
    labels.hidden = true;
    const missing = circuit.landmarks.filter((landmark) => !entries.some((entry) => landmark.models.includes(entry.model)));
    status.textContent = `${entries.length} source entities · ${errors.length} load errors · ${missing.length} missing landmarks`;
    if (errors.length) { const details = document.createElement('p'); details.className = 'note'; details.textContent = errors.join('\n'); ui.querySelector('.panel')?.append(details); }
    root.dataset.mapReady = 'true'; root.dataset.gameReady = 'true'; root.dataset.mapDebug = 'false';
    window.__rdoMapInspector = {
      state: () => ({ frames, debug, overhead, viewHeight, center: target.toArray(), selection: selected,
        manifestUrl: sceneManifestUrl(), boundary: VALENTINE_BOUNDARY, entities: entries.map((entry) => ({ id: entry.placement.id, model: entry.model,
          position: entry.placement.position, source: entry.source, bounds: { min: entry.bounds.min.toArray(), max: entry.bounds.max.toArray() } })), errors }),
      focusModel: (model, height = 60) => {
        const entry = entries.find((item) => item.model === model);
        if (!entry || !Number.isFinite(height)) return false;
        entry.bounds.getCenter(target); viewHeight = Math.max(8, Math.min(2400, height)); updateCamera(); return true;
      },
      sampleGround: (x, z, referenceY) => ground.heightAt(x, z, referenceY),
    };
    return dispose;
  } catch (error) { dispose(); throw error; }
}

declare global {
  interface Window {
    __rdoMapInspector?: {
      state(): { frames: number; debug: boolean; overhead: boolean; viewHeight: number; center: number[];
        manifestUrl: string; selection?: MapSelection; boundary: typeof VALENTINE_BOUNDARY;
        entities: { id: string; model: string; position: WorldPlacement['position']; source: string;
          bounds: { min: number[]; max: number[] } }[]; errors: string[] };
      focusModel(model: string, height?: number): boolean;
      sampleGround(x: number, z: number, referenceY?: number): number | undefined;
    };
  }
}
