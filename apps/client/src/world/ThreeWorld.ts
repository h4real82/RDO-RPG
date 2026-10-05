import * as THREE from 'three';
import { Room, Client } from 'colyseus.js';
import {
  WorldState,
  Player,
  RoomMessage,
  MoveIntentMessage,
  GaitMode,
  POIDefinition,
  TimeOfDay,
  WeatherState,
  WORLD_MAP_WIDTH,
  WORLD_MAP_HEIGHT,
  DEFAULT_SPAWN_X,
  DEFAULT_SPAWN_Y,
  PLAYER_WALK_SPEED,
  PLAYER_JOG_SPEED,
  PLAYER_SPRINT_SPEED
} from '@rdo-rpg/shared';
import { pois } from '@rdo-rpg/content';
import { UserProfile } from '../discord';
import { rpgMenuManager } from '../menu';
import { ValentineCity } from './ValentineCity';
import { WorldChunkManager } from './WorldChunkManager';
import { CowboyCharacter } from './CowboyCharacter';
import { TextureGenerator } from './TextureGenerator';
import { MinimapSystem } from './MinimapSystem';

interface ClickTargetMarker {
  x: number;
  z: number;
  mesh: THREE.Group;
  createdAt: number;
}

export class ThreeWorld {
  private client: Client;
  private room: Room<WorldState>;
  private profile: UserProfile;

  // Three.js Core
  private container: HTMLElement;
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private cameraTarget: THREE.Vector3 = new THREE.Vector3(72, 0, 46.4);
  private valentineCity!: ValentineCity;
  public chunkManager!: WorldChunkManager;

  // Lighting & Atmosphere
  private sunLight!: THREE.DirectionalLight;
  private hemiLight!: THREE.HemisphereLight;
  private ambientLight!: THREE.AmbientLight;
  private currentTimeOfDay: TimeOfDay = TimeOfDay.GOLDEN_HOUR;
  private currentWeather: WeatherState = WeatherState.CLEAR;

  // Particle systems
  private weatherParticles!: THREE.Points;
  private particlePositions!: Float32Array;
  private particleVelocities!: Float32Array;

  // Local Player
  private localPlayer!: CowboyCharacter;
  private posX: number = 0;
  private posZ: number = 0;
  private heading: number = Math.PI;
  private isMoving: boolean = false;
  private currentGait: GaitMode = GaitMode.JOG;
  private isSprinting: boolean = false;
  private stamina: number = 100;
  private maxStamina: number = 100;
  private noclip: boolean = false; // Solid AABB mesh collision active by default

  // Camera Zoom & Orbit
  // Default: 7.0m behind and 2.8m above player (distance ~7.535m)
  private cameraZoomDistance: number = Math.hypot(7.0, 2.8);
  private readonly cameraMinZoom: number = 4.0;
  private readonly cameraMaxZoom: number = 45.0; // Expanded to 45m for full bird-eye view of all districts
  private cameraYaw: number = 0; // Relative horizontal rotation around player
  private cameraPitch: number = Math.atan2(2.8, 7.0); // Relative elevation angle (~21.8°)
  private isOrbiting: boolean = false;
  private lastMouseX: number = 0;
  private lastMouseY: number = 0;

  // Collision Debug Wireframe Visualizer ('C' key)
  private debugCollisionVisible: boolean = false;
  private debugCollisionGroup: THREE.Group = new THREE.Group();

  // Remote Players
  private remotePlayers: Map<string, CowboyCharacter> = new Map();

  // Navigation & Line-of-sight
  private raycaster: THREE.Raycaster = new THREE.Raycaster();
  private occlusionRaycaster: THREE.Raycaster = new THREE.Raycaster();
  private mousePos: THREE.Vector2 = new THREE.Vector2();
  private clickMarker: ClickTargetMarker | null = null;
  private clickNavDestination: THREE.Vector3 | null = null;

  // Inputs
  private keysPressed: Set<string> = new Set();
  private lastNetworkTick: number = 0;
  private clock: THREE.Clock = new THREE.Clock();

  // Minimap Squircle System
  private minimapSystem: MinimapSystem | null = null;

  // POI Proximity
  private currentNearbyPOI: POIDefinition | null = null;

  constructor(client: Client, room: Room<WorldState>, profile: UserProfile) {
    this.client = client;
    this.room = room;
    this.profile = profile;

    const gameContainer = document.getElementById('game-container');
    if (!gameContainer) throw new Error('game-container element not found');
    this.container = gameContainer;

    this.initThree();
    this.initEnvironment();
    this.initLocalPlayer();
    this.initInputListeners();
    this.initNetworkListeners();
    this.initMinimap();

    // Fast travel callback from menu
    rpgMenuManager.setOnTravel((destX, destY) => {
      try {
        this.posX = destX;
        this.posZ = destY;

        // Query proper terrain elevation at destination
        const groundY = this.getGroundElevation(this.posX, this.posZ);

        this.localPlayer.setPosition(this.posX, groundY, this.posZ);
        this.clickNavDestination = null;
        if (this.clickMarker) {
          this.scene.remove(this.clickMarker.mesh);
          this.clickMarker = null;
        }

        // Synchronous chunk flush + reload at destination
        if (this.chunkManager) {
          this.chunkManager.forceUpdate(this.posX, this.posZ, this.camera);
        }

        // Recenter camera and shadow immediately
        this.updateCameraPosition(true);
        this.recenterShadowCamera();
        this.camera.updateProjectionMatrix();

        this.sendNetworkPosition(0, 0);
        console.log(`[ThreeWorld] Fast travel to (${this.posX.toFixed(1)}, ${this.posZ.toFixed(1)}), groundY=${groundY.toFixed(1)}`);
      } catch (err) {
        console.error('[ThreeWorld] Error during fast travel:', err);
      }
    });

    // Start 60 FPS Render Loop
    this.animate();
  }

