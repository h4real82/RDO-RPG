import * as THREE from 'three';
import { pois } from '@rdo-rpg/content';
import valentineData from './data/valentineLayout.json';
import fastTravelPointsJson from './data/fastTravelPoints.json';
import { ValentineCity } from './ValentineCity';
import { CowboyCharacter } from './CowboyCharacter';

// Validated Ground-Truth Matrix for Red Dead Online (Jean Röpke Leaflet Projection)
export const CRS_SCALE = 0.01552;
export const CRS_LAT_OFFSET = -63.6;
export const CRS_LNG_OFFSET = 111.29;

/**
 * Forward conversion: Leaflet CRS.Simple (lat, lng) -> In-Game Meters (game_x, game_y)
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
 * Inverse conversion: In-Game Meters (game_x, game_y) -> Leaflet CRS.Simple (lat, lng)
 */
export function gameToLeafletCoords(game_x: number, game_y: number): { lat: number; lng: number } {
  return {
    lat: game_y * CRS_SCALE + CRS_LAT_OFFSET,
    lng: game_x * CRS_SCALE + CRS_LNG_OFFSET
  };
}

/**
 * Three.js World Vector Mapping:
 * threeX = game_x
 * threeY = elevation
 * threeZ = game_y
 */
export function gameToThreeCoords(game_x: number, game_y: number, elevation: number = 0): THREE.Vector3 {
  return new THREE.Vector3(game_x, elevation, game_y);
}

export function threeToLeafletCoords(threeX: number, threeZ: number): { lat: number; lng: number } {
  return gameToLeafletCoords(threeX, threeZ);
}

export interface MinimapConfig {
  showCompassRose: boolean;
  showBuildings: boolean;
  compassMode: boolean; // true = rotates map to follow player view; false = North-Up
  opacity: number;
  zoomLevelIndex: number; // Index into MINIMAP_ZOOM_METERS
}

export const MINIMAP_ZOOM_METERS = [40, 90, 250, 800, 2500, 6000] as const;
export const MINIMAP_ZOOM_LABELS = ['40M', '90M', '250M', '800M', '2.5KM', '6KM'] as const;

/**
 * Modern RDO Squircle Minimap System
 * Renders high-resolution Valentine detailed map & global Complete Red Dead Online Map with:
 * - Squircle container with Western border
 * - Player centering & optional Compass-Mode rotation
 * - Stepless continuous zooming ('+', '-') & 6-stage preset cycling ('N')
 * - Interactive panning / scrolling
 * - Multi-tier map rendering: local high-res town map at close zoom, global RDO map at wide zoom
 */
export class MinimapSystem {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private detailedMapImage: HTMLImageElement | null = null;
  private detailedMapLoaded: boolean = false;
  private globalMapImage: HTMLImageElement | null = null;
  private globalMapLoaded: boolean = false;

  public config: MinimapConfig = {
    showCompassRose: true,
    showBuildings: true,
    compassMode: false, // Default North-Up
    opacity: 0.85,
    zoomLevelIndex: 1 // Default 90m
  };

  // Continuous zoom in meters
  public currentZoomMeters: number = 90.0;
  public currentRegionName: string = 'VALENTINE';

  // Interactive Pan Offsets (meters)
  public panOffsetX: number = 0.0;
  public panOffsetZ: number = 0.0;
  private isDragging: boolean = false;
  private dragStartX: number = 0;
  private dragStartY: number = 0;
  private hasMovedWhileDragging: boolean = false;

  // Map Click Callback for fast travel & navigation
  public onMapClick: ((worldX: number, worldZ: number) => void) | null = null;
  private lastRenderedPlayerX: number = 0;
  private lastRenderedPlayerZ: number = 0;

