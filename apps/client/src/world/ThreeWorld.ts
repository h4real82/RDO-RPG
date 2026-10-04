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
import { ValentineBuilder } from './ValentineBuilder';
import { CowboyCharacter } from './CowboyCharacter';
import { TextureGenerator } from './TextureGenerator';

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
  private valentineBuilder!: ValentineBuilder;

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
  private posX: number = DEFAULT_SPAWN_X * ValentineBuilder.SCALE;
  private posZ: number = DEFAULT_SPAWN_Y * ValentineBuilder.SCALE;
  private heading: number = Math.PI / 2;
  private isMoving: boolean = false;
  private currentGait: GaitMode = GaitMode.JOG;
  private isSprinting: boolean = false;
  private stamina: number = 100;
  private maxStamina: number = 100;

  // Remote Players
  private remotePlayers: Map<string, CowboyCharacter> = new Map();

  // Navigation
  private raycaster: THREE.Raycaster = new THREE.Raycaster();
  private mousePos: THREE.Vector2 = new THREE.Vector2();
  private clickMarker: ClickTargetMarker | null = null;
  private clickNavDestination: THREE.Vector3 | null = null;

  // Inputs
  private keysPressed: Set<string> = new Set();
  private lastNetworkTick: number = 0;
  private clock: THREE.Clock = new THREE.Clock();

  // Minimap Radar
  private minimapCanvas: HTMLCanvasElement | null = null;
  private minimapCtx: CanvasRenderingContext2D | null = null;

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
      this.posX = destX * ValentineBuilder.SCALE;
      this.posZ = destY * ValentineBuilder.SCALE;
      this.localPlayer.setPosition(this.posX, 0, this.posZ);
      this.clickNavDestination = null;
      if (this.clickMarker) {
        this.scene.remove(this.clickMarker.mesh);
        this.clickMarker = null;
      }
      this.sendNetworkPosition(0, 0);
    });

    // Start 60 FPS Render Loop
    this.animate();
  }

  private initThree() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0c0907);

    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;

    // Tactical RPG Perspective Camera (Phoenix Point / Wasteland 3 style)
    this.camera = new THREE.PerspectiveCamera(38, width / height, 0.5, 350);
    this.updateCameraPosition(true);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      stencil: false
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    // Clear any existing children in game container and append Three canvas
    this.container.innerHTML = '';
    this.container.appendChild(this.renderer.domElement);

    window.addEventListener('resize', () => {
      const w = this.container.clientWidth || window.innerWidth;
      const h = this.container.clientHeight || window.innerHeight;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
    });

    // Build Valentine 3D World
    this.valentineBuilder = new ValentineBuilder(this.scene);
    this.valentineBuilder.buildValentineWorld();
  }

  private initEnvironment() {
    // 1. Hemisphere Light for soft atmospheric sky/ground fill
    this.hemiLight = new THREE.HemisphereLight(0x78a7d8, 0x44301c, 0.85);
    this.scene.add(this.hemiLight);

    // 2. Base Ambient Light (ensures night remains readable)
    this.ambientLight = new THREE.AmbientLight(0x221a14, 0.35);
    this.scene.add(this.ambientLight);

    // 3. Directional Sun/Moon with Shadow Map
    this.sunLight = new THREE.DirectionalLight(0xffeedd, 2.0);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.near = 0.5;
    this.sunLight.shadow.camera.far = 180;
    this.sunLight.shadow.bias = -0.0004;

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
    this.localPlayer.setPosition(this.posX, 0, this.posZ);
    this.scene.add(this.localPlayer.root);
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
      if (this.valentineBuilder.groundMesh) {
        (this.valentineBuilder.groundMesh.material as THREE.MeshStandardMaterial).roughness = 0.85;
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
      if (this.valentineBuilder.groundMesh) {
        (this.valentineBuilder.groundMesh.material as THREE.MeshStandardMaterial).roughness = 0.25;
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
      if (rpgMenuManager.isMenuOpen()) return;

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
    });

    window.addEventListener('keyup', (e) => {
      this.keysPressed.delete(e.code);
    });

    // Point-and-Click on 3D Ground
    this.renderer.domElement.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 || rpgMenuManager.isMenuOpen()) return;

      const rect = this.renderer.domElement.getBoundingClientRect();
      this.mousePos.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.mousePos.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      this.raycaster.setFromCamera(this.mousePos, this.camera);
      const intersects = this.raycaster.intersectObject(this.valentineBuilder.groundMesh, false);

      if (intersects.length > 0) {
        const hit = intersects[0].point;
        this.setClickTarget(hit.x, hit.z);
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
        // Initial spawn pos from server
        this.posX = player.position.x * ValentineBuilder.SCALE;
        this.posZ = player.position.y * ValentineBuilder.SCALE;
        this.localPlayer.setPosition(this.posX, 0, this.posZ);
        return;
      }

      console.log(`[ThreeWorld] Remote player joined: ${sessionId} (${player.username})`);
      const remoteCowboy = new CowboyCharacter(player.username, false);
      remoteCowboy.setPosition(player.position.x * ValentineBuilder.SCALE, 0, player.position.y * ValentineBuilder.SCALE);
      this.remotePlayers.set(sessionId, remoteCowboy);
      this.scene.add(remoteCowboy.root);

      player.position.onChange(() => {
        const targetX = player.position.x * ValentineBuilder.SCALE;
        const targetZ = player.position.y * ValentineBuilder.SCALE;
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
    this.minimapCanvas = document.getElementById('rdr-minimap-canvas') as HTMLCanvasElement;
    if (this.minimapCanvas) {
      this.minimapCanvas.width = 150;
      this.minimapCanvas.height = 150;
      this.minimapCtx = this.minimapCanvas.getContext('2d');
    }
  }

  /**
   * Main 60 FPS update and render cycle
   */
  private animate = () => {
    requestAnimationFrame(this.animate);

    const delta = Math.min(this.clock.getDelta(), 0.1);
    const now = performance.now();

    this.updatePlayerMovement(delta);
    this.updateCameraPosition(false);
    this.updateWeatherParticles(delta);
    this.valentineBuilder.update(now * 0.001);
    this.updateClickMarker(now);
    this.checkPOIProximity();
    this.renderMinimap();

    // 20Hz server position sync
    if (now - this.lastNetworkTick >= 50) {
      this.lastNetworkTick = now;
      this.sendNetworkPosition(0, 0);
    }

    this.renderer.render(this.scene, this.camera);
  };

  /**
   * Continuous movement calculation with 3D obstacle bounding-box sliding
   */
  private updatePlayerMovement(delta: number) {
    if (rpgMenuManager.isMenuOpen()) {
      this.isMoving = false;
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

    let speed = (PLAYER_JOG_SPEED * ValentineBuilder.SCALE);
    let activeGait = GaitMode.JOG;

    if (this.isSprinting) {
      speed = (PLAYER_SPRINT_SPEED * ValentineBuilder.SCALE);
      activeGait = GaitMode.SPRINT;
    } else if (this.currentGait === GaitMode.WALK) {
      speed = (PLAYER_WALK_SPEED * ValentineBuilder.SCALE);
      activeGait = GaitMode.WALK;
    }

    let inputX = 0;
    let inputZ = 0;

    // 1. Keyboard Input
    if (this.keysPressed.has('KeyW') || this.keysPressed.has('ArrowUp')) inputZ -= 1;
    if (this.keysPressed.has('KeyS') || this.keysPressed.has('ArrowDown')) inputZ += 1;
    if (this.keysPressed.has('KeyA') || this.keysPressed.has('ArrowLeft')) inputX -= 1;
    if (this.keysPressed.has('KeyD') || this.keysPressed.has('ArrowRight')) inputX += 1;

    // 2. Point-and-Click Input
    if (this.clickNavDestination && inputX === 0 && inputZ === 0) {
      const dx = this.clickNavDestination.x - this.posX;
      const dz = this.clickNavDestination.z - this.posZ;
      const dist = Math.hypot(dx, dz);

      if (dist > 0.4) {
        inputX = dx / dist;
        inputZ = dz / dist;
      } else {
        this.clearClickNav();
      }
    }

    if (inputX !== 0 || inputZ !== 0) {
      const len = Math.hypot(inputX, inputZ);
      const normX = (inputX / len) * speed * delta;
      const normZ = (inputZ / len) * speed * delta;

      // Smooth Heading
      this.heading = Math.atan2(inputX, inputZ);
      this.localPlayer.setHeading(this.heading, delta);

      // Perform 3D collision check with wall sliding
      const charRadius = 0.65; // ~6.5px in 3D meters

      // Try moving on both axes
      const nextX = this.posX + normX;
      const nextZ = this.posZ + normZ;

      const collidesBoth = this.checkCollision(nextX, nextZ, charRadius);

      if (!collidesBoth) {
        this.posX = nextX;
        this.posZ = nextZ;
      } else {
        // Slide on X alone
        if (!this.checkCollision(nextX, this.posZ, charRadius)) {
          this.posX = nextX;
        }
        // Slide on Z alone
        else if (!this.checkCollision(this.posX, nextZ, charRadius)) {
          this.posZ = nextZ;
        }
      }

      // Restrict to world boundaries
      const maxW = WORLD_MAP_WIDTH * ValentineBuilder.SCALE;
      const maxH = WORLD_MAP_HEIGHT * ValentineBuilder.SCALE;
      this.posX = Math.max(charRadius, Math.min(maxW - charRadius, this.posX));
      this.posZ = Math.max(charRadius, Math.min(maxH - charRadius, this.posZ));

      this.isMoving = true;
    } else {
      this.isMoving = false;
    }

    this.localPlayer.setPosition(this.posX, 0, this.posZ);
    this.localPlayer.update(delta, this.isMoving, activeGait, speed / (PLAYER_JOG_SPEED * ValentineBuilder.SCALE));
  }

  /**
   * Checks if player position intersects any 3D obstacle bounding box
   */
  private checkCollision(x: number, z: number, radius: number): boolean {
    const playerBox = new THREE.Box3(
      new THREE.Vector3(x - radius, 0, z - radius),
      new THREE.Vector3(x + radius, 2.0, z + radius)
    );

    for (const obs of this.valentineBuilder.obstacleBoxes) {
      if (playerBox.intersectsBox(obs)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Smoothly lerps tactical RPG isometric camera following player
   */
  private updateCameraPosition(immediate: boolean = false) {
    // Tactical isometric camera offset (Framing Main Street from South-West looking down the street)
    const targetLookAt = new THREE.Vector3(this.posX, 1.4, this.posZ);
    const cameraOffset = new THREE.Vector3(-10.0, 16.0, 13.0);

    const desiredCamPos = new THREE.Vector3().addVectors(targetLookAt, cameraOffset);

    if (immediate) {
      this.cameraTarget.copy(targetLookAt);
      this.camera.position.copy(desiredCamPos);
      this.camera.lookAt(this.cameraTarget);
    } else {
      this.cameraTarget.lerp(targetLookAt, 0.1);
      this.camera.position.lerp(desiredCamPos, 0.1);
      this.camera.lookAt(this.cameraTarget);
    }

    // Keep directional sunlight centered around player for sharp shadow map resolution
    if (this.sunLight) {
      this.sunLight.target.position.set(this.posX, 0, this.posZ);
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
    let closestPOI: POIDefinition | null = null;
    let minDist = Infinity;

    for (const poi of pois) {
      const poiX = poi.x * ValentineBuilder.SCALE;
      const poiZ = poi.y * ValentineBuilder.SCALE;
      const d = Math.hypot(this.posX - poiX, this.posZ - poiZ);

      if (d < (poi.radius * ValentineBuilder.SCALE) && d < minDist) {
        minDist = d;
        closestPOI = poi;
      }
    }

    if (closestPOI !== this.currentNearbyPOI) {
      this.currentNearbyPOI = closestPOI;
      rpgMenuManager.showPOIPrompt(closestPOI);
    }
  }

  /**
   * Send continuous position intent to server
   */
  private sendNetworkPosition(vx: number, vy: number) {
    if (!this.room) return;

    const payload: MoveIntentMessage = {
      x: Math.round(this.posX / ValentineBuilder.SCALE),
      y: Math.round(this.posZ / ValentineBuilder.SCALE),
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
   * Render real-time Circular RDR Radar Minimap
   */
  private renderMinimap() {
    if (!this.minimapCtx || !this.minimapCanvas) return;
    const ctx = this.minimapCtx;
    const w = this.minimapCanvas.width;
    const h = this.minimapCanvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const r = 68;

    ctx.clearRect(0, 0, w, h);

    // Dark parchment radar disc
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.clip();

    ctx.fillStyle = '#18120c';
    ctx.fillRect(0, 0, w, h);

    // Grid rings
    ctx.strokeStyle = 'rgba(168, 140, 93, 0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.5, 0, Math.PI * 2);
    ctx.stroke();

    // Map bounds representation
    const scale = 0.6; // zoom level
    const playerWorldX = this.posX;
    const playerWorldZ = this.posZ;

    // Draw POIs
    pois.forEach((poi) => {
      const px = poi.x * ValentineBuilder.SCALE;
      const pz = poi.y * ValentineBuilder.SCALE;
      const screenX = cx + (px - playerWorldX) * scale;
      const screenY = cy + (pz - playerWorldZ) * scale;

      ctx.fillStyle = '#d4af37';
      ctx.beginPath();
      ctx.arc(screenX, screenY, 3.5, 0, Math.PI * 2);
      ctx.fill();
    });

    // Draw other players
    this.remotePlayers.forEach((cowboy) => {
      const rx = cowboy.root.position.x;
      const rz = cowboy.root.position.z;
      const screenX = cx + (rx - playerWorldX) * scale;
      const screenY = cy + (rz - playerWorldZ) * scale;

      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(screenX, screenY, 3, 0, Math.PI * 2);
      ctx.fill();
    });

    // Draw local player arrow at center
    ctx.fillStyle = '#f1ede4';
    ctx.beginPath();
    ctx.arc(cx, cy, 4, 0, Math.PI * 2);
    ctx.fill();

    // View heading cone
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.sin(this.heading) * 12, cy + Math.cos(this.heading) * 12);
    ctx.stroke();

    ctx.restore();
  }
}