  /**
   * Retrieves ground elevation across Valentine local coordinates and global world chunks
   */
  public getGroundElevation(x: number, z: number): number {
    // In Valentine local bounds [-280 to 140, -50 to 300], blend with Valentine city elevation
    if (x >= -280 && x <= 140 && z >= -50 && z <= 300) {
      return this.valentineCity ? this.valentineCity.getGroundHeight(x, z) : 0;
    }
    // Outside Valentine, query chunkManager interpolated elevation
    if (this.chunkManager) {
      return this.chunkManager.getGroundHeightAt(x, z);
    }
    return this.valentineCity ? this.valentineCity.getGroundHeight(x, z) : 0;
  }

  public teleport(x: number, z: number) {
    try {
      this.posX = x;
      this.posZ = z;

      // Query proper terrain elevation at destination
      const groundY = this.getGroundElevation(this.posX, this.posZ);

      this.localPlayer.setPosition(this.posX, groundY, this.posZ);
      this.clickNavDestination = null;
      if (this.clickMarker) {
        this.scene.remove(this.clickMarker.mesh);
        this.clickMarker = null;
      }

      // Synchronous chunk flush + reload at destination
      if (this.chunkManager) {
        this.chunkManager.forceUpdate(this.posX, this.posZ, this.camera);
      }

      // Recenter camera and shadow immediately
      this.updateCameraPosition(true);
      this.recenterShadowCamera();
      this.camera.updateProjectionMatrix();

      this.sendNetworkPosition(0, 0);
      console.log(`[ThreeWorld] Teleport to (${this.posX.toFixed(1)}, ${this.posZ.toFixed(1)}), groundY=${groundY.toFixed(1)}`);
    } catch (err) {
      console.error('[ThreeWorld] Error during teleport:', err);
    }
  }

