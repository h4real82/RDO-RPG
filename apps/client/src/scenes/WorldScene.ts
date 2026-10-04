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
  POIDefinition
} from '@rdo-rpg/shared';
import { getMapById, pois } from '@rdo-rpg/content';
import { UserProfile } from '../discord';
import { rpgMenuManager } from '../menu';

interface NavTarget {
  x: number;
  y: number;
  marker: Phaser.GameObjects.Container;
}

interface PointLightData {
  x: number;
  y: number;
  sprite: Phaser.GameObjects.Image;
  baseScale: number;
  baseAlpha: number;
  flickerSpeed: number;
  phase: number;
}

interface WaterTrough {
  x: number;
  y: number;
  width: number;
  height: number;
  lanternX: number;
  lanternY: number;
}

interface WaterPuddle {
  x: number;
  y: number;
  rx: number;
  ry: number;
  lanternX: number;
  lanternY: number;
  phase: number;
}

interface AmbientParticle {
  type: 'dust' | 'ember' | 'mist';
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  baseAlpha: number;
  color: number;
  phase: number;
  originX?: number;
  originY?: number;
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
  private currentGait: GaitMode = GaitMode.JOG; // Walk or Jog as base pace
  private isSprinting: boolean = false;
  private stamina: number = 100;
  private maxStamina: number = 100;
  private gaitTimer: number = 0;

  // Point-and-Click Navigation
  private navTarget: NavTarget | null = null;

  // POI & Travel Interaction Zones
  private poiVisuals: POIVisual[] = [];
  private currentNearbyPOI: POIDefinition | null = null;

  // Visual Entities
  private playerContainers: Map<string, Phaser.GameObjects.Container> = new Map();
  private playerSprites: Map<string, Phaser.GameObjects.Image> = new Map();
  private localPlayerShadow: Phaser.GameObjects.Ellipse | null = null;

  // Dynamic Lighting, Forward Lantern Beam & Ambient Occlusion
  private pointLights: PointLightData[] = [];
  private playerLanternCone: Phaser.GameObjects.Image | null = null;
  private aoShadowsGraphics!: Phaser.GameObjects.Graphics;
  private ambientOverlay!: Phaser.GameObjects.Rectangle;

  // Animated Water Simulation (Troughs & Mud Puddles)
  private waterGraphics!: Phaser.GameObjects.Graphics;
  private waterTroughs: WaterTrough[] = [];
  private waterPuddles: WaterPuddle[] = [];

  // Multi-tier Atmospheric Particles
  private particles: AmbientParticle[] = [];
  private particleGraphics!: Phaser.GameObjects.Graphics;

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
    // 1. Generate Warm Radial Point Light Texture & Forward Lantern Beam
    this.createRadialLightTexture();
    this.createPlayerLanternConeTexture();

    // 2. HD Background Map (1376x768)
    const map = this.add.image(0, 0, 'western_map').setOrigin(0, 0);
    map.setDisplaySize(WORLD_MAP_WIDTH, WORLD_MAP_HEIGHT);

    // 3. Animated Water Simulation (Troughs & Puddles with Shimmer & Reflections)
    this.setupWaterEffects();

    // 4. Ambient Occlusion & Soft Drop Shadows under Roofs, Boardwalks & Buildings
    this.setupAmbientOcclusionShadows();

    // 5. Warm Point Lights (Flickering Lanterns & Torches) at Buildings
    this.setupWarmPointLights();

    // 6. Ambient Dusk / Western Twilight Multiplicative Filter
    this.ambientOverlay = this.add.rectangle(0, 0, WORLD_MAP_WIDTH, WORLD_MAP_HEIGHT, 0x100b08, 0.48);
    this.ambientOverlay.setOrigin(0, 0);
    this.ambientOverlay.setBlendMode(Phaser.BlendModes.MULTIPLY);
    this.ambientOverlay.setDepth(900);

    // 7. Ambient Atmospheric Dust, Ember & Mist Particles
    this.setupAtmosphericParticles();

    // 8. Collision Debug Layer (Default: INVISIBLE, toggle with 'C')
    this.collisionGraphics = this.add.graphics();
    this.collisionGraphics.setVisible(false);
    this.collisionGraphics.setDepth(2000);
    this.renderCollisionGrid('world_map_01');