  // Detailed Valentine Map calibration constants
  // Image dimensions: 1714 x 1267, Center: (857.0, 633.5), Scale: 0.18 m/px
  private readonly detailedWidth = 1714;
  private readonly detailedHeight = 1267;
  private readonly detailedCenterX = 857.0;
  private readonly detailedCenterY = 633.5;
  private readonly detailedMetersPerPx = 0.18;

  // Complete Global RDO Map calibration constants
  // Image dimensions: 1638 x 1180
  // Global coordinate envelope (In-game meters):
  // X: -6500m (Gaptooth Ridge) to +3400m (Annesburg / Saint Denis East) -> 9900m
  // Z: -3700m (San Luis River South) to +2800m (Tempest Rim / Glaciers North) -> 6500m
  private readonly globalWidth = 1638;
  private readonly globalHeight = 1180;
  private readonly globalMinX = -6500.0;
  private readonly globalMaxX = 3400.0;
  private readonly globalMinZ = -3700.0;
  private readonly globalMaxZ = 2800.0;

  // DOM elements
  private zoomBtn: HTMLElement | null = null;
  private compassBtn: HTMLElement | null = null;
  private bldgBtn: HTMLElement | null = null;
  private opacityBtn: HTMLElement | null = null;
  private infoBadge: HTMLElement | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('[MinimapSystem] Failed to get 2D canvas context');
    this.ctx = ctx;

