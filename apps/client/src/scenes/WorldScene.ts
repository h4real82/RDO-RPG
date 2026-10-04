import Phaser from 'phaser';
import { Room, Client } from 'colyseus.js';
import {
  WorldState,
  Player,
  Direction,
  RoomMessage,
  MoveIntentMessage,
  TILE_SIZE,
  TICK_INTERVAL_MS,
  PLAYER_WALK_SPEED,
  PLAYER_JOG_SPEED,
  PLAYER_SPRINT_SPEED,
  PLAYER_COLLISION_RADIUS,
  PLAYER_FEET_OFFSET_Y,
  WORLD_MAP_WIDTH,
  WORLD_MAP_HEIGHT,
  GaitMode,
  POIDefinition,
  TimeOfDay,
  WeatherState
} from '@rdo-rpg/shared';
import { getMapById, pois } from '@rdo-rpg/content';
import { UserProfile } from '../discord';
import { rpgMenuManager } from '../menu';

interface NavTarget {
  x: number;
  y: number;
  marker: Phaser.GameObjects.Container;
}

interface DirectionalLightPreset {
  shadowDx: number;
  shadowDy: number;
  buildingShadowLen: number;
  charShadowLen: number;
  shadowAlpha: number;
  ambientColor: number;
  ambientAlpha: number;
  charTint: number;
  specularColor: number;
  specularAlpha: number;
}

interface BuildingShadowBox {
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  heightFactor: number;
}

interface WaterTrough {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface WaterPuddle {
  x: number;
  y: number;
  rx: number;
  ry: number;
  phase: number;
}

interface WeatherParticle {
  type: 'dust' | 'sand' | 'rain' | 'ember';
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  baseAlpha: number;
  color: number;
  phase: number;
}

interface POIVisual {
  poi: POIDefinition;
  container: Phaser.GameObjects.Container;
  outerRing: Phaser.GameObjects.Arc;
  innerDot: Phaser.GameObjects.Arc;
  iconText: Phaser.GameObjects.Text;
  labelBg: Phaser.GameObjects.Rectangle;
  labelText: Phaser.GameObjects.Text;
  keyBadge: Phaser.GameObjects.Container;
  isNear: boolean;
}

export class WorldScene extends Phaser.Scene {
  private client!: Client;
  private room!: Room<WorldState>;
  private profile!: UserProfile;

  // Local Player Continuous Physics State
  private localX: number = 720;
  private localY: number = 464;
  private localVx: number = 0;
  private localVy: number = 0;
  private localHeading: number = Math.PI / 2;
  private isMoving: boolean = false;

  // Gait & Stamina System
  private currentGait: GaitMode = GaitMode.JOG;
  private isSprinting: boolean = false;
  private stamina: number = 100;
  private maxStamina: number = 100;
  private gaitTimer: number = 0;

  // Point-and-Click Navigation
  private navTarget: NavTarget | null = null;

  // POI & Travel Interaction Zones
  private poiVisuals: POIVisual[] = [];
  private currentNearbyPOI: POIDefinition | null = null;

  // Visual Entities & Directional Cast Shadows
  private playerContainers: Map<string, Phaser.GameObjects.Container> = new Map();
  private playerSprites: Map<string, Phaser.GameObjects.Image> = new Map();
  private playerShadowGraphics: Map<string, Phaser.GameObjects.Graphics> = new Map();

  // Physical Directional Lighting (Sun / Moon) & Weather States
  private currentTimeOfDay: TimeOfDay = TimeOfDay.GOLDEN_HOUR;
  private currentWeather: WeatherState = WeatherState.CLEAR;
  private directionalShadowsGraphics!: Phaser.GameObjects.Graphics;
  private specularHighlightsGraphics!: Phaser.GameObjects.Graphics;
  private ambientOverlay!: Phaser.GameObjects.Rectangle;
  private weatherOverlay!: Phaser.GameObjects.Rectangle;

  // Animated Water Simulation (Troughs & Mud Puddles)
  private waterGraphics!: Phaser.GameObjects.Graphics;
  private waterTroughs: WaterTrough[] = [];
  private waterPuddles: WaterPuddle[] = [];

  // Weather & Atmosphere Particles
  private particles: WeatherParticle[] = [];
  private particleGraphics!: Phaser.GameObjects.Graphics;

  // Directional Lighting Presets for Time of Day
  private readonly lightingPresets: Record<TimeOfDay, DirectionalLightPreset> = {
    [TimeOfDay.NOON]: {
      shadowDx: -0.4,
      shadowDy: 0.7,
      buildingShadowLen: 22,
      charShadowLen: 28,
      shadowAlpha: 0.65,
      ambientColor: 0xfffcf2,
      ambientAlpha: 0.04, // Crisp, clean high contrast
      charTint: 0xffffff,
      specularColor: 0xffffff,
      specularAlpha: 0.80
    },
    [TimeOfDay.GOLDEN_HOUR]: {
      shadowDx: -0.85,
      shadowDy: 0.48,
      buildingShadowLen: 46,
      charShadowLen: 54,
      shadowAlpha: 0.68,
      ambientColor: 0xc8752d, // Deep warm amber sunset (MULTIPLY)
      ambientAlpha: 0.28,
      charTint: 0xffedd5,
      specularColor: 0xfef08a,
      specularAlpha: 0.90
    },
    [TimeOfDay.NIGHT]: {
      shadowDx: -0.5,
      shadowDy: 0.65,
      buildingShadowLen: 28,
      charShadowLen: 34,
      shadowAlpha: 0.50,
      ambientColor: 0x18243b, // Cool deep blue moonlight (MULTIPLY)
      ambientAlpha: 0.60,
      charTint: 0x94a3b8,
      specularColor: 0x93c5fd,
      specularAlpha: 0.45
    }
  };

  // Building Footprints for Directional Cast Shadows
  private readonly buildingShadowBoxes: BuildingShadowBox[] = [
    // North structures
    { name: 'Top Cabin', x: 130, y: 96, w: 140, h: 124, heightFactor: 1.0 },
    { name: 'Livery Stable', x: 512, y: 64, w: 224, h: 152, heightFactor: 1.4 },
    { name: 'Auction Corral', x: 420, y: 110, w: 92, h: 116, heightFactor: 0.35 },
    { name: 'North Shack', x: 832, y: 96, w: 112, h: 112, heightFactor: 0.9 },
    { name: 'Blacksmith Workshop', x: 1072, y: 80, w: 160, h: 140, heightFactor: 1.2 },

    // Main Street North row
    { name: 'Saloon', x: 288, y: 272, w: 192, h: 148, heightFactor: 1.4 },
    { name: 'General Store', x: 544, y: 304, w: 128, h: 114, heightFactor: 1.2 },
    { name: 'Sheriff Office', x: 720, y: 304, w: 112, h: 114, heightFactor: 1.1 },
    { name: 'Valentine Bank', x: 880, y: 304, w: 128, h: 114, heightFactor: 1.2 },
    { name: 'Barber Shop', x: 1056, y: 336, w: 64, h: 84, heightFactor: 0.9 },
    { name: 'Gunsmith', x: 1200, y: 336, w: 128, h: 86, heightFactor: 1.0 },

    // South Buildings row
    { name: 'South House 1', x: 128, y: 564, w: 144, h: 108, heightFactor: 1.0 },
    { name: 'South House 2', x: 352, y: 564, w: 144, h: 108, heightFactor: 1.1 },
    { name: 'South House 3', x: 576, y: 564, w: 128, h: 108, heightFactor: 1.0 },
    { name: 'South House 4', x: 768, y: 564, w: 128, h: 108, heightFactor: 1.0 },
    { name: 'South House 5', x: 944, y: 564, w: 112, h: 108, heightFactor: 1.0 },
    { name: 'South House 6', x: 1104, y: 564, w: 112, h: 108, heightFactor: 1.0 },
    { name: 'South House 7', x: 1264, y: 564, w: 80, h: 108, heightFactor: 1.0 },

    // Verandas and boardwalk edges
    { name: 'Saloon Porch Railing', x: 284, y: 418, w: 200, h: 4, heightFactor: 0.3 },
    { name: 'Store Porch Railing', x: 540, y: 416, w: 136, h: 4, heightFactor: 0.3 },
    { name: 'Sheriff Porch Railing', x: 716, y: 416, w: 120, h: 4, heightFactor: 0.3 },
    { name: 'Bank Porch Railing', x: 876, y: 416, w: 136, h: 4, heightFactor: 0.3 }
  ];