  private initThree() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0c0907);

    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;

    // Tactical RPG Perspective Camera (Steep overview, wider zoom)
    // Near 0.3 prevents z-fighting on close geometry; far 600 covers world streaming range without depth buffer loss
    this.camera = new THREE.PerspectiveCamera(40, width / height, 0.3, 600);
    this.updateCameraPosition(true);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      stencil: false
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    // Prepend Three canvas behind UI elements
    this.renderer.domElement.style.position = 'absolute';
    this.renderer.domElement.style.top = '0';
    this.renderer.domElement.style.left = '0';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.renderer.domElement.style.zIndex = '0';
    this.container.prepend(this.renderer.domElement);

    window.addEventListener('resize', () => {
      const w = this.container.clientWidth || window.innerWidth;
      const h = this.container.clientHeight || window.innerHeight;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
    });

    // Build Valentine 3D World
    this.valentineCity = new ValentineCity(this.scene);
    this.valentineCity.buildValentineWorld();

    // RDO Master Manifest Chunk Streaming (500m chunks, 1000m LOD radius)
    this.chunkManager = new WorldChunkManager(this.scene);
    this.chunkManager.update(new THREE.Vector3(this.posX, 0, this.posZ), this.camera);

    // Debug Collision Group
    this.debugCollisionGroup.name = 'DebugCollisionWireframes';
    this.debugCollisionGroup.visible = false;
    this.scene.add(this.debugCollisionGroup);
  }

  private initEnvironment() {
    // 1. Hemisphere Light for soft atmospheric sky/ground fill
    this.hemiLight = new THREE.HemisphereLight(0x78a7d8, 0x44301c, 0.85);
    this.scene.add(this.hemiLight);

    // 2. Base Ambient Light (ensures dark corners and night remain readable, at least 0.6)
    this.ambientLight = new THREE.AmbientLight(0x403226, 0.65);
    this.scene.add(this.ambientLight);

    // 3. Directional Sun/Moon with Shadow Map
    this.sunLight = new THREE.DirectionalLight(0xffeedd, 2.0);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.near = 0.5;
    this.sunLight.shadow.camera.far = 250;
    this.sunLight.shadow.bias = 0.0002;
    this.sunLight.shadow.normalBias = 0.05;

    const shadowDist = 45;
    this.sunLight.shadow.camera.left = -shadowDist;
    this.sunLight.shadow.camera.right = shadowDist;
    this.sunLight.shadow.camera.top = shadowDist;
    this.sunLight.shadow.camera.bottom = -shadowDist;

    this.scene.add(this.sunLight);
    this.scene.add(this.sunLight.target);

    // Weather Particles (Dust / Rain)
    this.initWeatherParticles();

    // Apply initial Golden Hour preset
    this.applyTimeOfDay(this.currentTimeOfDay);
    this.applyWeather(this.currentWeather);
  }

  private initWeatherParticles() {
    const particleCount = 1200;
    const geo = new THREE.BufferGeometry();
    this.particlePositions = new Float32Array(particleCount * 3);
    this.particleVelocities = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      const idx = i * 3;
      this.particlePositions[idx] = (Math.random() - 0.5) * 80;
      this.particlePositions[idx + 1] = Math.random() * 25;
      this.particlePositions[idx + 2] = (Math.random() - 0.5) * 60;

      this.particleVelocities[idx] = -0.5 - Math.random() * 1.5;
      this.particleVelocities[idx + 1] = -8.0 - Math.random() * 4.0;
      this.particleVelocities[idx + 2] = 0.2 + (Math.random() - 0.5) * 0.5;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(this.particlePositions, 3));

    const pTex = TextureGenerator.getParticleTexture();
    const pMat = new THREE.PointsMaterial({
      color: 0x93c5fd,
      map: pTex,
      size: 0.35,
      transparent: true,
      depthWrite: false,
      opacity: 0.75
    });

    this.weatherParticles = new THREE.Points(geo, pMat);
    this.weatherParticles.visible = false;
    this.scene.add(this.weatherParticles);
  }

  private initLocalPlayer() {
    this.localPlayer = new CowboyCharacter(this.profile.username, true);
    
    // 1. SPAWN-PUNKT ERZWINGEN:
    // Setze die Startposition des Spielers hart auf die freie Straße:
    const safeX = 0;
    const safeZ = 0;
    const getTerrainHeight = (x: number, z: number) => {
      if (this.valentineCity && typeof this.valentineCity.getGroundHeight === 'function') {
        return this.valentineCity.getGroundHeight(x, z);
      }
      return 0;
    };
    const safeY = (typeof getTerrainHeight === 'function' ? getTerrainHeight(safeX, safeZ) : 0) + 1.8;

    this.posX = safeX;
    this.posZ = safeZ;
    this.localPlayer.setPosition(safeX, safeY, safeZ);
    this.localPlayer.root.position.set(safeX, safeY, safeZ);
    this.localPlayer.root.visible = true;

    this.heading = Math.PI; // Face towards Z = -20 (Saloon)
    this.localPlayer.setHeading(this.heading, 1.0);
    
    // 2. MESH-CHECK & RENDER-STATUS:
    // Stelle sicher, dass das Mesh des Spielers wirklich mit 'scene.add(player)' in der Szene landet
    if (!this.scene.children.includes(this.localPlayer.root)) {
      this.scene.add(this.localPlayer.root);
    }

    // 3. KAMERA-RESET:
    // Standardabstand: 4.5 Meter hinter und 2.0 Meter über dem Charakter:
    this.updateCameraPosition(true);
  }

  private applyTimeOfDay(tod: TimeOfDay) {
    this.currentTimeOfDay = tod;

    if (tod === TimeOfDay.NOON) {
      // High bright warm sun shining from South-East onto front facades
      this.sunLight.color.setHex(0xfffaec);
      this.sunLight.intensity = 3.6;
      this.sunLight.position.set(this.posX + 20, 65, this.posZ + 20);
      this.hemiLight.color.setHex(0x90c5f5);
      this.hemiLight.groundColor.setHex(0x6e5238);
      this.hemiLight.intensity = 1.3;
      this.ambientLight.color.setHex(0x4a3a2c);
      this.ambientLight.intensity = 0.85;
      this.scene.background = new THREE.Color(0x76b4ea);
      this.renderer.toneMappingExposure = 1.35;
    } else if (tod === TimeOfDay.GOLDEN_HOUR) {
      // Low western amber sunset shining from South-West
      this.sunLight.color.setHex(0xff9e44);
      this.sunLight.intensity = 3.2;
      this.sunLight.position.set(this.posX - 45, 28, this.posZ + 25);
      this.hemiLight.color.setHex(0xfda560);
      this.hemiLight.groundColor.setHex(0x52321a);
      this.hemiLight.intensity = 1.2;
      this.ambientLight.color.setHex(0x3e2815);
      this.ambientLight.intensity = 0.75;
      this.scene.background = new THREE.Color(0xd47535);
      this.renderer.toneMappingExposure = 1.25;
    } else {
      // Cool deep blue moonlight from South - excellent visibility (no pitch-black blinds)
      this.sunLight.color.setHex(0x6699dd);
      this.sunLight.intensity = 2.0;
      this.sunLight.position.set(this.posX - 20, 50, this.posZ + 30);
      this.hemiLight.color.setHex(0x38557a);
      this.hemiLight.groundColor.setHex(0x182436);
      this.hemiLight.intensity = 1.1;
      this.ambientLight.color.setHex(0x283850);
      this.ambientLight.intensity = 0.85;
      this.scene.background = new THREE.Color(0x0e1828);
      this.renderer.toneMappingExposure = 1.2;
    }

    this.sunLight.target.position.set(this.posX, 0, this.posZ);
    this.updateEnvironmentHUD();
  }

  private applyWeather(weather: WeatherState) {
    this.currentWeather = weather;

    const pMat = this.weatherParticles.material as THREE.PointsMaterial;

    if (weather === WeatherState.CLEAR) {
      this.scene.fog = null;
      this.weatherParticles.visible = false;
      if (this.valentineCity.groundMesh) {
        (this.valentineCity.groundMesh.material as THREE.MeshStandardMaterial).roughness = 0.85;
      }
    } else if (weather === WeatherState.DUST_STORM) {
      this.scene.fog = new THREE.FogExp2(0xa07548, 0.018);
      this.weatherParticles.visible = true;
      pMat.color.setHex(0xcca377);
      pMat.size = 0.22;
      pMat.opacity = 0.7;
    } else if (weather === WeatherState.RAIN) {
      this.scene.fog = new THREE.FogExp2(0x28323c, 0.022);
      this.weatherParticles.visible = true;
      pMat.color.setHex(0x93c5fd);
      pMat.size = 0.16;
      pMat.opacity = 0.75;
      // Make ground wet & specular
      if (this.valentineCity.groundMesh) {
        (this.valentineCity.groundMesh.material as THREE.MeshStandardMaterial).roughness = 0.25;
      }
    }

    this.updateEnvironmentHUD();
  }

  private updateEnvironmentHUD() {
    const badge = document.getElementById('env-badge');
    if (!badge) return;

    const timeLabel =
      this.currentTimeOfDay === TimeOfDay.NOON
        ? '☀️ MITTAG'
        : this.currentTimeOfDay === TimeOfDay.GOLDEN_HOUR
        ? '🌅 GOLDEN HOUR'
        : '🌙 NACHT';

    const weatherLabel =
      this.currentWeather === WeatherState.CLEAR
        ? '🌤️ KLAR'
        : this.currentWeather === WeatherState.DUST_STORM
        ? '🌪️ STAUBSTURM'
        : '🌧️ REGEN';

    badge.textContent = `${timeLabel} · ${weatherLabel}`;
  }

  private initInputListeners() {
    // Keyboard inputs
    window.addEventListener('keydown', (e) => {
      try {
        if (!e || !e.code) return;
        if (rpgMenuManager?.isMenuOpen()) return;

        this.keysPressed.add(e.code);

        // Cancel click destination when player uses keyboard
        if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
          this.clearClickNav();
        }

        // Toggle Time of Day (L)
        if (e.code === 'KeyL') {
          this.cycleTimeOfDay();
        }

        // Toggle Weather (K)
        if (e.code === 'KeyK') {
          this.cycleWeather();
        }

        // Toggle Gait (G or CapsLock)
        if (e.code === 'KeyG' || e.code === 'CapsLock') {
          this.toggleGait();
        }

        // Toggle Collision Wireframe Debug Mesh ('C')
        if (e.code === 'KeyC') {
          this.toggleCollisionDebug();
        }

        // Toggle Minimap Zoom ('N')
        if (e.code === 'KeyN') {
          this.minimapSystem?.cycleZoom();
        }

        // Minimap Zoom In / Out ('+' / '-')
        if (e.code === 'Equal' || e.code === 'NumpadAdd') {
          this.minimapSystem?.zoomIn();
        }
        if (e.code === 'Minus' || e.code === 'NumpadSubtract') {
          this.minimapSystem?.zoomOut();
        }

        // Toggle Minimap Compass Mode vs North-Up ('U')
        if (e.code === 'KeyU') {
          this.minimapSystem?.toggleCompassMode();
        }

        // Toggle Minimap Building Footprints ('B')
        if (e.code === 'KeyB') {
          this.minimapSystem?.toggleBuildings();
        }

        // Adjust Minimap Opacity ('[' and ']')
        if (e.code === 'BracketLeft') {
          this.minimapSystem?.adjustOpacity(-0.15);
        }
        if (e.code === 'BracketRight') {
          this.minimapSystem?.adjustOpacity(0.15);
        }
      } catch (err) {
        console.error('[ThreeWorld] Error in keydown listener:', err);
      }
    });

    // Mouse-Wheel Zoom: Stufenloser Kameraabstand zwischen 4.0m und 20.0m
    this.renderer.domElement.addEventListener('wheel', (e: WheelEvent) => {
      try {
        if (!e) return;
        e.preventDefault();
        const zoomDelta = e.deltaY * 0.008;
        this.cameraZoomDistance = THREE.MathUtils.clamp(
          this.cameraZoomDistance + zoomDelta,
          this.cameraMinZoom,
          this.cameraMaxZoom
        );
      } catch (err) {
        console.error('[ThreeWorld] Error in wheel zoom handler:', err);
      }
    }, { passive: false });

    // Prevent default context menu for smooth right-click camera orbit
    this.renderer.domElement.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });

    window.addEventListener('keyup', (e) => {
      try {
        if (!e || !e.code) return;
        this.keysPressed.delete(e.code);
      } catch (err) {
        console.error('[ThreeWorld] Error in keyup listener:', err);
      }
    });

    // Pointer events: Left click for navigation, Right click for Orbit / Pitch / Yaw
    this.renderer.domElement.addEventListener('pointerdown', (e: PointerEvent) => {
      try {
        if (!e || rpgMenuManager?.isMenuOpen()) return;

        if (e.button === 2) {
          // Right-click: start free camera orbit
          this.isOrbiting = true;
          this.lastMouseX = e.clientX;
          this.lastMouseY = e.clientY;
          return;
        }

        if (e.button === 0) {
          const rect = this.renderer.domElement.getBoundingClientRect();
          if (!rect || rect.width === 0 || rect.height === 0) return;

          this.mousePos.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
          this.mousePos.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

          this.raycaster.setFromCamera(this.mousePos, this.camera);
          const intersects = this.valentineCity?.groundMesh
            ? this.raycaster.intersectObject(this.valentineCity.groundMesh, false)
            : [];

          if (intersects.length > 0 && intersects[0]?.point) {
            const hit = intersects[0].point;
            this.setClickTarget(hit.x, hit.z);
          } else {
            // Fallback to ground plane (y=0) intersection
            const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
            const planeHit = new THREE.Vector3();
            if (this.raycaster.ray.intersectPlane(groundPlane, planeHit)) {
              const maxW = WORLD_MAP_WIDTH * ValentineCity.SCALE;
              const maxH = WORLD_MAP_HEIGHT * ValentineCity.SCALE;
              const targetX = Math.max(1, Math.min(maxW - 1, planeHit.x));
              const targetZ = Math.max(1, Math.min(maxH - 1, planeHit.z));
              this.setClickTarget(targetX, targetZ);
            }
          }
        }
      } catch (err) {
        console.error('[ThreeWorld] Error in pointerdown handler:', err);
      }
    });

    window.addEventListener('pointermove', (e: PointerEvent) => {
      try {
        if (!this.isOrbiting) return;
        const dx = e.clientX - this.lastMouseX;
        const dy = e.clientY - this.lastMouseY;
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;

        // Yaw: horizontal orbit around player
        this.cameraYaw -= dx * 0.005;

        // Pitch: elevation angle (clamp between 0.1 rad (~5°) and 1.45 rad (~83°))
        this.cameraPitch = THREE.MathUtils.clamp(
          this.cameraPitch + dy * 0.004,
          0.1,
          1.45
        );
      } catch (err) {
        console.error('[ThreeWorld] Error in pointermove orbit handler:', err);
      }
    });

    window.addEventListener('pointerup', (e: PointerEvent) => {
      if (e.button === 2) {
        this.isOrbiting = false;
      }
    });
  }

  private setClickTarget(x: number, z: number) {
    this.clickNavDestination = new THREE.Vector3(x, 0, z);

    if (this.clickMarker) {
      this.scene.remove(this.clickMarker.mesh);
    }

    const group = new THREE.Group();
    group.position.set(x, 0.08, z);

    // Expanding beacon ring
    const ringGeo = new THREE.RingGeometry(0.5, 0.7, 24);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xd4af37,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    group.add(ring);

    // Inner diamond dot
    const dot = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    dot.position.y = 0.1;
    group.add(dot);

    this.scene.add(group);
    this.clickMarker = { x, z, mesh: group, createdAt: performance.now() };
  }

  private clearClickNav() {
    this.clickNavDestination = null;
    if (this.clickMarker) {
      this.scene.remove(this.clickMarker.mesh);
      this.clickMarker = null;
    }
  }

  private toggleGait() {
    if (this.currentGait === GaitMode.WALK) {
      this.currentGait = GaitMode.JOG;
    } else if (this.currentGait === GaitMode.JOG) {
      this.currentGait = GaitMode.SPRINT;
    } else {
      this.currentGait = GaitMode.WALK;
    }

    const badge = document.getElementById('gait-badge');
    if (badge) {
      badge.textContent =
        this.currentGait === GaitMode.WALK ? '🚶 GEHEN' : this.currentGait === GaitMode.JOG ? '🏃 TRAB' : '🐎 SPRINT';
    }
  }

  /**
   * Toggles the debug wireframe visualization of all active AABB obstacle collision boxes ('C' key)
   */
  private toggleCollisionDebug() {
    this.debugCollisionVisible = !this.debugCollisionVisible;

    // Clear previous helpers
    while (this.debugCollisionGroup.children.length > 0) {
      const child = this.debugCollisionGroup.children[0];
      this.debugCollisionGroup.remove(child);
      if ((child as any).geometry) (child as any).geometry.dispose();
      if ((child as any).material) (child as any).material.dispose();
    }

    if (this.debugCollisionVisible && this.valentineCity) {
      for (const box of this.valentineCity.obstacleBoxes) {
        const helper = new THREE.Box3Helper(box, new THREE.Color(0xff2222));
        this.debugCollisionGroup.add(helper);
      }
      this.debugCollisionGroup.visible = true;
      console.log(`[ThreeWorld] Collision debug wireframes ENABLED (${this.valentineCity.obstacleBoxes.length} boxes)`);
    } else {
      this.debugCollisionGroup.visible = false;
      console.log('[ThreeWorld] Collision debug wireframes DISABLED');
    }
  }

  private cycleTimeOfDay() {
    const list = [TimeOfDay.NOON, TimeOfDay.GOLDEN_HOUR, TimeOfDay.NIGHT];
    const idx = (list.indexOf(this.currentTimeOfDay) + 1) % list.length;
    const next = list[idx];
    this.applyTimeOfDay(next);
    this.room.send(RoomMessage.SET_TIME_OF_DAY, { timeOfDay: next });
  }

  private cycleWeather() {
    const list = [WeatherState.CLEAR, WeatherState.DUST_STORM, WeatherState.RAIN];
    const idx = (list.indexOf(this.currentWeather) + 1) % list.length;
    const next = list[idx];
    this.applyWeather(next);
    this.room.send(RoomMessage.SET_WEATHER, { weather: next });
  }

  private initNetworkListeners() {
    // Other players sync
    this.room.state.players.onAdd((player, sessionId) => {
      if (sessionId === this.room.sessionId) {
        // Only adopt server pos if not overriding the initial hard spawn
        return;
      }

      console.log(`[ThreeWorld] Remote player joined: ${sessionId} (${player.username})`);
      const remoteCowboy = new CowboyCharacter(player.username, false);
      remoteCowboy.setPosition(player.position.x * ValentineCity.SCALE, 0, player.position.y * ValentineCity.SCALE);
      this.remotePlayers.set(sessionId, remoteCowboy);
      this.scene.add(remoteCowboy.root);

      player.position.onChange(() => {
        const targetX = player.position.x * ValentineCity.SCALE;
        const targetZ = player.position.y * ValentineCity.SCALE;
        remoteCowboy.setPosition(targetX, 0, targetZ);
        if (player.position.heading !== undefined) {
          remoteCowboy.setHeading(player.position.heading, 0.05);
        }
        remoteCowboy.update(0.016, player.position.isMoving, GaitMode.JOG, 1.0);
      });
    });

    this.room.state.players.onRemove((player, sessionId) => {
      const cowboy = this.remotePlayers.get(sessionId);
      if (cowboy) {
        this.scene.remove(cowboy.root);
        this.remotePlayers.delete(sessionId);
      }
    });

    // Server-wide Time & Weather Sync
    this.room.state.listen('timeOfDay', (value) => {
      if (value && Object.values(TimeOfDay).includes(value as TimeOfDay)) {
        this.applyTimeOfDay(value as TimeOfDay);
      }
    });

    this.room.state.listen('weather', (value) => {
      if (value && Object.values(WeatherState).includes(value as WeatherState)) {
        this.applyWeather(value as WeatherState);
      }
    });
  }

  private initMinimap() {
    const canvas = document.getElementById('rdr-minimap-canvas') as HTMLCanvasElement;
    if (canvas) {
      this.minimapSystem = new MinimapSystem(canvas);
    }
  }

  /**
   * Main 60 FPS update and render cycle
   */
  private animate = () => {
    requestAnimationFrame(this.animate);

    try {
      const delta = Math.min(this.clock.getDelta(), 0.1);
      const now = performance.now();

      this.updatePlayerMovement(delta);
      this.updateCameraPosition(false);

      this.updateWeatherParticles(delta);
      this.valentineCity.update(new THREE.Vector3(this.posX, 0, this.posZ));
      if (this.chunkManager) {
        this.chunkManager.update(new THREE.Vector3(this.posX, 0, this.posZ), this.camera);
      }
      this.updateClickMarker(now);
      this.checkPOIProximity();
      this.renderMinimap();

      // 20Hz server position sync
      if (now - this.lastNetworkTick >= 50) {
        this.lastNetworkTick = now;
        this.sendNetworkPosition(0, 0);
      }

      this.renderer.render(this.scene, this.camera);
    } catch (err) {
      console.error('[ThreeWorld] Render loop protected from fatal exception:', err);
    }
  };

  /**
   * Continuous movement calculation strictly aligned to camera screen-space (W=up, S=down, A=left, D=right)
   * with 3D obstacle bounding-box sliding
   */
  private updatePlayerMovement(delta: number) {
    if (rpgMenuManager.isMenuOpen()) {
      this.isMoving = false;
      this.keysPressed.clear();
      this.clearClickNav();
      this.localPlayer.update(delta, false, this.currentGait, 1.0);
      return;
    }

    // Determine target speed
    this.isSprinting =
      this.keysPressed.has('ShiftLeft') ||
      this.keysPressed.has('ShiftRight') ||
      this.currentGait === GaitMode.SPRINT;

    // Stamina drain/recovery
    if (this.isSprinting && this.isMoving) {
      this.stamina = Math.max(0, this.stamina - delta * 15);
      if (this.stamina <= 0) this.isSprinting = false;
    } else {
      this.stamina = Math.min(this.maxStamina, this.stamina + delta * 20);
    }

    // Update stamina HUD bar
    const staminaBar = document.getElementById('core-stamina');
    if (staminaBar) {
      staminaBar.style.width = `${(this.stamina / this.maxStamina) * 100}%`;
    }

    let speed = (PLAYER_JOG_SPEED * ValentineCity.SCALE);
    let activeGait = GaitMode.JOG;

    if (this.isSprinting) {
      speed = (PLAYER_SPRINT_SPEED * ValentineCity.SCALE);
      activeGait = GaitMode.SPRINT;
    } else if (this.currentGait === GaitMode.WALK) {
      speed = (PLAYER_WALK_SPEED * ValentineCity.SCALE);
      activeGait = GaitMode.WALK;
    }

    // 1. Calculate camera forward and right vectors projected onto the horizontal ground plane (XZ)
    const camForward = new THREE.Vector3(
      this.cameraTarget.x - this.camera.position.x,
      0,
      this.cameraTarget.z - this.camera.position.z
    ).normalize();
    const camRight = new THREE.Vector3().crossVectors(camForward, new THREE.Vector3(0, 1, 0)).normalize();

    const moveDir = new THREE.Vector3(0, 0, 0);

    // Keyboard Input strictly aligned to the camera screen space
    // W = straight UP in viewport, S = straight DOWN, D = straight RIGHT, A = straight LEFT
    if (this.keysPressed.has('KeyW') || this.keysPressed.has('ArrowUp')) moveDir.add(camForward);
    if (this.keysPressed.has('KeyS') || this.keysPressed.has('ArrowDown')) moveDir.sub(camForward);
    if (this.keysPressed.has('KeyD') || this.keysPressed.has('ArrowRight')) moveDir.add(camRight);
    if (this.keysPressed.has('KeyA') || this.keysPressed.has('ArrowLeft')) moveDir.sub(camRight);

    // 2. Point-and-Click Input (if no keyboard keys pressed)
    if (this.clickNavDestination && moveDir.lengthSq() === 0) {
      const dx = this.clickNavDestination.x - this.posX;
      const dz = this.clickNavDestination.z - this.posZ;
      const dist = Math.hypot(dx, dz);

      if (dist > 0.4) {
        moveDir.set(dx / dist, 0, dz / dist);
      } else {
        this.clearClickNav();
      }
    }

    if (moveDir.lengthSq() > 0.0001) {
      moveDir.normalize();
      const moveDistance = speed * delta;
      const moveVec = new THREE.Vector3(moveDir.x * moveDistance, 0, moveDir.z * moveDistance);

      const groundY = this.getGroundElevation(this.posX, this.posZ);
      const sphereRadius = 0.45; // 0.45m bounding sphere radius

      // Resolve collision with sliding response against massive Box3 obstacles
      const newPos = this.resolveSphereCollisions(
        new THREE.Vector3(this.posX, groundY, this.posZ),
        moveVec,
        sphereRadius,
        groundY
      );

      this.posX = newPos.x;
      this.posZ = newPos.z;

      // Free exploration across all streamed chunks (artificial boundary clamp removed)

      // Heading aligns with actual movement vector or intended direction
      if (moveVec.lengthSq() > 0.00001) {
        this.heading = Math.atan2(moveVec.x, moveVec.z);
      } else {
        this.heading = Math.atan2(moveDir.x, moveDir.z);
      }
      this.localPlayer.setHeading(this.heading, delta);

      this.isMoving = true;
    } else {
      this.isMoving = false;
    }

    const groundY = this.getGroundElevation(this.posX, this.posZ);
    this.localPlayer.setPosition(this.posX, groundY, this.posZ);
    this.localPlayer.update(delta, this.isMoving, activeGait, speed / (PLAYER_JOG_SPEED * ValentineCity.SCALE));
  }

  /**
   * Resolves obstacle collision using a Bounding Sphere (radius 0.45m) with smooth wall sliding.
   * Nullifies movement component perpendicular to walls while preserving parallel gliding.
   */
  private resolveSphereCollisions(
    currentPos: THREE.Vector3,
    moveVec: THREE.Vector3,
    radius: number = 0.45,
    groundY: number
  ): THREE.Vector3 {
    const chunkObstacles = this.chunkManager ? this.chunkManager.getActiveObstacleBoxes() : [];
    const valObstacles = this.valentineCity ? this.valentineCity.obstacleBoxes : [];
    const allObstacles = [...valObstacles, ...chunkObstacles];

    if (this.noclip || allObstacles.length === 0) {
      return currentPos.clone().add(moveVec);
    }

    // Step position with desired movement
    const sphereCenter = new THREE.Vector3(
      currentPos.x + moveVec.x,
      groundY + 0.9,
      currentPos.z + moveVec.z
    );

    const closest = new THREE.Vector3();
    const diff = new THREE.Vector3();
    const normal = new THREE.Vector3();

    // Iterative resolution (up to 3 passes for corners and complex geometries)
    for (let iter = 0; iter < 3; iter++) {
      let collided = false;

      for (const box of allObstacles) {
        // Vertical check: only collide with obstacles that intersect player height cylinder
        if (box.max.y < groundY + 0.1 || box.min.y > groundY + 1.8) {
          continue;
        }

        // Clamp sphere center to closest point on obstacle Box3
        box.clampPoint(sphereCenter, closest);
        diff.subVectors(sphereCenter, closest);
        diff.y = 0; // Horizontal sliding on ground plane

        const dist = diff.length();

        if (dist < radius) {
          collided = true;

          if (dist > 0.0001) {
            normal.copy(diff).multiplyScalar(1 / dist);
          } else {
            // Sphere center penetrated inside box: find shallowest exit normal
            const dxMin = Math.abs(sphereCenter.x - box.min.x);
            const dxMax = Math.abs(box.max.x - sphereCenter.x);
            const dzMin = Math.abs(sphereCenter.z - box.min.z);
            const dzMax = Math.abs(box.max.z - sphereCenter.z);
            const minAxisDist = Math.min(dxMin, dxMax, dzMin, dzMax);

            if (minAxisDist === dxMin) normal.set(-1, 0, 0);
            else if (minAxisDist === dxMax) normal.set(1, 0, 0);
            else if (minAxisDist === dzMin) normal.set(0, 0, -1);
            else normal.set(0, 0, 1);
          }

          // Push sphere center out of obstacle along contact normal
          const penetration = radius - dist;
          sphereCenter.addScaledVector(normal, penetration);

          // Wall-sliding response:
          // Project moveVec onto normal. If moving towards obstacle (dot < 0), cancel normal component
          const dot = moveVec.dot(normal);
          if (dot < 0) {
            moveVec.sub(normal.clone().multiplyScalar(dot));
          }
        }
      }

      if (!collided) break;
    }

    return new THREE.Vector3(sphereCenter.x, groundY, sphereCenter.z);
  }

  /**
   * Smoothly updates camera following player:
   * - Default distance: 7.0m behind and 2.8m above player
   * - Zoom range: 4.0m to 20.0m
   * - Smooth lerp damping: 0.1
   * - Pitch/Yaw free orbit with right mouse drag, focus point at player.y + 1.2
   */
  private updateCameraPosition(immediate: boolean = false) {
    const groundY = this.getGroundElevation(this.posX, this.posZ);
    const playerPos = new THREE.Vector3(this.posX, groundY, this.posZ);
    const targetLookAt = playerPos.clone().add(new THREE.Vector3(0, 1.2, 0));

    // Spherical coordinates around targetLookAt
    // cameraPitch: elevation angle above horizontal plane (clamped 0.1 to 1.45 rad)
    // cameraYaw: azimuthal angle around the vertical axis
    const hDist = this.cameraZoomDistance * Math.cos(this.cameraPitch);
    const vDist = this.cameraZoomDistance * Math.sin(this.cameraPitch);
    const offsetX = Math.sin(this.cameraYaw) * hDist;
    const offsetZ = Math.cos(this.cameraYaw) * hDist;
    const offsetY = vDist;

    const desiredCamPos = targetLookAt.clone().add(new THREE.Vector3(offsetX, offsetY, offsetZ));

    if (immediate) {
      this.cameraTarget.copy(targetLookAt);
      this.camera.position.copy(desiredCamPos);
      this.camera.lookAt(targetLookAt);
    } else {
      this.cameraTarget.lerp(targetLookAt, 0.1);
      this.camera.position.lerp(desiredCamPos, 0.1);
      this.camera.lookAt(this.cameraTarget);
    }

    // Keep directional sunlight centered around player for sharp shadow map resolution
    if (this.sunLight) {
      this.sunLight.target.position.set(this.posX, groundY, this.posZ);
      this.sunLight.target.updateMatrixWorld();
    }
  }

  /**
   * Recenters the DirectionalLight shadow camera frustum around the current player position.
   * Called after teleport to prevent shadow map tearing/artifacts from stale frustum bounds.
   */
  private recenterShadowCamera(): void {
    try {
      if (!this.sunLight) return;

      const groundY = this.getGroundElevation(this.posX, this.posZ);

      // Recenter sun position relative to new player position
      // Preserve the directional offset from applyTimeOfDay
      const sunOffset = this.sunLight.position.clone().sub(this.sunLight.target.position);
      this.sunLight.target.position.set(this.posX, groundY, this.posZ);
      this.sunLight.position.copy(this.sunLight.target.position).add(sunOffset);

      // Expand shadow frustum to cover the streaming area around new position
      const shadowDist = 45;
      this.sunLight.shadow.camera.left = -shadowDist;
      this.sunLight.shadow.camera.right = shadowDist;
      this.sunLight.shadow.camera.top = shadowDist;
      this.sunLight.shadow.camera.bottom = -shadowDist;
      this.sunLight.shadow.camera.updateProjectionMatrix();

      this.sunLight.target.updateMatrixWorld();
      this.sunLight.updateMatrixWorld();
    } catch (err) {
      console.error('[ThreeWorld] Error recentering shadow camera:', err);
    }
  }



  private updateWeatherParticles(delta: number) {
    if (!this.weatherParticles.visible) return;

    const count = this.particlePositions.length / 3;
    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      this.particlePositions[idx] += this.particleVelocities[idx] * delta;
      this.particlePositions[idx + 1] += this.particleVelocities[idx + 1] * delta;
      this.particlePositions[idx + 2] += this.particleVelocities[idx + 2] * delta;

      // Wrap around player space
      if (this.particlePositions[idx + 1] < 0) {
        this.particlePositions[idx + 1] = 22 + Math.random() * 5;
        this.particlePositions[idx] = this.posX + (Math.random() - 0.5) * 60;
        this.particlePositions[idx + 2] = this.posZ + (Math.random() - 0.5) * 50;
      }
    }

    this.weatherParticles.geometry.attributes.position.needsUpdate = true;
  }

  private updateClickMarker(now: number) {
    if (!this.clickMarker) return;
    const age = (now - this.clickMarker.createdAt) * 0.001;
    const scale = 1.0 + Math.sin(age * 8) * 0.2;
    this.clickMarker.mesh.scale.set(scale, 1, scale);
  }

  /**
   * Check distance to POIs and toggle interaction prompt banner
   */
  private checkPOIProximity() {
    try {
      let closestPOI: POIDefinition | null = null;
      let minDist = Infinity;

      for (const poi of pois) {
        const poiX = poi.x * ValentineCity.SCALE;
        const poiZ = poi.y * ValentineCity.SCALE;
        const d = Math.hypot(this.posX - poiX, this.posZ - poiZ);
        const effectiveRadius = Math.max(poi.radius * ValentineCity.SCALE, 7.5);

        if (d < effectiveRadius && d < minDist) {
          minDist = d;
          closestPOI = poi;
        }
      }

      if (closestPOI !== this.currentNearbyPOI) {
        this.currentNearbyPOI = closestPOI;
        rpgMenuManager.showPOIPrompt(closestPOI);
      }
    } catch (err) {
      console.error('[ThreeWorld] Error in checkPOIProximity:', err);
    }
  }

  /**
   * Send continuous position intent to server
   */
  private sendNetworkPosition(vx: number, vy: number) {
    if (!this.room) return;

    const payload: MoveIntentMessage = {
      x: Math.round(this.posX / ValentineCity.SCALE),
      y: Math.round(this.posZ / ValentineCity.SCALE),
      vx,
      vy,
      heading: this.heading,
      isMoving: this.isMoving,
      isSprinting: this.isSprinting,
      clientTimestamp: Date.now()
    };

    this.room.send(RoomMessage.MOVE, payload);
  }

  /**
   * Render real-time RDO Squircle Minimap with zoom, rotation and overlays
   */
  private renderMinimap() {
    if (!this.minimapSystem) return;
    this.minimapSystem.render(
      this.posX,
      this.posZ,
      this.heading,
      this.cameraZoomDistance,
      this.remotePlayers
    );
  }
}