    this.initMapAssets();
    this.initDOMElements();
    this.initPanListeners();
    this.applyOpacity(this.config.opacity);
  }

  /**
   * Preloads both the local Valentine detailed map and the global complete RDO map
   */
  private initMapAssets(): void {
    // 1. Detailed Valentine Map
    const detailedImg = new Image();
    detailedImg.src = '/assets/valentine_detailed_map.png';
    detailedImg.onload = () => {
      this.detailedMapImage = detailedImg;
      this.detailedMapLoaded = true;
      console.log('[MinimapSystem] Detailed Valentine map loaded (1714x1267).');
    };
    detailedImg.onerror = () => {
      console.warn('[MinimapSystem] Could not load /assets/valentine_detailed_map.png.');
    };

    // 2. Complete Global Red Dead Online Map
    const globalImg = new Image();
    globalImg.src = '/assets/complete_rdo_map.png';
    globalImg.onload = () => {
      this.globalMapImage = globalImg;
      this.globalMapLoaded = true;
      console.log('[MinimapSystem] Global Complete RDO map loaded (1638x1180).');
    };
    globalImg.onerror = () => {
      console.warn('[MinimapSystem] Could not load /assets/complete_rdo_map.png, using fallback.');
    };
  }

  /**
   * Initializes interactive HUD buttons and binds click events
   */
  private initDOMElements(): void {
    try {
      this.zoomBtn = document.getElementById('minimap-zoom-btn');
      this.compassBtn = document.getElementById('minimap-compass-btn');
      this.bldgBtn = document.getElementById('minimap-bldg-btn');
      this.opacityBtn = document.getElementById('minimap-opacity-btn');
      this.infoBadge = document.getElementById('minimap-info-badge');

      if (this.zoomBtn) {
        this.zoomBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.cycleZoom();
        });
      }

      if (this.compassBtn) {
        this.compassBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.toggleCompassMode();
        });
      }

      if (this.bldgBtn) {
        this.bldgBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.toggleBuildings();
        });
      }

      if (this.opacityBtn) {
        this.opacityBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.cycleOpacity();
        });
      }

      this.updateHUDIndicators();
    } catch (err) {
      console.error('[MinimapSystem] Error initializing DOM controls:', err);
    }
  }

  /**
   * Enables interactive click-and-drag panning on the minimap
   */
  private initPanListeners(): void {
    try {
      this.canvas.addEventListener('mousedown', (e) => {
        if (e.button === 0) {
          this.isDragging = true;
          this.dragStartX = e.clientX;
          this.dragStartY = e.clientY;
          this.hasMovedWhileDragging = false;
        } else if (e.button === 2) {
          // Right-click re-centers on player
          this.panOffsetX = 0;
          this.panOffsetZ = 0;
        }
      });

      window.addEventListener('mousemove', (e) => {
        if (!this.isDragging) return;
        const dx = e.clientX - this.dragStartX;
        const dy = e.clientY - this.dragStartY;

        if (Math.hypot(dx, dy) > 4) {
          this.hasMovedWhileDragging = true;
        }

        this.dragStartX = e.clientX;
        this.dragStartY = e.clientY;

        const pixelsPerMeter = this.canvas.width / this.currentZoomMeters;
        this.panOffsetX -= dx / pixelsPerMeter;
        this.panOffsetZ -= dy / pixelsPerMeter;
      });

      window.addEventListener('mouseup', (e) => {
        if (this.isDragging && !this.hasMovedWhileDragging && e.button === 0) {
          // Pure click without dragging: trigger onMapClick
          const rect = this.canvas.getBoundingClientRect();
          if (
            e.clientX >= rect.left &&
            e.clientX <= rect.right &&
            e.clientY >= rect.top &&
            e.clientY <= rect.bottom
          ) {
            const clickCanvasX = e.clientX - rect.left;
            const clickCanvasY = e.clientY - rect.top;
            const cx = this.canvas.width / 2;
            const cy = this.canvas.height / 2;
            const pixelsPerMeter = this.canvas.width / this.currentZoomMeters;

            const dMetersX = (clickCanvasX - cx) / pixelsPerMeter;
            const dMetersZ = (clickCanvasY - cy) / pixelsPerMeter;

            const targetWorldX = this.lastRenderedPlayerX + this.panOffsetX + dMetersX;
            const targetWorldZ = this.lastRenderedPlayerZ + this.panOffsetZ + dMetersZ;

            if (this.onMapClick) {
              this.onMapClick(targetWorldX, targetWorldZ);
            }
          }
        }
        this.isDragging = false;
      });

      // Double click re-centers
      this.canvas.addEventListener('dblclick', () => {
        this.panOffsetX = 0;
        this.panOffsetZ = 0;
      });
    } catch (err) {
      console.error('[MinimapSystem] Error initializing pan listeners:', err);
    }
  }

  /**
   * Cycles through preset zoom stages: 40m -> 90m -> 250m -> 800m -> 2.5km -> 6km
   */
  public cycleZoom(): void {
    this.config.zoomLevelIndex = (this.config.zoomLevelIndex + 1) % MINIMAP_ZOOM_METERS.length;
    this.currentZoomMeters = MINIMAP_ZOOM_METERS[this.config.zoomLevelIndex];
    this.updateHUDIndicators();
  }

  /**
   * Stepless smooth zoom in ('+' key / Equal / NumpadAdd)
   */
  public zoomIn(): void {
    this.currentZoomMeters = Math.max(25.0, this.currentZoomMeters * 0.82);
    this.syncPresetIndex();
    this.updateHUDIndicators();
  }

  /**
   * Stepless smooth zoom out ('-' key / Minus / NumpadSubtract)
   */
  public zoomOut(): void {
    this.currentZoomMeters = Math.min(7500.0, this.currentZoomMeters * 1.22);
    this.syncPresetIndex();
    this.updateHUDIndicators();
  }

  private syncPresetIndex(): void {
    let bestIdx = 0;
    let minDiff = Infinity;
    for (let i = 0; i < MINIMAP_ZOOM_METERS.length; i++) {
      const diff = Math.abs(MINIMAP_ZOOM_METERS[i] - this.currentZoomMeters);
      if (diff < minDiff) {
        minDiff = diff;
        bestIdx = i;
      }
    }
    this.config.zoomLevelIndex = bestIdx;
  }

  /**
   * Toggles between North-Up (fixed north) and Compass-Mode (rotates with player heading)
   */
  public toggleCompassMode(): void {
    this.config.compassMode = !this.config.compassMode;
    this.updateHUDIndicators();
  }

  /**
   * Toggles building footprints overlay
   */
  public toggleBuildings(): void {
    this.config.showBuildings = !this.config.showBuildings;
    this.updateHUDIndicators();
  }

  /**
   * Toggles compass rose and cardinal markers
   */
  public toggleCompassRose(): void {
    this.config.showCompassRose = !this.config.showCompassRose;
    this.updateHUDIndicators();
  }

  /**
   * Cycles through opacity presets
   */
  public cycleOpacity(): void {
    const presets = [1.0, 0.85, 0.65, 0.4, 0.2];
    const curIdx = presets.indexOf(this.config.opacity);
    const nextIdx = (curIdx + 1) % presets.length;
    this.applyOpacity(presets[nextIdx]);
  }

  public adjustOpacity(delta: number): void {
    const next = Math.max(0.15, Math.min(1.0, Math.round((this.config.opacity + delta) * 100) / 100));
    this.applyOpacity(next);
  }

  public applyOpacity(opacity: number): void {
    this.config.opacity = opacity;
    document.documentElement.style.setProperty('--minimap-opacity', opacity.toString());
  }

  private updateHUDIndicators(): void {
    try {
      const zoomText =
        this.currentZoomMeters >= 1000
          ? `${(this.currentZoomMeters / 1000).toFixed(1)}KM`
          : `${Math.round(this.currentZoomMeters)}M`;

      if (this.zoomBtn) {
        this.zoomBtn.textContent = zoomText;
      }
      if (this.compassBtn) {
        this.compassBtn.classList.toggle('active', this.config.compassMode);
      }
      if (this.bldgBtn) {
        this.bldgBtn.classList.toggle('active', this.config.showBuildings);
      }
      if (this.infoBadge) {
        const modeText = this.config.compassMode ? 'ROT' : 'N-UP';
        const terrName = this.currentRegionName;
        this.infoBadge.textContent = `${terrName} · ${zoomText} · ${modeText}`;
      }
    } catch (err) {
      console.error('[MinimapSystem] Error updating HUD indicators:', err);
    }
  }

  /**
   * Main Minimap Render Loop
   */
  public render(
    playerX: number,
    playerZ: number,
    playerHeading: number,
    _cameraZoomDist: number,
    remotePlayers: Map<string, CowboyCharacter>
  ): void {
    this.lastRenderedPlayerX = playerX;
    this.lastRenderedPlayerZ = playerZ;

    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const cx = w / 2;
    const cy = h / 2;

    ctx.save();
    ctx.clearRect(0, 0, w, h);

    // 1. Squircle Clip (14px rounded rectangle)
    ctx.beginPath();
    if (typeof (ctx as any).roundRect === 'function') {
      (ctx as any).roundRect(0, 0, w, h, 14);
    } else {
      ctx.rect(0, 0, w, h);
    }
    ctx.clip();

    // 2. Base Parchment Background (Warm frontier map tone to prevent any black edges)
    ctx.fillStyle = '#d3b791';
    ctx.fillRect(0, 0, w, h);

    // Effective center (incorporates interactive drag pan)
    const effectiveX = playerX + this.panOffsetX;
    const effectiveZ = playerZ + this.panOffsetZ;

    this.updateCurrentRegionName(effectiveX, effectiveZ);

    const visibleMeters = this.currentZoomMeters;
    const pixelsPerMeter = w / visibleMeters;

    // Rotation
    const mapRotation = this.config.compassMode ? playerHeading - Math.PI : 0;

    // 3. Render World Map in Center Space (GLOBAL MAP MANDATE)
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(mapRotation);

    // GLOBAL MAP MANDATE: Complete RDO Global Map is ALWAYS rendered as base texture
    if (this.globalMapLoaded && this.globalMapImage) {
      const totalWidthMeters = this.globalMaxX - this.globalMinX; // 9900m
      const totalHeightMeters = this.globalMaxZ - this.globalMinZ; // 6500m

      const pxX = ((effectiveX - this.globalMinX) / totalWidthMeters) * this.globalWidth;
      const pxY = ((this.globalMaxZ - effectiveZ) / totalHeightMeters) * this.globalHeight;

      const scale = (w / visibleMeters) * (totalWidthMeters / this.globalWidth);

      ctx.save();
      ctx.scale(scale, scale);

      // Clamp-to-edge: draw clamped border skirts so if view exceeds map bounds it doesn't show black
      // Bottom edge skirt (using South map border color #d3b791)
      ctx.fillStyle = '#d3b791';
      ctx.fillRect(-pxX - 4000, -pxY + this.globalHeight, this.globalWidth + 8000, 4000);
      // Top edge skirt (pale glacier blue-grey #497ab1)
      ctx.fillStyle = '#497ab1';
      ctx.fillRect(-pxX - 4000, -pxY - 4000, this.globalWidth + 8000, 4000);
      // Left edge skirt
      ctx.fillStyle = '#d3b791';
      ctx.fillRect(-pxX - 4000, -pxY, 4000, this.globalHeight);
      // Right edge skirt
      ctx.fillRect(-pxX + this.globalWidth, -pxY, 4000, this.globalHeight);

      // Draw Main Global Complete Map
      ctx.drawImage(this.globalMapImage, -pxX, -pxY);
      ctx.restore();
    } else {
      this.drawProceduralFallback(ctx, effectiveX, effectiveZ, pixelsPerMeter);
    }

    // Optional Local Overlay: Detailed Valentine map ONLY as an overlay when close and in Valentine
    const isNearValentine = Math.hypot(effectiveX - (-300.0), effectiveZ - 750.0) < 650.0;
    if (isNearValentine && visibleMeters <= 250 && this.detailedMapLoaded && this.detailedMapImage) {
      const imgScale = pixelsPerMeter * this.detailedMetersPerPx;
      const playerPx = this.detailedCenterX + effectiveX / this.detailedMetersPerPx;
      const playerPy = this.detailedCenterY + effectiveZ / this.detailedMetersPerPx;

      ctx.save();
      ctx.globalAlpha = 0.92;
      ctx.scale(imgScale, imgScale);
      ctx.drawImage(this.detailedMapImage, -playerPx, -playerPy);
      ctx.restore();
    }

    // 4. Overlays: Building footprints (at close to mid zoom)
    if (this.config.showBuildings && visibleMeters < 800 && valentineData?.buildings) {
      for (const bldg of valentineData.buildings) {
        const bx = bldg.pos[0];
        const bz = bldg.pos[1];
        const dx = (bx - effectiveX) * pixelsPerMeter;
        const dy = (bz - effectiveZ) * pixelsPerMeter;

        if (Math.abs(dx) < w * 0.9 && Math.abs(dy) < h * 0.9) {
          const bw = bldg.size[0] * pixelsPerMeter;
          const bd = bldg.size[2] * pixelsPerMeter;
          ctx.save();
          ctx.translate(dx, dy);
          ctx.rotate(bldg.rotY);
          ctx.fillStyle = 'rgba(196, 154, 76, 0.22)';
          ctx.strokeStyle = 'rgba(235, 195, 110, 0.75)';
          ctx.lineWidth = 1;
          ctx.fillRect(-bw / 2, -bd / 2, bw, bd);
          ctx.strokeRect(-bw / 2, -bd / 2, bw, bd);
          ctx.restore();
        }
      }
    }

    // 5. Local POI Markers & Icons (Valentine Town Points)
    if (visibleMeters <= 500) {
      for (const poi of pois) {
        const px = poi.x * ValentineCity.SCALE;
        const pz = poi.y * ValentineCity.SCALE;
        const dx = (px - effectiveX) * pixelsPerMeter;
        const dy = (pz - effectiveZ) * pixelsPerMeter;

        if (Math.hypot(dx, dy) < w * 0.85) {
          ctx.save();
          ctx.translate(dx, dy);
          ctx.fillStyle = '#d4af37';
          ctx.beginPath();
          ctx.arc(0, 0, 3.5, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = '#221910';
          ctx.lineWidth = 1.2;
          ctx.stroke();

          if (visibleMeters <= 200) {
            ctx.fillStyle = '#f5ecd8';
            ctx.font = 'bold 9px "Cinzel", Georgia, serif';
            ctx.textAlign = 'center';
            ctx.shadowColor = 'rgba(0,0,0,0.8)';
            ctx.shadowBlur = 3;
            ctx.fillText(poi.name, 0, -6);
          }
          ctx.restore();
        }
      }
    }

    // 5b. Global Town & Fast-Travel Waypoints (Validated Ground-Truth Positions)
    if (visibleMeters >= 400 && fastTravelPointsJson) {
      for (const ft of (fastTravelPointsJson as unknown as Array<{ name: string; three_pos: [number, number, number] }>)) {
        const ftx = ft.three_pos[0];
        const ftz = ft.three_pos[2];
        const dx = (ftx - effectiveX) * pixelsPerMeter;
        const dy = (ftz - effectiveZ) * pixelsPerMeter;

        if (Math.hypot(dx, dy) < w * 0.9) {
          ctx.save();
          ctx.translate(dx, dy);
          ctx.fillStyle = '#f59e0b';
          ctx.beginPath();
          ctx.arc(0, 0, 4.0, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = '#18120c';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 10px "Cinzel", Georgia, serif';
          ctx.textAlign = 'center';
          ctx.shadowColor = 'rgba(0,0,0,0.9)';
          ctx.shadowBlur = 4;
          ctx.fillText(ft.name, 0, -7);
          ctx.restore();
        }
      }
    }

    // 6. Remote Players
    for (const [, remote] of remotePlayers) {
      const rPos = remote.root.position;
      const rdx = (rPos.x - effectiveX) * pixelsPerMeter;
      const rdz = (rPos.z - effectiveZ) * pixelsPerMeter;

      if (Math.hypot(rdx, rdz) < w * 0.8) {
        ctx.save();
        ctx.translate(rdx, rdz);
        ctx.fillStyle = '#60a5fa';
        ctx.beginPath();
        ctx.arc(0, 0, 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    ctx.restore(); // Restore rotated world space

    // 7. Local Player Marker (Center Arrow / Blip)
    // Offset from screen center if user panned
    const playerScreenX = cx - this.panOffsetX * pixelsPerMeter;
    const playerScreenY = cy - this.panOffsetZ * pixelsPerMeter;

    ctx.save();
    ctx.translate(playerScreenX, playerScreenY);

    if (this.config.compassMode) {
      // In compass mode, player points straight UP (0 rad)
      ctx.rotate(0);
    } else {
      // In North-Up mode, player points in heading direction
      // Heading: PI = North (-Y in screen space)
      ctx.rotate(-(playerHeading - Math.PI));
    }

    // White player arrow with drop shadow
    ctx.shadowColor = 'rgba(0,0,0,0.7)';
    ctx.shadowBlur = 4;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(0, -9);
    ctx.lineTo(6, 6);
    ctx.lineTo(0, 3);
    ctx.lineTo(-6, 6);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#bf2a2a';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.restore();

    // 8. Compass Cardinal Rose (N, E, S, W)
    if (this.config.showCompassRose) {
      this.drawCompassRose(ctx, w, h, mapRotation);
    }

    // 9. Western Brass Frame Border
    ctx.strokeStyle = '#c49a4c';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    ctx.restore();
  }

  private drawCompassRose(ctx: CanvasRenderingContext2D, w: number, h: number, mapRotation: number): void {
    const radius = w * 0.44;
    const cx = w / 2;
    const cy = h / 2;
    const cardinals = [
      { text: 'N', angle: 0, color: '#e04040' },
      { text: 'E', angle: Math.PI / 2, color: '#d4af37' },
      { text: 'S', angle: Math.PI, color: '#d4af37' },
      { text: 'W', angle: -Math.PI / 2, color: '#d4af37' }
    ];

    ctx.save();
    ctx.font = 'bold 10px "Cinzel", Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (const card of cardinals) {
      const effAngle = card.angle + mapRotation;
      const x = cx + Math.sin(effAngle) * radius;
      const y = cy - Math.cos(effAngle) * radius;

      ctx.fillStyle = card.color;
      ctx.shadowColor = 'rgba(0,0,0,0.85)';
      ctx.shadowBlur = 3;
      ctx.fillText(card.text, x, y);
    }
    ctx.restore();
  }

  private drawProceduralFallback(
    ctx: CanvasRenderingContext2D,
    px: number,
    pz: number,
    pixelsPerMeter: number
  ): void {
    // Subtle grid lines
    ctx.strokeStyle = 'rgba(180, 140, 70, 0.12)';
    ctx.lineWidth = 1;
    const gridSize = 25 * pixelsPerMeter;
    const offsetX = (-px * pixelsPerMeter) % gridSize;
    const offsetY = (-pz * pixelsPerMeter) % gridSize;

    for (let x = -200 + offsetX; x <= 200; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, -200);
      ctx.lineTo(x, 200);
      ctx.stroke();
    }
    for (let y = -200 + offsetY; y <= 200; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(-200, y);
      ctx.lineTo(200, y);
      ctx.stroke();
    }
  }

  /**
   * Dynamically determines region / settlement name from in-game coordinates.
   */
  private updateCurrentRegionName(gx: number, gz: number): void {
    if (Math.hypot(gx - (-300.0), gz - 750.0) < 650.0) {
      this.currentRegionName = 'VALENTINE';
    } else if (Math.hypot(gx - 2667.0, gz - (-1467.0)) < 850.0) {
      this.currentRegionName = 'SAINT DENIS';
    } else if (Math.hypot(gx - (-744.0), gz - (-1247.0)) < 650.0) {
      this.currentRegionName = 'BLACKWATER';
    } else if (Math.hypot(gx - 1247.0, gz - (-1292.0)) < 550.0) {
      this.currentRegionName = 'RHODES';
    } else if (Math.hypot(gx - (-1738.0), gz - (-414.0)) < 550.0) {
      this.currentRegionName = 'STRAWBERRY';
    } else if (Math.hypot(gx - 2928.0, gz - 1296.0)) {
      if (Math.hypot(gx - 2928.0, gz - 1296.0) < 550.0) {
        this.currentRegionName = 'ANNESBURG';
        return;
      }
    }
    
    if (Math.hypot(gx - (-3726.0), gz - (-2628.0)) < 550.0) {
      this.currentRegionName = 'ARMADILLO';
    } else if (Math.hypot(gx - (-5442.0), gz - (-2946.0)) < 550.0) {
      this.currentRegionName = 'TUMBLEWEED';
    } else if (Math.hypot(gx - 1515.0, gz - 438.0) < 500.0) {
      this.currentRegionName = 'EMERALD RANCH';
    } else if (gx < -2000.0 && gz < -1000.0) {
      this.currentRegionName = 'NEW AUSTIN';
    } else if (gz > 1700.0) {
      this.currentRegionName = 'AMBARINO';
    } else if (gx > 1600.0 && gz < -600.0) {
      this.currentRegionName = 'LEMOYNE';
    } else {
      this.currentRegionName = this.currentZoomMeters > 1500 ? 'RDO WORLD' : 'NEW HANOVER';
    }
  }
}