    // 7. Keyboard Inputs
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
        eKey: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E)
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

      // Interact with closest POI with 'E'
      this.wasdKeys.eKey.on('down', () => {
        if (this.currentNearbyPOI && !rpgMenuManager.isMenuOpen()) {
          rpgMenuManager.openPOIModal(this.currentNearbyPOI);
        }
      });
    }

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
      if (this.playerLanternCone) {
        this.playerLanternCone.setPosition(destX, destY + 8);
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

  /**
   * Procedural warm radial point light texture generator
   */
  private createRadialLightTexture() {
    if (this.textures.exists('lantern_glow')) return;

    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const center = size / 2;
    const grad = ctx.createRadialGradient(center, center, 4, center, center, center);
    grad.addColorStop(0, 'rgba(255, 245, 210, 0.95)'); // Core golden white
    grad.addColorStop(0.2, 'rgba(255, 175, 45, 0.65)');  // Warm amber gold
    grad.addColorStop(0.5, 'rgba(225, 105, 15, 0.25)');  // Fire glow
    grad.addColorStop(0.8, 'rgba(180, 60, 5, 0.08)');   // Ambient falloff
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    this.textures.addCanvas('lantern_glow', canvas);
  }

  /**
   * Procedural directional forward lantern cone texture with soft radial falloff
   */
  private createPlayerLanternConeTexture() {
    if (this.textures.exists('player_lantern_cone')) return;

    const width = 256;
    const height = 256;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const originX = 24;
    const originY = 128;
    const maxRadius = 180;
    const spreadAngle = 0.58; // ~33 deg each side => ~66 deg FOV

    // 1. Directional forward lantern beam
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(originX, originY);
    ctx.arc(originX, originY, maxRadius, -spreadAngle, spreadAngle);
    ctx.closePath();

    const coneGrad = ctx.createRadialGradient(originX, originY, 4, originX, originY, maxRadius);
    coneGrad.addColorStop(0, 'rgba(255, 245, 205, 0.85)'); // Bright lantern core
    coneGrad.addColorStop(0.2, 'rgba(255, 195, 75, 0.55)');  // Warm golden amber
    coneGrad.addColorStop(0.55, 'rgba(235, 125, 25, 0.22)'); // Soft orange falloff
    coneGrad.addColorStop(0.85, 'rgba(180, 70, 10, 0.06)');  // Twilight edge
    coneGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = coneGrad;
    ctx.fill();
    ctx.restore();

    // 2. Immediate Ambient Hand Lantern Glow (360 degrees small aura)
    ctx.save();
    const handGlow = ctx.createRadialGradient(originX, originY, 2, originX, originY, 44);
    handGlow.addColorStop(0, 'rgba(255, 248, 220, 0.8)');
    handGlow.addColorStop(0.35, 'rgba(255, 180, 50, 0.45)');
    handGlow.addColorStop(0.7, 'rgba(220, 100, 15, 0.15)');
    handGlow.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = handGlow;
    ctx.beginPath();
    ctx.arc(originX, originY, 44, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    this.textures.addCanvas('player_lantern_cone', canvas);
  }

  /**
   * Instantiates warm lanterns with organic flicker tweens
   */
  private setupWarmPointLights() {
    const lampPositions = [
      { x: 380, y: 405, scale: 1.15, alpha: 0.9, speed: 1.4 },  // Saloon Porch
      { x: 785, y: 405, scale: 0.95, alpha: 0.85, speed: 1.1 }, // Sheriff's Office
      { x: 630, y: 215, scale: 1.05, alpha: 0.85, speed: 0.9 }, // Livery Stable
      { x: 955, y: 405, scale: 0.95, alpha: 0.8, speed: 1.3 },  // Valentine Bank
      { x: 610, y: 405, scale: 0.9, alpha: 0.8, speed: 1.0 },   // General Store
      { x: 1140, y: 210, scale: 1.25, alpha: 0.95, speed: 1.8 },// Blacksmith Forge Fire
      { x: 1080, y: 410, scale: 0.85, alpha: 0.75, speed: 1.2 },// Barber
      { x: 1260, y: 415, scale: 0.85, alpha: 0.75, speed: 1.1 },// Gunsmith
      { x: 65, y: 460, scale: 1.05, alpha: 0.85, speed: 1.2 },  // West Stagecoach Station
      { x: 1310, y: 460, scale: 1.05, alpha: 0.85, speed: 1.2 } // East Stagecoach Station
    ];

    lampPositions.forEach((pos, idx) => {
      const sprite = this.add.image(pos.x, pos.y, 'lantern_glow');
      sprite.setScale(pos.scale);
      sprite.setAlpha(pos.alpha);
      sprite.setBlendMode(Phaser.BlendModes.ADD);
      sprite.setDepth(950);

      this.pointLights.push({
        x: pos.x,
        y: pos.y,
        sprite,
        baseScale: pos.scale,
        baseAlpha: pos.alpha,
        flickerSpeed: pos.speed,
        phase: idx * 1.7
      });
    });
  }

  /**
   * Renders soft multi-layered drop shadows (Ambient Occlusion) beneath roofs, veranda edges & walls
   */
  private setupAmbientOcclusionShadows() {
    this.aoShadowsGraphics = this.add.graphics();
    this.aoShadowsGraphics.setDepth(3);

    // Saloon
    this.drawSoftDropShadow(284, 420, 200, 14, 0.55); // Porch edge onto dirt road
    this.drawSoftDropShadow(288, 392, 192, 7, 0.4);   // Wall base onto porch floor
    this.drawSoftDropShadow(284, 392, 6, 30, 0.35);   // West porch side shadow

    // General Store
    this.drawSoftDropShadow(540, 418, 136, 12, 0.55); // Porch edge
    this.drawSoftDropShadow(544, 392, 128, 6, 0.38);  // Wall base

    // Sheriff's Office
    this.drawSoftDropShadow(716, 418, 120, 12, 0.55); // Porch edge
    this.drawSoftDropShadow(720, 392, 112, 6, 0.38);  // Wall base

    // Valentine Bank
    this.drawSoftDropShadow(876, 418, 136, 12, 0.55); // Porch edge
    this.drawSoftDropShadow(880, 392, 128, 6, 0.38);  // Wall base

    // Barber Shop
    this.drawSoftDropShadow(1052, 420, 72, 12, 0.5);

    // Gunsmith
    this.drawSoftDropShadow(1196, 422, 136, 12, 0.55);

    // Livery Stable Barn
    this.drawSoftDropShadow(508, 216, 232, 16, 0.6);  // Deep entrance overhang
    this.drawSoftDropShadow(420, 224, 92, 6, 0.35);   // Corral fence base

    // Blacksmith Forge & Workshop
    this.drawSoftDropShadow(1068, 218, 168, 15, 0.55);

    // Top-Left Cabin
    this.drawSoftDropShadow(128, 218, 144, 12, 0.45);

    // South Buildings Boardwalk Edge along Main Street
    this.drawSoftDropShadow(120, 562, 1230, 12, 0.52);

    // South Buildings Wall Bases
    this.drawSoftDropShadow(128, 672, 144, 8, 0.4);
    this.drawSoftDropShadow(352, 672, 144, 8, 0.4);
    this.drawSoftDropShadow(576, 672, 128, 8, 0.4);
    this.drawSoftDropShadow(768, 672, 128, 8, 0.4);
    this.drawSoftDropShadow(944, 672, 112, 8, 0.4);
    this.drawSoftDropShadow(1104, 672, 112, 8, 0.4);
    this.drawSoftDropShadow(1264, 672, 80, 8, 0.4);

    // Hitching Posts along Main Street
    this.drawSoftDropShadow(332, 434, 96, 6, 0.35);
    this.drawSoftDropShadow(564, 434, 88, 6, 0.35);
    this.drawSoftDropShadow(742, 434, 76, 6, 0.35);
  }

  /**
   * Helper to draw soft gradient drop shadow bands
   */
  private drawSoftDropShadow(x: number, y: number, width: number, height: number, baseAlpha: number = 0.5) {
    const steps = 4;
    const stepHeight = height / steps;
    for (let i = 0; i < steps; i++) {
      const alpha = baseAlpha * (1 - (i / steps) * 0.75);
      this.aoShadowsGraphics.fillStyle(0x0a0705, alpha);
      this.aoShadowsGraphics.fillRect(x, y + i * stepHeight, width, stepHeight + 0.5);
    }
  }

  /**
   * Sets up animated water troughs and mud puddles
   */
  private setupWaterEffects() {
    this.waterGraphics = this.add.graphics();
    this.waterGraphics.setDepth(2);

    this.waterTroughs = [
      { x: 326, y: 226, width: 48, height: 18, lanternX: 630, lanternY: 215 },
      { x: 472, y: 228, width: 44, height: 18, lanternX: 630, lanternY: 215 },
      { x: 36, y: 536, width: 44, height: 18, lanternX: 65, lanternY: 460 }
    ];

    this.waterPuddles = [
      { x: 358, y: 462, rx: 30, ry: 12, lanternX: 380, lanternY: 405, phase: 0 },
      { x: 692, y: 466, rx: 34, ry: 13, lanternX: 785, lanternY: 405, phase: 1.8 },
      { x: 985, y: 470, rx: 28, ry: 11, lanternX: 955, lanternY: 405, phase: 3.4 },
      { x: 486, y: 196, rx: 22, ry: 9, lanternX: 630, lanternY: 215, phase: 2.1 },
      { x: 175, y: 485, rx: 26, ry: 10, lanternX: 65, lanternY: 460, phase: 4.7 }
    ];
  }

  /**
   * Renders dynamic water shimmer, sine caustics & lantern specular glints
   */
  private updateWaterEffects(time: number) {
    this.waterGraphics.clear();

    // 1. Water Troughs
    this.waterTroughs.forEach((t) => {
      // Dark murky trough water base
      this.waterGraphics.fillStyle(0x0f272a, 0.72);
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

      // Specular lantern glint
      const flicker = Math.sin(time * 0.005 + t.x) * 0.25 + 0.75;
      this.waterGraphics.fillStyle(0xfde68a, 0.65 * flicker);
      this.waterGraphics.fillCircle(t.x + t.width * 0.65, t.y + t.height * 0.45, 2.0);
      this.waterGraphics.fillStyle(0xffffff, 0.9 * flicker);
      this.waterGraphics.fillCircle(t.x + t.width * 0.65, t.y + t.height * 0.45, 1.0);
    });

    // 2. Mud Puddles
    this.waterPuddles.forEach((p) => {
      // Dark muddy wet perimeter
      this.waterGraphics.fillStyle(0x110c07, 0.62);
      this.waterGraphics.fillEllipse(p.x, p.y, p.rx * 2, p.ry * 2);

      // Water sheen
      this.waterGraphics.fillStyle(0x1a2630, 0.45);
      this.waterGraphics.fillEllipse(p.x, p.y, (p.rx - 2) * 2, (p.ry - 1.5) * 2);

      // Animated sine wave surface ripple
      const ripple = ((time * 0.0007 + p.phase) % 1);
      const rx = p.rx * ripple;
      const ry = p.ry * ripple;
      const rAlpha = (1 - ripple) * 0.32;
      this.waterGraphics.lineStyle(1, 0x7dd3fc, rAlpha);
      this.waterGraphics.strokeEllipse(p.x, p.y, rx * 2, ry * 2);

      // Specular reflection of nearby lantern
      const dx = p.lanternX - p.x;
      const reflX = p.x + Math.sign(dx) * Math.min(p.rx * 0.45, Math.abs(dx) * 0.06);
      const reflY = p.y - p.ry * 0.2;
      const reflFlicker = Math.sin(time * 0.006 + p.phase) * 0.2 + 0.8;
      this.waterGraphics.fillStyle(0xf59e0b, 0.5 * reflFlicker);
      this.waterGraphics.fillEllipse(reflX, reflY, 9, 4);
      this.waterGraphics.fillStyle(0xfef08a, 0.85 * reflFlicker);
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
   * Atmospheric multi-tier particles: drifting prairie dust, blacksmith forge embers & rolling street mist
   */
  private setupAtmosphericParticles() {
    this.particleGraphics = this.add.graphics();
    this.particleGraphics.setDepth(1500);

    // 1. Prairie Wind Dust Motes (Drifting West-to-East)
    const dustCount = 35;
    for (let i = 0; i < dustCount; i++) {
      this.particles.push({
        type: 'dust',
        x: Phaser.Math.Between(0, WORLD_MAP_WIDTH),
        y: Phaser.Math.Between(20, WORLD_MAP_HEIGHT - 20),
        vx: Phaser.Math.FloatBetween(18, 38),
        vy: Phaser.Math.FloatBetween(-3, 3),
        size: Phaser.Math.FloatBetween(1.2, 2.4),
        alpha: Phaser.Math.FloatBetween(0.25, 0.55),
        baseAlpha: Phaser.Math.FloatBetween(0.25, 0.55),
        color: Math.random() > 0.4 ? 0xd6c7b2 : 0xe8decb,
        phase: Math.random() * Math.PI * 2
      });
    }

    // 2. Blacksmith Forge Glowing Embers & Sparks (Rising Upward)
    const emberCount = 16;
    for (let i = 0; i < emberCount; i++) {
      this.particles.push({
        type: 'ember',
        x: 1140 + Phaser.Math.Between(-35, 35),
        y: 215 + Phaser.Math.Between(-15, 25),
        vx: Phaser.Math.FloatBetween(-6, 12),
        vy: Phaser.Math.FloatBetween(-28, -52),
        size: Phaser.Math.FloatBetween(1.5, 2.8),
        alpha: Phaser.Math.FloatBetween(0.65, 0.95),
        baseAlpha: Phaser.Math.FloatBetween(0.65, 0.95),
        color: Math.random() > 0.5 ? 0xf97316 : 0xfbbf24,
        phase: Math.random() * Math.PI * 2,
        originX: 1140,
        originY: 215
      });
    }

    // 3. Low-Altitude Rolling Dust & Mist Puffs across Main Street
    const mistCount = 10;
    for (let i = 0; i < mistCount; i++) {
      this.particles.push({
        type: 'mist',
        x: Phaser.Math.Between(0, WORLD_MAP_WIDTH),
        y: Phaser.Math.Between(420, 540),
        vx: Phaser.Math.FloatBetween(10, 22),
        vy: Phaser.Math.FloatBetween(-1, 1),
        size: Phaser.Math.FloatBetween(28, 48),
        alpha: Phaser.Math.FloatBetween(0.035, 0.075),
        baseAlpha: Phaser.Math.FloatBetween(0.035, 0.075),
        color: 0xc4b7a6,
        phase: Math.random() * Math.PI * 2
      });
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
      if (sessionId === this.room.sessionId && this.playerLanternCone) {
        this.playerLanternCone.destroy();
        this.playerLanternCone = null;
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

    // 1. Soft Oval Ground Contact Shadow anchored under boots
    const shadow = this.add.ellipse(0, 26, 32, 11, 0x000000, 0.45);

    // 2. High-Resolution Western Outlaw Sprite (crisp slouch hat, duster coat & revolvers)
    const cowboySprite = this.add.image(0, 0, 'cowboy');
    cowboySprite.setDisplaySize(30, 58);
    cowboySprite.setOrigin(0.5, 0.5);

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

    container.add([shadow, cowboySprite, nameBg, nameText]);
    container.setDepth(startY);

    this.playerContainers.set(sessionId, container);
    this.playerSprites.set(sessionId, cowboySprite);

    if (isLocal) {
      this.localPlayerShadow = shadow;

      // Forward Directional Lantern Light Cone for Local Player
      this.playerLanternCone = this.add.image(startX, startY + 8, 'player_lantern_cone');
      this.playerLanternCone.setOrigin(24 / 256, 128 / 256);
      this.playerLanternCone.setBlendMode(Phaser.BlendModes.ADD);
      this.playerLanternCone.setDepth(960);

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

    // 3. Animate Dynamic Lantern Flickers
    this.updateLanternFlickers(time);

    // 4. Animate Animated Water Troughs & Puddles (Sinus ripples & specular reflections)
    this.updateWaterEffects(time);

    // 5. Update Dynamic Character Lighting & Warm Tinting near Lanterns
    this.updateCharacterLighting(time);

    // 6. Animate Atmospheric Multi-tier Dust, Ember & Mist Particles
    this.updateAtmosphericParticles(dt);

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

      // Forward Lantern Beam: position, rotation with walking sway & organic flicker
      if (this.playerLanternCone) {
        this.playerLanternCone.setPosition(this.localX, this.localY + 8);
        const sway = this.isMoving ? Math.sin(this.gaitTimer) * 0.05 : 0;
        this.playerLanternCone.setRotation(this.localHeading + sway);
        const flicker = Math.sin(this.time.now / 110) * 0.04 + Math.cos(this.time.now / 75) * 0.03;
        this.playerLanternCone.setAlpha(0.72 + flicker);
      }

      // Facing Direction
      if (Math.abs(Math.cos(this.localHeading)) > 0.08) {
        sprite.setFlipX(Math.cos(this.localHeading) < 0);
      }

      // Dynamic Contact Shadow Squash & Stretch during movement
      if (this.localPlayerShadow) {
        if (this.isMoving) {
          const stridePhase = this.gaitTimer * 2;
          const stretch = Math.sin(stridePhase);
          this.localPlayerShadow.setScale(
            1 + stretch * (this.isSprinting ? 0.22 : 0.15),
            1 - stretch * (this.isSprinting ? 0.15 : 0.10)
          );
          this.localPlayerShadow.setAlpha(0.48 + Math.cos(stridePhase) * 0.08);
        } else {
          this.localPlayerShadow.setScale(1, 1);
          this.localPlayerShadow.setAlpha(0.45);
        }
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
   * Animates point lights with wind-blown lantern flickers
   */
  private updateLanternFlickers(time: number) {
    this.pointLights.forEach((light) => {
      const noise = Math.sin(time / 140 * light.flickerSpeed + light.phase);
      const noise2 = Math.cos(time / 80 * light.flickerSpeed + light.phase * 2);
      const flickerFactor = 1 + (noise * 0.05 + noise2 * 0.03);

      light.sprite.setScale(light.baseScale * flickerFactor);
      light.sprite.setAlpha(light.baseAlpha * (0.95 + noise * 0.05));
    });
  }

  /**
   * Dynamically modulates character sprite tint as outlaw passes warm flickering lanterns
   */
  private updateCharacterLighting(time: number) {
    this.playerContainers.forEach((container, sessionId) => {
      const sprite = this.playerSprites.get(sessionId);
      if (!sprite) return;

      const px = container.x;
      const py = container.y;

      let nearestDist = Infinity;
      let nearestLight: PointLightData | null = null;

      for (const light of this.pointLights) {
        const dist = Phaser.Math.Distance.Between(px, py, light.x, light.y);
        if (dist < nearestDist) {
          nearestDist = dist;
          nearestLight = light;
        }
      }

      if (nearestDist < 140 && nearestLight) {
        const factor = 1 - (nearestDist / 140);
        const flicker = Math.sin(time / 140 * nearestLight.flickerSpeed + nearestLight.phase) * 0.08;
        const intensity = Math.min(1, Math.max(0, factor * 0.85 + flicker));

        // Smoothly blend from dusk neutral to warm golden amber lantern reflection
        const r = Math.min(255, Math.round(195 + (255 - 195) * intensity));
        const g = Math.min(255, Math.round(180 + (225 - 180) * intensity));
        const b = Math.min(255, Math.round(165 - (165 - 120) * intensity));
        const tint = (r << 16) | (g << 8) | b;
        sprite.setTint(tint);
      } else {
        // Atmospheric dusk base tint
        sprite.setTint(0xc5bba8);
      }
    });
  }

  /**
   * Drifts multi-tier particles (prairie wind dust, blacksmith embers & low mist) across Valentine
   */
  private updateAtmosphericParticles(dt: number) {
    this.particleGraphics.clear();

    this.particles.forEach((p) => {
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      if (p.type === 'dust') {
        p.y += Math.sin(this.time.now / 350 + p.phase) * 0.35;
        // Wrap around world map bounds
        if (p.x > WORLD_MAP_WIDTH) p.x = 0;
        if (p.x < 0) p.x = WORLD_MAP_WIDTH;
        if (p.y > WORLD_MAP_HEIGHT) p.y = 0;
        if (p.y < 0) p.y = WORLD_MAP_HEIGHT;

        this.particleGraphics.fillStyle(p.color, p.alpha);
        this.particleGraphics.fillCircle(p.x, p.y, p.size);
      } else if (p.type === 'ember') {
        p.x += Math.sin(this.time.now / 150 + p.phase) * 0.6;
        // Twinkle
        p.alpha = p.baseAlpha * (0.6 + Math.sin(this.time.now / 80 + p.phase) * 0.4);

        // Reset if drifted too high or dissipated
        if (p.y < 70 || p.x < 1050 || p.x > 1250) {
          p.x = (p.originX || 1140) + Phaser.Math.Between(-30, 30);
          p.y = (p.originY || 215) + Phaser.Math.Between(-10, 20);
        }

        this.particleGraphics.fillStyle(p.color, p.alpha);
        this.particleGraphics.fillCircle(p.x, p.y, p.size);
      } else if (p.type === 'mist') {
        if (p.x > WORLD_MAP_WIDTH + 60) p.x = -60;
        if (p.x < -60) p.x = WORLD_MAP_WIDTH + 60;

        const pulseAlpha = p.baseAlpha * (0.85 + Math.sin(this.time.now / 800 + p.phase) * 0.15);
        this.particleGraphics.fillStyle(p.color, pulseAlpha);
        this.particleGraphics.fillCircle(p.x, p.y, p.size);
      }
    });
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