  // Inputs
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasdKeys!: {
    up: Phaser.Input.Keyboard.Key;
    down: Phaser.Input.Keyboard.Key;
    left: Phaser.Input.Keyboard.Key;
    right: Phaser.Input.Keyboard.Key;
    shift: Phaser.Input.Keyboard.Key;
    gKey: Phaser.Input.Keyboard.Key;
    capsLock: Phaser.Input.Keyboard.Key;
    cKey: Phaser.Input.Keyboard.Key;
    tabKey: Phaser.Input.Keyboard.Key;
    eKey: Phaser.Input.Keyboard.Key;
    kKey: Phaser.Input.Keyboard.Key;
    lKey: Phaser.Input.Keyboard.Key;
  };

  private lastMoveSent: number = 0;
  private collisionGraphics!: Phaser.GameObjects.Graphics;
  private showCollisionGrid: boolean = false;

  // Minimap radar elements
  private minimapCanvas: HTMLCanvasElement | null = null;
  private minimapCtx: CanvasRenderingContext2D | null = null;
  private mapImageSource: HTMLImageElement | null = null;

  constructor() {
    super({ key: 'WorldScene' });
  }

  init(data: { client: Client; room: Room<WorldState>; profile: UserProfile }) {
    this.client = data.client;
    this.room = data.room;
    this.profile = data.profile;
  }

  preload() {
    this.load.image('western_map', '/assets/western_map.jpg');
    this.load.image('cowboy', '/assets/cowboy.png');
  }

  create() {
    // 1. HD Background Map (1376x768)
    const map = this.add.image(0, 0, 'western_map').setOrigin(0, 0);
    map.setDisplaySize(WORLD_MAP_WIDTH, WORLD_MAP_HEIGHT);

    // 2. Physical Directional Building Shadows (Depth: 2)
    this.directionalShadowsGraphics = this.add.graphics();
    this.directionalShadowsGraphics.setDepth(2);

    // 3. Animated Water Simulation (Troughs & Puddles) (Depth: 3)
    this.setupWaterEffects();

    // 4. Specular Highlights on Wood Railings & Roof Ridges (Depth: 4)
    this.specularHighlightsGraphics = this.add.graphics();
    this.specularHighlightsGraphics.setDepth(4);

    // 5. Ambient Lighting Overlay (Depth: 900)
    this.ambientOverlay = this.add.rectangle(0, 0, WORLD_MAP_WIDTH, WORLD_MAP_HEIGHT, 0xc8752d, 0.28);
    this.ambientOverlay.setOrigin(0, 0);
    this.ambientOverlay.setBlendMode(Phaser.BlendModes.MULTIPLY);
    this.ambientOverlay.setDepth(900);

    // 6. Weather Atmosphere Overlay (Depth: 910)
    this.weatherOverlay = this.add.rectangle(0, 0, WORLD_MAP_WIDTH, WORLD_MAP_HEIGHT, 0x000000, 0);
    this.weatherOverlay.setOrigin(0, 0);
    this.weatherOverlay.setBlendMode(Phaser.BlendModes.MULTIPLY);
    this.weatherOverlay.setDepth(910);

    // 7. Atmospheric Weather Particles (Rain / Dust / Wind) (Depth: 1500)
    this.setupWeatherParticles();

    // 8. Collision Debug Layer (Default: INVISIBLE, toggle with 'C')
    this.collisionGraphics = this.add.graphics();
    this.collisionGraphics.setVisible(false);
    this.collisionGraphics.setDepth(2000);
    this.renderCollisionGrid('world_map_01');

    // 9. Keyboard Inputs (WASD, Gait, Interact, Weather [K], Time [L])
    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
      this.wasdKeys = {
        up: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
        down: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
        left: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
        right: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
        shift: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT),
        gKey: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.G),
        capsLock: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.CAPS_LOCK),
        cKey: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.C),
        tabKey: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.TAB),
        eKey: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E),
        kKey: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.K),
        lKey: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.L)
      };

      // Toggle collision grid with 'C'
      this.wasdKeys.cKey.on('down', () => {
        this.showCollisionGrid = !this.showCollisionGrid;
        this.collisionGraphics.setVisible(this.showCollisionGrid);
        const localContainer = this.playerContainers.get(this.room.sessionId);
        const hitboxObj = localContainer?.getByName('debug_hitbox') as Phaser.GameObjects.Arc;
        if (hitboxObj) hitboxObj.setVisible(this.showCollisionGrid);
      });

      // Toggle gait mode between WALK and JOG with 'G' or 'CapsLock'
      const toggleGait = () => {
        this.currentGait = this.currentGait === GaitMode.WALK ? GaitMode.JOG : GaitMode.WALK;
        this.updateGaitHUD();
      };
      this.wasdKeys.gKey.on('down', toggleGait);
      this.wasdKeys.capsLock.on('down', toggleGait);

      // Cycle weather with 'K'
      this.wasdKeys.kKey.on('down', () => {
        this.cycleWeather();
      });

      // Cycle time of day with 'L'
      this.wasdKeys.lKey.on('down', () => {
        this.cycleTimeOfDay();
      });

      // Interact with closest POI with 'E'
      this.wasdKeys.eKey.on('down', () => {
        if (this.currentNearbyPOI && !rpgMenuManager.isMenuOpen()) {
          rpgMenuManager.openPOIModal(this.currentNearbyPOI);
        }
      });
    }

    // 10. Initial lighting & directional shadows
    this.renderDirectionalBuildingShadows();
    this.applyLightingAndWeatherPreset();

    // 8. RDO Map POIs & Interaction Zones (Saloon, Sheriff, General Store, Stable, Fast-Travel)
    this.setupPOIs();

    // 9. Fast-Travel Stagecoach Callback
    rpgMenuManager.setOnTravel((destX: number, destY: number) => {
      this.localX = destX;
      this.localY = destY;
      this.localVx = 0;
      this.localVy = 0;
      this.clearClickWaypoint();
      const container = this.playerContainers.get(this.room.sessionId);
      if (container) {
        container.setPosition(destX, destY);
        container.setDepth(destY);
      }
      this.room.send(RoomMessage.INTERACT, {
        type: 'travel',
        x: destX,
        y: destY
      });
    });

    // 10. Point-and-Click (Click to Walk)
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      // Don't click to move if menu is open
      if (rpgMenuManager.isMenuOpen()) return;
      if (pointer.button !== 0) return;

      const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
      this.setClickWaypoint(worldPoint.x, worldPoint.y);
    });

    // 11. Camera Setup with Smooth Lerp Follow & Cinematic Deadzone
    this.cameras.main.setBounds(0, 0, WORLD_MAP_WIDTH, WORLD_MAP_HEIGHT);
    this.cameras.main.setZoom(2.2);
    this.cameras.main.setBackgroundColor('#0e0a07');

    // 12. Connect to DOM Minimap Radar
    this.minimapCanvas = document.getElementById('rdr-minimap-canvas') as HTMLCanvasElement;
    if (this.minimapCanvas) {
      this.minimapCtx = this.minimapCanvas.getContext('2d');
    }

    const mapTexture = this.textures.get('western_map').getSourceImage() as HTMLImageElement;
    if (mapTexture) {
      this.mapImageSource = mapTexture;
    }

    // 13. Colyseus State Listeners
    this.setupRoomListeners();
    this.updateGaitHUD();
  }

  private getLightingPreset(): DirectionalLightPreset {
    return this.lightingPresets[this.currentTimeOfDay] || this.lightingPresets[TimeOfDay.GOLDEN_HOUR];
  }

  private getWeatherShadowMultiplier(): number {
    switch (this.currentWeather) {
      case WeatherState.CLEAR:
        return 1.0;
      case WeatherState.DUST_STORM:
        return 0.32; // Diffuse soft ambient light without hard shadows
      case WeatherState.RAIN:
        return 0.60; // Overcast diffuse sky with clear ground shadows
      default:
        return 1.0;
    }
  }

  private getWeatherSpecularMultiplier(): number {
    switch (this.currentWeather) {
      case WeatherState.CLEAR:
        return 1.0;
      case WeatherState.DUST_STORM:
        return 0.25;
      case WeatherState.RAIN:
        return 1.75; // Wet glossy roads, puddles and reflective wood
      default:
        return 1.0;
    }
  }

  public applyLightingAndWeatherPreset() {
    const preset = this.getLightingPreset();

    // 1. Ambient lighting overlay (Time of Day - MULTIPLY for natural grading)
    if (this.ambientOverlay) {
      this.ambientOverlay.setFillStyle(preset.ambientColor, preset.ambientAlpha);
    }

    // 2. Weather atmospheric sky overlay
    if (this.weatherOverlay) {
      if (this.currentWeather === WeatherState.CLEAR) {
        this.weatherOverlay.setFillStyle(0x000000, 0);
      } else if (this.currentWeather === WeatherState.DUST_STORM) {
        this.weatherOverlay.setFillStyle(0x8c6d48, 0.30); // Warm sepia / ochre dust storm
      } else if (this.currentWeather === WeatherState.RAIN) {
        this.weatherOverlay.setFillStyle(0x1e2c3d, 0.42); // Dark slate overcast sky
      }
    }

    // 3. Character tint based on time and weather
    let charTint = preset.charTint;
    if (this.currentWeather === WeatherState.DUST_STORM) {
      charTint = 0xd7c4b0;
    } else if (this.currentWeather === WeatherState.RAIN) {
      charTint = 0x8b9bb4;
    }

    this.playerSprites.forEach((sprite) => {
      sprite.setTint(charTint);
    });

    this.renderDirectionalBuildingShadows();
    this.updateEnvironmentHUD();
  }

  public setTimeOfDay(tod: TimeOfDay, broadcast: boolean = true) {
    if (this.currentTimeOfDay === tod) return;
    this.currentTimeOfDay = tod;
    this.applyLightingAndWeatherPreset();

    if (broadcast && this.room) {
      this.room.send(RoomMessage.SET_TIME_OF_DAY, { timeOfDay: tod });
    }
  }

  public setWeather(weather: WeatherState, broadcast: boolean = true) {
    if (this.currentWeather === weather) return;
    this.currentWeather = weather;
    this.applyLightingAndWeatherPreset();
    this.setupWeatherParticles();

    if (broadcast && this.room) {
      this.room.send(RoomMessage.SET_WEATHER, { weather });
    }
  }

  public cycleTimeOfDay() {
    const order = [TimeOfDay.NOON, TimeOfDay.GOLDEN_HOUR, TimeOfDay.NIGHT];
    const currentIndex = order.indexOf(this.currentTimeOfDay);
    const nextTod = order[(currentIndex + 1) % order.length];
    this.setTimeOfDay(nextTod, true);
  }

  public cycleWeather() {
    const order = [WeatherState.CLEAR, WeatherState.DUST_STORM, WeatherState.RAIN];
    const currentIndex = order.indexOf(this.currentWeather);
    const nextWeather = order[(currentIndex + 1) % order.length];
    this.setWeather(nextWeather, true);
  }

  private updateEnvironmentHUD() {
    const envBadge = document.getElementById('env-badge');
    if (!envBadge) return;

    let timeName = 'GOLDEN HOUR';
    if (this.currentTimeOfDay === TimeOfDay.NOON) timeName = 'MITTAG';
    else if (this.currentTimeOfDay === TimeOfDay.NIGHT) timeName = 'NACHT';

    let weatherName = 'KLAR';
    if (this.currentWeather === WeatherState.DUST_STORM) weatherName = 'STAUBSTURM';
    else if (this.currentWeather === WeatherState.RAIN) weatherName = 'REGEN';

    envBadge.textContent = `${timeName} • ${weatherName}`;

    if (this.currentTimeOfDay === TimeOfDay.NOON) {
      envBadge.style.color = '#fef08a';
      envBadge.style.borderColor = '#ca8a04';
    } else if (this.currentTimeOfDay === TimeOfDay.GOLDEN_HOUR) {
      envBadge.style.color = '#fb923c';
      envBadge.style.borderColor = '#c2410c';
    } else {
      envBadge.style.color = '#93c5fd';
      envBadge.style.borderColor = '#3b82f6';
    }
  }

  /**
   * Renders physical directional building shadows cast ONTO THE GROUND
   * Shadows extend south onto Main Street and west into alleyways without darkening building roofs
   */
  private renderDirectionalBuildingShadows() {
    if (!this.directionalShadowsGraphics) return;

    this.directionalShadowsGraphics.clear();
    const preset = this.getLightingPreset();
    const weatherMult = this.getWeatherShadowMultiplier();
    const baseAlpha = preset.shadowAlpha * weatherMult;

    if (baseAlpha <= 0.02) return;

    // 1. Soft Penumbra (outer blurred falloff pass)
    this.directionalShadowsGraphics.fillStyle(0x000000, baseAlpha * 0.35);
    for (const b of this.buildingShadowBoxes) {
      if (b.heightFactor <= 0.35) {
        // Thin railing or boardwalk front edge shadow cast onto dirt street
        const fenceLen = preset.buildingShadowLen * 0.30;
        const fox = preset.shadowDx * fenceLen;
        const foy = preset.shadowDy * fenceLen;

        this.directionalShadowsGraphics.beginPath();
        this.directionalShadowsGraphics.moveTo(b.x, b.y + b.h);
        this.directionalShadowsGraphics.lineTo(b.x + b.w, b.y + b.h);
        this.directionalShadowsGraphics.lineTo(b.x + b.w + fox, b.y + b.h + foy);
        this.directionalShadowsGraphics.lineTo(b.x + fox, b.y + b.h + foy);
        this.directionalShadowsGraphics.closePath();
        this.directionalShadowsGraphics.fillPath();
      } else {
        const ox = preset.shadowDx * preset.buildingShadowLen * b.heightFactor;
        const oy = preset.shadowDy * preset.buildingShadowLen * b.heightFactor;

        // Ground shadow cast in front of building (South & West ground)
        this.directionalShadowsGraphics.beginPath();
        this.directionalShadowsGraphics.moveTo(b.x, b.y + b.h);
        this.directionalShadowsGraphics.lineTo(b.x + b.w, b.y + b.h);
        this.directionalShadowsGraphics.lineTo(b.x + b.w + ox, b.y + b.h + oy);
        this.directionalShadowsGraphics.lineTo(b.x + ox, b.y + b.h + oy);
        this.directionalShadowsGraphics.closePath();
        this.directionalShadowsGraphics.fillPath();
      }
    }

    // 2. Crisp Umbra (core ground shadow)
    this.directionalShadowsGraphics.fillStyle(0x000000, baseAlpha * 0.65);
    for (const b of this.buildingShadowBoxes) {
      if (b.heightFactor <= 0.35) continue;
      const ox = preset.shadowDx * (preset.buildingShadowLen * 0.75) * b.heightFactor;
      const oy = preset.shadowDy * (preset.buildingShadowLen * 0.75) * b.heightFactor;

      this.directionalShadowsGraphics.beginPath();
      this.directionalShadowsGraphics.moveTo(b.x + 3, b.y + b.h);
      this.directionalShadowsGraphics.lineTo(b.x + b.w - 3, b.y + b.h);
      this.directionalShadowsGraphics.lineTo(b.x + b.w - 3 + ox, b.y + b.h + oy);
      this.directionalShadowsGraphics.lineTo(b.x + 3 + ox, b.y + b.h + oy);
      this.directionalShadowsGraphics.closePath();
      this.directionalShadowsGraphics.fillPath();
    }
  }

  /**
   * Updates directional cast shadows for all characters matching sun/moon angle & stride
   */
  private updateCharacterShadows() {
    const preset = this.getLightingPreset();
    const weatherMult = this.getWeatherShadowMultiplier();
    const baseAlpha = preset.shadowAlpha * weatherMult;

    this.playerShadowGraphics.forEach((gfx, sessionId) => {
      gfx.clear();
      if (baseAlpha <= 0.02) return;

      const isLocal = sessionId === this.room.sessionId;
      let isMoving = false;
      let isSprinting = false;
      let stridePhase = 0;

      if (isLocal) {
        isMoving = this.isMoving;
        isSprinting = this.isSprinting;
        stridePhase = this.gaitTimer * 2;
      } else {
        const player = this.room.state.players.get(sessionId);
        if (player) {
          isMoving = player.position.isMoving;
          isSprinting = player.position.isSprinting;
          stridePhase = (this.time.now / 150) * (isSprinting ? 2.2 : 1.4);
        }
      }

      const stretch = isMoving ? 1 + Math.sin(stridePhase) * (isSprinting ? 0.22 : 0.12) : 1;
      const charLen = preset.charShadowLen * stretch;

      const headX = preset.shadowDx * charLen;
      const headY = 26 + preset.shadowDy * charLen;

      const torsoX = headX * 0.58;
      const torsoY = 26 + (headY - 26) * 0.58;

      // 1. Soft Penumbra (outer falloff)
      gfx.fillStyle(0x000000, baseAlpha * 0.28);
      gfx.fillEllipse(0, 26, 24, 10); // Boots ground contact
      gfx.fillEllipse(headX, headY, 24, 13); // Slouch hat silhouette outer

      // 2. Umbra (core directional character shadow)
      gfx.fillStyle(0x000000, baseAlpha * 0.72);
      gfx.fillEllipse(0, 26, 18, 7);

      // Slanted outlaw body polygon connecting boots to head
      gfx.beginPath();
      gfx.moveTo(-7, 26);
      gfx.lineTo(torsoX - 7, torsoY);
      gfx.lineTo(headX - 6, headY);
      gfx.lineTo(headX + 6, headY);
      gfx.lineTo(torsoX + 7, torsoY);
      gfx.lineTo(7, 26);
      gfx.closePath();
      gfx.fillPath();

      // Slouch hat silhouette (distinctive Western wide brim)
      gfx.fillEllipse(headX, headY, 22, 11);
      gfx.fillCircle(headX + preset.shadowDx * 3, headY + preset.shadowDy * 3, 5); // Hat crown
    });
  }

  /**
   * Subtle specular highlights on wood hitching posts, trough rims, and wet roads
   */
  private updateSpecularHighlights(time: number) {
    if (!this.specularHighlightsGraphics) return;

    this.specularHighlightsGraphics.clear();
    const preset = this.getLightingPreset();
    const weatherMult = this.getWeatherSpecularMultiplier();
    const baseAlpha = preset.specularAlpha * weatherMult;

    if (baseAlpha <= 0.02) return;

    const shimmer = Math.sin(time * 0.0025) * 0.15 + 0.85;
    const finalAlpha = Math.min(1.0, baseAlpha * shimmer);

    // 1. Water trough metal rim specular glints
    const troughRims = [
      { x: 326, y: 226, w: 48 },
      { x: 472, y: 228, w: 44 },
      { x: 36, y: 536, w: 44 }
    ];
    this.specularHighlightsGraphics.lineStyle(1.5, preset.specularColor, finalAlpha * 0.85);
    for (const t of troughRims) {
      this.specularHighlightsGraphics.beginPath();
      this.specularHighlightsGraphics.moveTo(t.x + 3, t.y + 1);
      this.specularHighlightsGraphics.lineTo(t.x + t.w - 3, t.y + 1);
      this.specularHighlightsGraphics.stroke();
    }

    // 2. Wooden hitching post top rail specular accents
    const hitchingPosts = [
      { x: 342, y: 434, w: 32 },
      { x: 576, y: 434, w: 32 },
      { x: 754, y: 434, w: 32 }
    ];
    this.specularHighlightsGraphics.lineStyle(1.2, preset.specularColor, finalAlpha * 0.65);
    for (const h of hitchingPosts) {
      this.specularHighlightsGraphics.beginPath();
      this.specularHighlightsGraphics.moveTo(h.x, h.y);
      this.specularHighlightsGraphics.lineTo(h.x + h.w, h.y);
      this.specularHighlightsGraphics.stroke();
    }

    // 3. Wet Mud Road Specular Sheen (Active in RAIN - subtle glistening ovals on mud, NO straight lines)
    if (this.currentWeather === WeatherState.RAIN) {
      const wetRoadSpots = [
        { x: 360, y: 480, rx: 35, ry: 9, phase: 0 },
        { x: 520, y: 495, rx: 42, ry: 10, phase: 1.2 },
        { x: 730, y: 485, rx: 38, ry: 9, phase: 2.5 },
        { x: 920, y: 490, rx: 45, ry: 11, phase: 3.8 },
        { x: 1120, y: 495, rx: 40, ry: 10, phase: 5.1 }
      ];

      for (const spot of wetRoadSpots) {
        const spotShimmer = Math.sin(time * 0.003 + spot.phase) * 0.2 + 0.8;
        this.specularHighlightsGraphics.fillStyle(0x93c5fd, finalAlpha * 0.18 * spotShimmer);
        this.specularHighlightsGraphics.fillEllipse(spot.x, spot.y, spot.rx * 2, spot.ry * 2);

        // Core bright glint
        this.specularHighlightsGraphics.fillStyle(0xffffff, finalAlpha * 0.35 * spotShimmer);
        this.specularHighlightsGraphics.fillEllipse(spot.x, spot.y, spot.rx * 0.6, spot.ry * 0.6);
      }
    }
  }

  /**
   * Sets up animated water troughs and mud puddles
   */
  private setupWaterEffects() {
    this.waterGraphics = this.add.graphics();
    this.waterGraphics.setDepth(3);

    this.waterTroughs = [
      { x: 326, y: 226, width: 48, height: 18 },
      { x: 472, y: 228, width: 44, height: 18 },
      { x: 36, y: 536, width: 44, height: 18 }
    ];

    this.waterPuddles = [
      { x: 358, y: 462, rx: 30, ry: 12, phase: 0 },
      { x: 692, y: 466, rx: 34, ry: 13, phase: 1.8 },
      { x: 985, y: 470, rx: 28, ry: 11, phase: 3.4 },
      { x: 486, y: 196, rx: 22, ry: 9, phase: 2.1 },
      { x: 175, y: 485, rx: 26, ry: 10, phase: 4.7 }
    ];
  }

  /**
   * Renders dynamic water shimmer, sine caustics & directional specular highlights
   */
  private updateWaterEffects(time: number) {
    this.waterGraphics.clear();
    const preset = this.getLightingPreset();
    const weatherSpecMult = this.getWeatherSpecularMultiplier();

    // 1. Water Troughs
    this.waterTroughs.forEach((t) => {
      // Dark murky trough water base
      this.waterGraphics.fillStyle(0x0f272a, 0.75);
      this.waterGraphics.fillRoundedRect(t.x + 2, t.y + 2, t.width - 4, t.height - 4, 3);

      // Animated sine wave caustics
      for (let i = 0; i < 3; i++) {
        const wavePhase = time * 0.0022 + i * 1.7;
        const waveY = t.y + 4 + ((Math.sin(wavePhase) + 1) / 2) * (t.height - 8);
        const waveAlpha = 0.22 + Math.sin(wavePhase * 1.4) * 0.12;
        this.waterGraphics.lineStyle(1.2, 0x67e8f9, waveAlpha);
        this.waterGraphics.beginPath();
        this.waterGraphics.moveTo(t.x + 4, waveY);
        this.waterGraphics.lineTo(t.x + t.width / 2, waveY + Math.sin(time * 0.0035 + i) * 1.5);
        this.waterGraphics.lineTo(t.x + t.width - 4, waveY);
        this.waterGraphics.stroke();
      }

      // Specular glint on trough water angled opposite to sun shadow
      const glintX = t.x + t.width * (0.5 - preset.shadowDx * 0.25);
      const glintY = t.y + t.height * (0.45 - preset.shadowDy * 0.15);
      const flicker = (Math.sin(time * 0.004 + t.x) * 0.2 + 0.8) * weatherSpecMult;

      this.waterGraphics.fillStyle(preset.specularColor, Math.min(1, 0.65 * flicker));
      this.waterGraphics.fillCircle(glintX, glintY, 2.0);
      this.waterGraphics.fillStyle(0xffffff, Math.min(1, 0.9 * flicker));
      this.waterGraphics.fillCircle(glintX, glintY, 1.0);
    });

    // 2. Mud Puddles
    this.waterPuddles.forEach((p) => {
      // Dark muddy wet perimeter
      this.waterGraphics.fillStyle(0x110c07, 0.65);
      this.waterGraphics.fillEllipse(p.x, p.y, p.rx * 2, p.ry * 2);

      // Water sheen
      this.waterGraphics.fillStyle(0x1a2630, 0.48);
      this.waterGraphics.fillEllipse(p.x, p.y, (p.rx - 2) * 2, (p.ry - 1.5) * 2);

      // Animated surface ripple
      const ripple = ((time * 0.0007 + p.phase) % 1);
      const rx = p.rx * ripple;
      const ry = p.ry * ripple;
      const rAlpha = (1 - ripple) * 0.35;
      this.waterGraphics.lineStyle(1, 0x7dd3fc, rAlpha);
      this.waterGraphics.strokeEllipse(p.x, p.y, rx * 2, ry * 2);

      // In RAIN, extra rapid rain drops hitting the puddles
      if (this.currentWeather === WeatherState.RAIN) {
        for (let r = 0; r < 2; r++) {
          const rainRipple = ((time * 0.002 + p.phase + r * 0.5) % 1);
          const rrx = (p.rx * 0.7) * rainRipple;
          const rry = (p.ry * 0.7) * rainRipple;
          this.waterGraphics.lineStyle(1, 0xbae6fd, (1 - rainRipple) * 0.45);
          this.waterGraphics.strokeEllipse(p.x + (r === 0 ? -6 : 8), p.y + (r === 0 ? 2 : -3), rrx * 2, rry * 2);
        }
      }

      // Specular directional glint on puddle
      const reflX = p.x - preset.shadowDx * (p.rx * 0.35);
      const reflY = p.y - preset.shadowDy * (p.ry * 0.35);
      const reflFlicker = (Math.sin(time * 0.005 + p.phase) * 0.2 + 0.8) * weatherSpecMult;

      this.waterGraphics.fillStyle(preset.specularColor, Math.min(1, 0.55 * reflFlicker));
      this.waterGraphics.fillEllipse(reflX, reflY, 9, 4);
      this.waterGraphics.fillStyle(0xffffff, Math.min(1, 0.85 * reflFlicker));
      this.waterGraphics.fillEllipse(reflX, reflY, 4, 1.8);
    });
  }

  /**
   * Instantiates visual animated POI markers and interaction zones aligned with Jean Ropke RDOMap
   */
  private setupPOIs() {
    this.poiVisuals = [];

    pois.forEach((poi) => {
      const container = this.add.container(poi.x, poi.y);
      container.setDepth(poi.y);

      // 1. Soft pulsing ground aura
      const groundAura = this.add.circle(0, 0, 18, 0xf59e0b, 0.22);

      // 2. Animated outer beacon ring
      const outerRing = this.add.circle(0, 0, 16);
      outerRing.setStrokeStyle(2, 0xd4af37, 0.85);

      this.tweens.add({
        targets: outerRing,
        scaleX: 1.85,
        scaleY: 1.85,
        alpha: 0.1,
        duration: 1200,
        repeat: -1,
        ease: 'Cubic.easeOut'
      });

      // 3. Central golden disc / diamond
      const innerDot = this.add.circle(0, 0, 6, 0xf59e0b, 0.9);
      innerDot.setStrokeStyle(1.5, 0xffffff, 0.9);

      // 4. Bobbing Emoji / Icon
      const iconText = this.add.text(0, -18, poi.icon || '★', {
        fontSize: '18px',
        align: 'center'
      }).setOrigin(0.5);

      this.tweens.add({
        targets: iconText,
        y: -23,
        duration: 1000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });

      // 5. High-resolution Western sign label
      const labelTextContent = poi.name;
      const labelWidth = Math.max(80, labelTextContent.length * 6.5 + 24);
      const labelBg = this.add.rectangle(0, -38, labelWidth, 18, 0x18120b, 0.85);
      labelBg.setStrokeStyle(1, 0x8c734b, 0.9);

      const labelText = this.add.text(0, -38, labelTextContent, {
        fontSize: '10px',
        color: '#fef08a',
        fontFamily: 'Inter, Cinzel, serif',
        fontStyle: 'bold',
        resolution: 2
      }).setOrigin(0.5);

      // 6. [E] Prompt Key badge above sign
      const keyBadge = this.add.container(0, -53);
      const keyBg = this.add.rectangle(0, 0, 36, 14, 0xd4af37, 0.95);
      keyBg.setStrokeStyle(1, 0x221a10, 1);
      const keyText = this.add.text(0, 0, '[E]', {
        fontSize: '9px',
        color: '#1a1208',
        fontFamily: 'Inter, sans-serif',
        fontStyle: 'bold',
        resolution: 2
      }).setOrigin(0.5);
      keyBadge.add([keyBg, keyText]);
      keyBadge.setVisible(false); // only visible when player is near

      container.add([groundAura, outerRing, innerDot, iconText, labelBg, labelText, keyBadge]);

      // Interactive click to move or interact
      container.setSize(labelWidth, 60);
      container.setInteractive({ useHandCursor: true });
      container.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
        if (rpgMenuManager.isMenuOpen()) return;
        const dist = Phaser.Math.Distance.Between(this.localX, this.localY, poi.x, poi.y);
        if (dist <= poi.radius) {
          rpgMenuManager.openPOIModal(poi);
        } else {
          this.setClickWaypoint(poi.x, poi.y);
        }
      });

      this.poiVisuals.push({
        poi,
        container,
        outerRing,
        innerDot,
        iconText,
        labelBg,
        labelText,
        keyBadge,
        isNear: false
      });
    });
  }

  /**
   * Updates proximity checks for all POIs to show interaction prompts
   */
  private updatePOIProximity() {
    let closestPOI: POIDefinition | null = null;
    let closestDist = Infinity;

    for (const pv of this.poiVisuals) {
      const dist = Phaser.Math.Distance.Between(this.localX, this.localY, pv.poi.x, pv.poi.y);
      const isNear = dist <= pv.poi.radius;

      if (isNear && dist < closestDist) {
        closestDist = dist;
        closestPOI = pv.poi;
      }

      if (isNear !== pv.isNear) {
        pv.isNear = isNear;
        pv.keyBadge.setVisible(isNear);
        pv.labelBg.setStrokeStyle(1.5, isNear ? 0xf59e0b : 0x8c734b, isNear ? 1 : 0.85);
        pv.labelText.setColor(isNear ? '#ffffff' : '#fef08a');
        pv.innerDot.setScale(isNear ? 1.4 : 1.0);
      }
    }

    if (closestPOI !== this.currentNearbyPOI) {
      this.currentNearbyPOI = closestPOI;
      rpgMenuManager.showPOIPrompt(closestPOI);
    }
  }

  /**
   * Weather-driven atmospheric particle system:
   * - Clear: Gentle prairie dust motes drifting across Valentine
   * - Dust Storm: High-velocity sweeping sand gusts & dust clouds
   * - Rain: Diagonal falling rain streaks & ground impact ripples
   */
  private setupWeatherParticles() {
    this.particles = [];

    if (this.currentWeather === WeatherState.CLEAR) {
      for (let i = 0; i < 30; i++) {
        this.particles.push({
          type: 'dust',
          x: Phaser.Math.Between(0, WORLD_MAP_WIDTH),
          y: Phaser.Math.Between(20, WORLD_MAP_HEIGHT - 20),
          vx: Phaser.Math.FloatBetween(20, 42),
          vy: Phaser.Math.FloatBetween(-3, 3),
          size: Phaser.Math.FloatBetween(1.2, 2.2),
          alpha: Phaser.Math.FloatBetween(0.25, 0.45),
          baseAlpha: 0.4,
          color: 0xedd6b8,
          phase: Math.random() * Math.PI * 2
        });
      }
    } else if (this.currentWeather === WeatherState.DUST_STORM) {
      for (let i = 0; i < 90; i++) {
        const isSand = Math.random() > 0.4;
        this.particles.push({
          type: isSand ? 'sand' : 'dust',
          x: Phaser.Math.Between(0, WORLD_MAP_WIDTH),
          y: Phaser.Math.Between(0, WORLD_MAP_HEIGHT),
          vx: Phaser.Math.FloatBetween(180, 340),
          vy: Phaser.Math.FloatBetween(15, 45),
          size: isSand ? Phaser.Math.FloatBetween(1.8, 3.2) : Phaser.Math.FloatBetween(3.5, 7.5),
          alpha: isSand ? Phaser.Math.FloatBetween(0.5, 0.85) : Phaser.Math.FloatBetween(0.15, 0.35),
          baseAlpha: 0.7,
          color: isSand ? 0xd4a373 : 0xb08968,
          phase: Math.random() * Math.PI * 2
        });
      }
    } else if (this.currentWeather === WeatherState.RAIN) {
      for (let i = 0; i < 140; i++) {
        this.particles.push({
          type: 'rain',
          x: Phaser.Math.Between(-100, WORLD_MAP_WIDTH + 100),
          y: Phaser.Math.Between(-50, WORLD_MAP_HEIGHT),
          vx: Phaser.Math.FloatBetween(-55, -35),
          vy: Phaser.Math.FloatBetween(440, 560),
          size: Phaser.Math.FloatBetween(12, 18),
          alpha: Phaser.Math.FloatBetween(0.35, 0.55),
          baseAlpha: 0.5,
          color: 0x93c5fd,
          phase: Math.random() * Math.PI * 2
        });
      }
    }
  }

  private updateWeatherParticles(dt: number) {
    if (!this.particleGraphics) {
      this.particleGraphics = this.add.graphics();
      this.particleGraphics.setDepth(1500);
    }

    this.particleGraphics.clear();

    for (const p of this.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      if (p.type === 'dust') {
        p.y += Math.sin(this.time.now / 350 + p.phase) * 0.35;
        if (p.x > WORLD_MAP_WIDTH) p.x = 0;
        if (p.x < 0) p.x = WORLD_MAP_WIDTH;
        if (p.y > WORLD_MAP_HEIGHT) p.y = 0;
        if (p.y < 0) p.y = WORLD_MAP_HEIGHT;

        this.particleGraphics.fillStyle(p.color, p.alpha);
        this.particleGraphics.fillCircle(p.x, p.y, p.size);
      } else if (p.type === 'sand') {
        if (p.x > WORLD_MAP_WIDTH + 50) {
          p.x = -50;
          p.y = Phaser.Math.Between(0, WORLD_MAP_HEIGHT);
        }
        if (p.y > WORLD_MAP_HEIGHT + 20) p.y = -10;

        this.particleGraphics.lineStyle(1.4, p.color, p.alpha);
        this.particleGraphics.beginPath();
        this.particleGraphics.moveTo(p.x, p.y);
        this.particleGraphics.lineTo(p.x + p.vx * 0.02, p.y + p.vy * 0.02);
        this.particleGraphics.stroke();
      } else if (p.type === 'rain') {
        if (p.y > WORLD_MAP_HEIGHT + 20 || p.x < -120) {
          p.y = Phaser.Math.Between(-40, -10);
          p.x = Phaser.Math.Between(0, WORLD_MAP_WIDTH + 100);
        }

        this.particleGraphics.lineStyle(1.2, p.color, p.alpha);
        this.particleGraphics.beginPath();
        this.particleGraphics.moveTo(p.x, p.y);
        this.particleGraphics.lineTo(p.x + (p.vx / p.vy) * p.size, p.y + p.size);
        this.particleGraphics.stroke();
      }
    }
  }

  /**
   * Sets point-and-click navigation waypoint with animated marker
   */
  private setClickWaypoint(targetX: number, targetY: number) {
    const clampedX = Math.max(PLAYER_COLLISION_RADIUS, Math.min(WORLD_MAP_WIDTH - PLAYER_COLLISION_RADIUS, targetX));
    const clampedY = Math.max(PLAYER_COLLISION_RADIUS, Math.min(WORLD_MAP_HEIGHT - PLAYER_COLLISION_RADIUS, targetY));

    if (!this.isPositionWalkable(clampedX, clampedY)) return;

    if (this.navTarget) {
      this.navTarget.marker.destroy();
      this.navTarget = null;
    }

    const markerContainer = this.add.container(clampedX, clampedY);
    const outerRing = this.add.circle(0, 0, 14);
    outerRing.setStrokeStyle(2, 0xd4af37, 0.9);

    const innerDot = this.add.circle(0, 0, 4, 0xd4af37, 1);
    markerContainer.add([outerRing, innerDot]);
    markerContainer.setDepth(1);

    this.tweens.add({
      targets: outerRing,
      scaleX: 1.6,
      scaleY: 1.6,
      alpha: 0.1,
      duration: 750,
      repeat: -1
    });

    this.navTarget = {
      x: clampedX,
      y: clampedY,
      marker: markerContainer
    };
  }

  private clearClickWaypoint() {
    if (this.navTarget) {
      this.navTarget.marker.destroy();
      this.navTarget = null;
    }
  }

  /**
   * Renders 4x4 ultra-fine collision grid
   */
  private renderCollisionGrid(mapId: string) {
    const map = getMapById(mapId);
    if (!map) return;

    this.collisionGraphics.clear();
    this.collisionGraphics.fillStyle(0xdc2626, 0.45);

    const ts = map.tileSize;
    for (let y = 0; y < map.height; y++) {
      for (let x = 0; x < map.width; x++) {
        const index = y * map.width + x;
        if (map.collisionLayer && map.collisionLayer[index] === 1) {
          this.collisionGraphics.fillRect(x * ts, y * ts, ts, ts);
        }
      }
    }
  }

  private setupRoomListeners() {
    this.room.state.players.onAdd((player: Player, sessionId: string) => {
      this.createPlayerVisual(player, sessionId);

      if (sessionId === this.room.sessionId) {
        this.localX = player.position.x;
        this.localY = player.position.y;
      }

      player.position.onChange(() => {
        if (sessionId !== this.room.sessionId) {
          this.updateRemotePlayerVisual(player, sessionId);
        }
      });
    });

    this.room.state.players.onRemove((player: Player, sessionId: string) => {
      const container = this.playerContainers.get(sessionId);
      if (container) {
        container.destroy();
        this.playerContainers.delete(sessionId);
        this.playerSprites.delete(sessionId);
      }
      const shadowGfx = this.playerShadowGraphics.get(sessionId);
      if (shadowGfx) {
        shadowGfx.destroy();
        this.playerShadowGraphics.delete(sessionId);
      }
    });

    // Synchronize Time of Day & Weather from server state
    this.room.state.listen('timeOfDay', (val: string) => {
      if (val && Object.values(TimeOfDay).includes(val as TimeOfDay)) {
        this.setTimeOfDay(val as TimeOfDay, false);
      }
    });

    this.room.state.listen('weather', (val: string) => {
      if (val && Object.values(WeatherState).includes(val as WeatherState)) {
        this.setWeather(val as WeatherState, false);
      }
    });

    this.room.onMessage(RoomMessage.MOVE, (data: { success: boolean; x: number; y: number }) => {
      if (!data.success) {
        this.localX = data.x;
        this.localY = data.y;
        this.localVx = 0;
        this.localVy = 0;
        this.clearClickWaypoint();
      }
    });
  }

  private createPlayerVisual(player: Player, sessionId: string) {
    const isLocal = sessionId === this.room.sessionId;
    const startX = player.position.x;
    const startY = player.position.y;

    const container = this.add.container(startX, startY);

    // 1. Directional Cast Shadow Graphics attached under the sprite
    const shadowGraphics = this.add.graphics();
    this.playerShadowGraphics.set(sessionId, shadowGraphics);

    // 2. High-Resolution Western Outlaw Sprite (crisp slouch hat, duster coat & revolvers)
    const cowboySprite = this.add.image(0, 0, 'cowboy');
    cowboySprite.setDisplaySize(30, 58);
    cowboySprite.setOrigin(0.5, 0.5);

    // Tint sprite matching current lighting preset
    const preset = this.getLightingPreset();
    cowboySprite.setTint(preset.charTint);

    // 3. Anti-Aliased High-Res Name Label
    const nameLabelText = isLocal ? `★ ${player.username}` : player.username || 'Outlaw';
    const nameBg = this.add.rectangle(0, -36, nameLabelText.length * 7 + 14, 16, 0x14100c, 0.85);
    nameBg.setStrokeStyle(1, isLocal ? 0xd4af37 : 0x8c734b, 0.85);

    const nameText = this.add.text(0, -36, nameLabelText, {
      fontSize: '10px',
      color: isLocal ? '#fef08a' : '#f5ebe0',
      fontFamily: 'Inter, Cinzel, serif',
      fontStyle: 'bold',
      resolution: 2
    }).setOrigin(0.5);

    container.add([shadowGraphics, cowboySprite, nameBg, nameText]);
    container.setDepth(startY);

    this.playerContainers.set(sessionId, container);
    this.playerSprites.set(sessionId, cowboySprite);

    if (isLocal) {
      // Debug feet collision hitbox circle (radius 7px at boots)
      const debugHitbox = this.add.circle(0, PLAYER_FEET_OFFSET_Y, PLAYER_COLLISION_RADIUS);
      debugHitbox.setStrokeStyle(1.5, 0x22c55e, 0.9);
      debugHitbox.setFillStyle(0x22c55e, 0.2);
      debugHitbox.setName('debug_hitbox');
      debugHitbox.setVisible(this.showCollisionGrid);
      container.add(debugHitbox);

      // Smooth Cinematic Camera Follow with Deadzone
      this.cameras.main.startFollow(container, true, 0.05, 0.05);
      this.cameras.main.setDeadzone(30, 20);

      const playerInfoEl = document.getElementById('player-info');
      if (playerInfoEl) playerInfoEl.textContent = `${player.username}`;
    }
  }

  private updateRemotePlayerVisual(player: Player, sessionId: string) {
    const container = this.playerContainers.get(sessionId);
    const sprite = this.playerSprites.get(sessionId);
    if (!container || !sprite) return;

    if (Math.abs(Math.cos(player.position.heading)) > 0.1) {
      sprite.setFlipX(Math.cos(player.position.heading) < 0);
    }

    if (player.position.isMoving) {
      const walkFreq = player.position.isSprinting ? 22 : 14;
      sprite.setAngle(Math.sin(this.time.now / (1000 / walkFreq)) * 3.5);
    } else {
      sprite.setAngle(0);
    }

    this.tweens.add({
      targets: container,
      x: player.position.x,
      y: player.position.y,
      duration: TICK_INTERVAL_MS * 1.2,
      ease: 'Linear',
      onUpdate: () => {
        container.setDepth(container.y);
      }
    });
  }

  update(time: number, delta: number) {
    if (!this.room) return;

    const dt = delta / 1000;

    // 1. Process Local Movement Inputs & Gait
    this.handleLocalMovement(dt);

    // 2. Update Stamina Bar & Regeneration
    this.handleStaminaSystem(dt);

    // 3. Directional Character Cast Shadows (Matching Sun/Moon angle & stride)
    this.updateCharacterShadows();

    // 4. Animate Animated Water Troughs & Puddles (Sinus ripples & directional specular reflections)
    this.updateWaterEffects(time);

    // 5. Specular Highlights on Wood Railings, Hitching Posts & Mud Roads
    this.updateSpecularHighlights(time);

    // 6. Animate Atmospheric Weather Particles (Prairie Dust, Dust Storm Sand gusts, Rain streaks)
    this.updateWeatherParticles(dt);

    // 7. Update POI Proximity & Interaction Prompts
    this.updatePOIProximity();

    // 6. Broadcast Continuous Move Intent at 20Hz
    if (time - this.lastMoveSent >= TICK_INTERVAL_MS) {
      const payload: MoveIntentMessage = {
        x: Math.round(this.localX * 10) / 10,
        y: Math.round(this.localY * 10) / 10,
        vx: Math.round(this.localVx),
        vy: Math.round(this.localVy),
        heading: Math.round(this.localHeading * 100) / 100,
        isMoving: this.isMoving,
        isSprinting: this.isSprinting,
        targetX: this.navTarget ? Math.round(this.navTarget.x) : undefined,
        targetY: this.navTarget ? Math.round(this.navTarget.y) : undefined,
        clientTimestamp: Date.now()
      };

      this.room.send(RoomMessage.MOVE, payload);
      this.lastMoveSent = time;
    }

    // 6. Render Circular RDR Minimap Radar
    this.renderMinimapRadar();
  }

  /**
   * Free continuous movement with 3 RDO gaits (Walk, Jog, Sprint) and obstacle sliding
   */
  private handleLocalMovement(dt: number) {
    // If RPG menu is open, halt movement input
    if (rpgMenuManager.isMenuOpen()) {
      this.localVx = 0;
      this.localVy = 0;
      this.isMoving = false;
      return;
    }

    let inputX = 0;
    let inputY = 0;

    const isUp = this.cursors.up.isDown || this.wasdKeys.up.isDown;
    const isDown = this.cursors.down.isDown || this.wasdKeys.down.isDown;
    const isLeft = this.cursors.left.isDown || this.wasdKeys.left.isDown;
    const isRight = this.cursors.right.isDown || this.wasdKeys.right.isDown;
    const isKeyboardActive = isUp || isDown || isLeft || isRight;

    if (isKeyboardActive) {
      this.clearClickWaypoint();

      if (isUp) inputY -= 1;
      if (isDown) inputY += 1;
      if (isLeft) inputX -= 1;
      if (isRight) inputX += 1;
    } else if (this.navTarget) {
      const dx = this.navTarget.x - this.localX;
      const dy = this.navTarget.y - this.localY;
      const dist = Math.hypot(dx, dy);

      if (dist < 4) {
        this.clearClickWaypoint();
        inputX = 0;
        inputY = 0;
      } else {
        inputX = dx / dist;
        inputY = dy / dist;
      }
    }

    const inputMagnitude = Math.hypot(inputX, inputY);
    let targetVx = 0;
    let targetVy = 0;

    // Check Sprinting status (Shift key held AND stamina > 0)
    const wantsSprint = this.wasdKeys.shift.isDown && inputMagnitude > 0;
    if (wantsSprint && this.stamina > 5) {
      this.isSprinting = true;
    } else {
      this.isSprinting = false;
    }

    // Determine current speed based on gait
    let activeSpeed = PLAYER_JOG_SPEED;
    if (this.isSprinting) {
      activeSpeed = PLAYER_SPRINT_SPEED;
    } else if (this.currentGait === GaitMode.WALK) {
      activeSpeed = PLAYER_WALK_SPEED;
    } else {
      activeSpeed = PLAYER_JOG_SPEED;
    }

    if (inputMagnitude > 0) {
      targetVx = (inputX / inputMagnitude) * activeSpeed;
      targetVy = (inputY / inputMagnitude) * activeSpeed;
      this.isMoving = true;
      this.localHeading = Math.atan2(inputY, inputX);
    } else {
      this.isMoving = false;
    }

    // Smooth Acceleration / Deceleration
    const accelRate = this.isSprinting ? 22 : 16;
    this.localVx += (targetVx - this.localVx) * Math.min(1, accelRate * dt);
    this.localVy += (targetVy - this.localVy) * Math.min(1, accelRate * dt);

    if (Math.abs(this.localVx) < 1 && targetVx === 0) this.localVx = 0;
    if (Math.abs(this.localVy) < 1 && targetVy === 0) this.localVy = 0;

    // Obstacle Sliding Collision
    const dx = this.localVx * dt;
    const dy = this.localVy * dt;

    if (dx !== 0 || dy !== 0) {
      const nextX = this.localX + dx;
      const nextY = this.localY + dy;

      if (this.isPositionWalkable(nextX, nextY)) {
        this.localX = nextX;
        this.localY = nextY;
      } else {
        // Horizontal slide
        if (this.isPositionWalkable(nextX, this.localY)) {
          this.localX = nextX;
        }
        // Vertical slide
        if (this.isPositionWalkable(this.localX, nextY)) {
          this.localY = nextY;
        }

        if (this.navTarget && !this.isPositionWalkable(nextX, this.localY) && !this.isPositionWalkable(this.localX, nextY)) {
          this.clearClickWaypoint();
        }
      }
    }

    // Update Local Visual Container & Sprite
    const container = this.playerContainers.get(this.room.sessionId);
    const sprite = this.playerSprites.get(this.room.sessionId);

    if (container && sprite) {
      container.setPosition(this.localX, this.localY);
      container.setDepth(this.localY);

      // Facing Direction
      if (Math.abs(Math.cos(this.localHeading)) > 0.08) {
        sprite.setFlipX(Math.cos(this.localHeading) < 0);
      }

      // Procedural Gait Animation Cycle (Stride Bobbing & Tilt)
      if (this.isMoving) {
        const strideFreq = this.isSprinting ? 24 : this.currentGait === GaitMode.WALK ? 10 : 16;
        this.gaitTimer += dt * strideFreq;

        const bob = Math.abs(Math.sin(this.gaitTimer)) * (this.isSprinting ? 3.5 : 1.8);
        const tilt = Math.sin(this.gaitTimer) * (this.isSprinting ? 4.5 : 2.0);

        sprite.setY(-bob);
        sprite.setAngle(tilt);

        // Stride dust particles when sprinting
        if (this.isSprinting && Math.sin(this.gaitTimer) > 0.8) {
          this.spawnFootstepDust(this.localX, this.localY + 24);
        }
      } else {
        sprite.setY(0);
        sprite.setAngle(0);
      }

      // UI Pos info update
      const posInfoEl = document.getElementById('pos-info');
      if (posInfoEl) {
        posInfoEl.textContent = `Valentine (${Math.round(this.localX)}, ${Math.round(this.localY)})`;
      }
    }
  }

  /**
   * Spawns a momentary dust particle puff at boots
   */
  private spawnFootstepDust(x: number, y: number) {
    const puff = this.add.circle(x + Phaser.Math.Between(-4, 4), y, Phaser.Math.Between(2, 4), 0xc5bba8, 0.4);
    puff.setDepth(y - 1);
    this.tweens.add({
      targets: puff,
      scaleX: 2.2,
      scaleY: 2.2,
      alpha: 0,
      y: y - 8,
      duration: 350,
      onComplete: () => puff.destroy()
    });
  }

  /**
   * Handles stamina drain when sprinting and recovery when idle/walking
   */
  private handleStaminaSystem(dt: number) {
    if (this.isSprinting && this.isMoving) {
      // Drain stamina
      this.stamina = Math.max(0, this.stamina - 22 * dt);
    } else {
      // Regenerate stamina
      this.stamina = Math.min(this.maxStamina, this.stamina + 14 * dt);
    }

    // Update DOM Stamina Fill Bar
    const staminaFill = document.getElementById('stamina-fill');
    if (staminaFill) {
      const pct = (this.stamina / this.maxStamina) * 100;
      staminaFill.style.width = `${pct}%`;
    }

    const menuStamina = document.getElementById('menu-stamina-val');
    if (menuStamina) {
      menuStamina.textContent = `${Math.round(this.stamina)} / 100`;
    }
  }

  private updateGaitHUD() {
    const badge = document.getElementById('gait-badge');
    if (badge) {
      if (this.isSprinting) {
        badge.textContent = 'SPRINT';
        badge.style.color = '#ef4444';
        badge.style.borderColor = '#ef4444';
      } else {
        badge.textContent = this.currentGait.toUpperCase();
        badge.style.color = this.currentGait === GaitMode.WALK ? '#a89a87' : '#d4af37';
        badge.style.borderColor = '#7c633f';
      }
    }
  }



  /**
   * Continuous collision validation against map bounds and 4x4 solid tiles with circle-to-AABB distance check
   */
  private isPositionWalkable(px: number, py: number): boolean {
    const map = getMapById('world_map_01');
    if (!map) return false;

    const radius = PLAYER_COLLISION_RADIUS;
    const feetY = py + PLAYER_FEET_OFFSET_Y;

    // Check map boundaries
    if (
      px - radius < 0 ||
      px + radius >= WORLD_MAP_WIDTH ||
      feetY - radius < 0 ||
      feetY + radius >= WORLD_MAP_HEIGHT
    ) {
      return false;
    }

    // Check intersecting 4x4 tiles
    const minTileX = Math.floor((px - radius) / map.tileSize);
    const maxTileX = Math.floor((px + radius) / map.tileSize);
    const minTileY = Math.floor((feetY - radius) / map.tileSize);
    const maxTileY = Math.floor((feetY + radius) / map.tileSize);

    for (let ty = minTileY; ty <= maxTileY; ty++) {
      for (let tx = minTileX; tx <= maxTileX; tx++) {
        if (tx < 0 || tx >= map.width || ty < 0 || ty >= map.height) {
          return false;
        }
        const index = ty * map.width + tx;
        if (map.collisionLayer && map.collisionLayer[index] === 1) {
          // Precise circle-to-AABB distance check against 4x4 tile
          const closestX = Math.max(tx * map.tileSize, Math.min(px, (tx + 1) * map.tileSize));
          const closestY = Math.max(ty * map.tileSize, Math.min(feetY, (ty + 1) * map.tileSize));
          const distX = px - closestX;
          const distY = feetY - closestY;
          if (distX * distX + distY * distY < radius * radius) {
            return false;
          }
        }
      }
    }

    return true;
  }

  /**
   * Real-time Circular RDR Minimap Radar
   */
  private renderMinimapRadar() {
    if (!this.minimapCanvas || !this.minimapCtx || !this.mapImageSource) return;

    const ctx = this.minimapCtx;
    const w = this.minimapCanvas.width;
    const h = this.minimapCanvas.height;
    const centerX = w / 2;
    const centerY = h / 2;
    const radius = 70;

    ctx.clearRect(0, 0, w, h);

    ctx.save();

    // Circular radar clip
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.clip();

    // Draw zoomed map crop centered on local player continuous position
    const cropSize = 240;
    const sx = Math.max(0, Math.min(WORLD_MAP_WIDTH - cropSize, this.localX - cropSize / 2));
    const sy = Math.max(0, Math.min(WORLD_MAP_HEIGHT - cropSize, this.localY - cropSize / 2));

    ctx.drawImage(this.mapImageSource, sx, sy, cropSize, cropSize, 0, 0, w, h);

    // Subtle dark radar vignette
    const radGrad = ctx.createRadialGradient(centerX, centerY, 30, centerX, centerY, radius);
    radGrad.addColorStop(0, 'rgba(15, 12, 9, 0)');
    radGrad.addColorStop(1, 'rgba(15, 12, 9, 0.65)');
    ctx.fillStyle = radGrad;
    ctx.fillRect(0, 0, w, h);

    // Draw waypoint marker on radar if active
    if (this.navTarget) {
      const wpRelX = (this.navTarget.x - this.localX) * (w / cropSize) + centerX;
      const wpRelY = (this.navTarget.y - this.localY) * (h / cropSize) + centerY;

      ctx.beginPath();
      ctx.arc(wpRelX, wpRelY, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#f59e0b';
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();
    }

    // Draw POIs on radar as golden diamond blips
    pois.forEach((poi) => {
      const poiRelX = (poi.x - this.localX) * (w / cropSize) + centerX;
      const poiRelY = (poi.y - this.localY) * (h / cropSize) + centerY;
      const distFromCenter = Math.hypot(poiRelX - centerX, poiRelY - centerY);

      if (distFromCenter <= radius - 4) {
        ctx.save();
        ctx.translate(poiRelX, poiRelY);
        ctx.beginPath();
        ctx.moveTo(0, -4);
        ctx.lineTo(4, 0);
        ctx.lineTo(0, 4);
        ctx.lineTo(-4, 0);
        ctx.closePath();
        ctx.fillStyle = '#f59e0b';
        ctx.fill();
        ctx.lineWidth = 1;
        ctx.strokeStyle = '#221508';
        ctx.stroke();
        ctx.restore();
      }
    });

    // Draw remote players as red dots
    this.room.state.players.forEach((p, sid) => {
      if (sid === this.room.sessionId) return;

      const relX = (p.position.x - this.localX) * (w / cropSize) + centerX;
      const relY = (p.position.y - this.localY) * (h / cropSize) + centerY;

      ctx.beginPath();
      ctx.arc(relX, relY, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#ef4444';
      ctx.fill();
      ctx.lineWidth = 1;
      ctx.strokeStyle = '#000000';
      ctx.stroke();
    });

    // Draw local player arrow in the exact center
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(this.localHeading - Math.PI / 2);

    ctx.beginPath();
    ctx.moveTo(0, -8);
    ctx.lineTo(5, 5);
    ctx.lineTo(0, 2);
    ctx.lineTo(-5, 5);
    ctx.closePath();
    ctx.fillStyle = '#d4af37';
    ctx.fill();
    ctx.strokeStyle = '#1a140d';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.restore();

    ctx.restore();

    // Radar border ring
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#8c734b';
    ctx.stroke();
  }
}
