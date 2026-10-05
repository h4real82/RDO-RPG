import * as THREE from 'three';

export interface PBRTextureSet {
  diffuse: THREE.Texture;
  albedo: THREE.Texture; // Poly Haven / ambientCG standard alias
  normal: THREE.Texture;
  roughness: THREE.Texture;
  ao?: THREE.Texture;
}

export interface PBRAssetConfig {
  albedo?: string;
  diffuse?: string;
  normal?: string;
  roughness?: string;
  ao?: string;
  repeatX?: number;
  repeatY?: number;
}

/**
 * PBR Texture System & Asset Pipeline
 * Standard CC0 PBR maps (ambientCG / Poly Haven standard: Albedo/Color, Normal, Roughness, AO)
 * with instant, high-performance canvas fallbacks (no CPU-blocking synchronous pixel loops).
 */
export class TextureGenerator {
  private static cache: Map<string, THREE.Texture> = new Map();
  private static textureLoader = new THREE.TextureLoader();

  /**
   * CC0 PBR Asset Registry (ambientCG & Poly Haven standard).
   * Map keys to local paths in /assets/pbr/ or external CDN URLs.
   */
  public static readonly PBR_MANIFEST: Record<string, PBRAssetConfig> = {
    mud_street: {},
    ground: {},
    wood_dark: {},
    wood_honey: {},
    boardwalk: {},
    roof_shingles: {},
    corrugated_metal: {},
    red_brick: {},
    clapboard_sage_green: {},
    clapboard_aged_white: {}
  };

  /**
   * Allows runtime registration or CDN path assignment for ambientCG / Poly Haven texture sets
   */
  public static setPBRSource(key: string, config: PBRAssetConfig) {
    this.PBR_MANIFEST[key] = { ...this.PBR_MANIFEST[key], ...config };
  }

  /**
   * Helper to load an external image texture with standard repeat wrapping & color space
   */
  public static loadExternalTexture(
    url: string,
    repeatX: number = 1,
    repeatY: number = 1,
    isSRGB: boolean = false
  ): THREE.Texture {
    if (this.cache.has(url)) {
      return this.cache.get(url)!;
    }
    const tex = this.textureLoader.load(url);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeatX, repeatY);
    if (isSRGB) {
      tex.colorSpace = THREE.SRGBColorSpace;
    }
    this.cache.set(url, tex);
    return tex;
  }

  /**
   * Helper to create canvas textures with full RepeatWrapping and LinearMipmapLinearFilter
   */
  public static createCanvasTexture(canvas: HTMLCanvasElement, isSRGB: boolean = false): THREE.CanvasTexture {
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.generateMipmaps = true;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.magFilter = THREE.LinearFilter;
    if (isSRGB) {
      tex.colorSpace = THREE.SRGBColorSpace;
    }
    return tex;
  }

  /**
   * Creates an ultra-fast neutral normal map (flat tangent-space #8080ff)
   */
  public static createNeutralNormalTexture(): THREE.Texture {
    const key = '__neutral_normal__';
    if (this.cache.has(key)) return this.cache.get(key)!;

    const canvas = document.createElement('canvas');
    canvas.width = 4;
    canvas.height = 4;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#8080ff';
    ctx.fillRect(0, 0, 4, 4);

    const tex = this.createCanvasTexture(canvas, false);
    this.cache.set(key, tex);
    return tex;
  }

  /**
   * Creates an ultra-fast uniform roughness texture
   */
  public static createNeutralRoughnessTexture(val: number = 0.7): THREE.Texture {
    const key = `__neutral_rough_${val}__`;
    if (this.cache.has(key)) return this.cache.get(key)!;

    const canvas = document.createElement('canvas');
    canvas.width = 4;
    canvas.height = 4;
    const ctx = canvas.getContext('2d')!;
    const gray = Math.floor(Math.max(0, Math.min(1, val)) * 255);
    ctx.fillStyle = `rgb(${gray},${gray},${gray})`;
    ctx.fillRect(0, 0, 4, 4);

    const tex = this.createCanvasTexture(canvas, false);
    this.cache.set(key, tex);
    return tex;
  }

  /**
   * Generates a tangent-space normal map from a grayscale height canvas
   * Optimized for lightweight resolution tiles.
   */
  public static createNormalMapFromHeight(
    heightCtx: CanvasRenderingContext2D,
    width: number,
    height: number,
    strength: number = 2.5
  ): HTMLCanvasElement {
    const normalCanvas = document.createElement('canvas');
    normalCanvas.width = width;
    normalCanvas.height = height;
    const normalCtx = normalCanvas.getContext('2d')!;

    const srcImg = heightCtx.getImageData(0, 0, width, height);
    const srcData = srcImg.data;
    const dstImg = normalCtx.createImageData(width, height);
    const dstData = dstImg.data;

    const getHeight = (x: number, y: number): number => {
      const px = (x + width) % width;
      const py = (y + height) % height;
      const idx = (py * width + px) * 4;
      return (srcData[idx] + srcData[idx + 1] + srcData[idx + 2]) / (3 * 255);
    };

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const tl = getHeight(x - 1, y - 1);
        const l  = getHeight(x - 1, y);
        const bl = getHeight(x - 1, y + 1);
        const t  = getHeight(x, y - 1);
        const b  = getHeight(x, y + 1);
        const tr = getHeight(x + 1, y - 1);
        const r  = getHeight(x + 1, y);
        const br = getHeight(x + 1, y + 1);

        const dX = (tr + 2.0 * r + br) - (tl + 2.0 * l + bl);
        const dY = (bl + 2.0 * b + br) - (tl + 2.0 * t + tr);

        let nx = -dX * strength;
        let ny = -dY * strength;
        let nz = 1.0;

        const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
        nx /= len;
        ny /= len;
        nz /= len;

        const idx = (y * width + x) * 4;
        dstData[idx]     = Math.floor(((nx * 0.5) + 0.5) * 255);
        dstData[idx + 1] = Math.floor(((ny * 0.5) + 0.5) * 255);
        dstData[idx + 2] = Math.floor(((nz * 0.5) + 0.5) * 255);
        dstData[idx + 3] = 255;
      }
    }

    normalCtx.putImageData(dstImg, 0, 0);
    return normalCanvas;
  }

  /**
   * Helper to resolve configured PBR set or invoke fast procedural fallback
   */
  public static resolvePBRSet(
    manifestKey: string,
    defaultRepeats: { x: number; y: number },
    fallbackGenerator: () => PBRTextureSet
  ): PBRTextureSet {
    const entry = this.PBR_MANIFEST[manifestKey];
    const colorUrl = entry?.albedo || entry?.diffuse;
    if (colorUrl) {
      const rx = entry.repeatX ?? defaultRepeats.x;
      const ry = entry.repeatY ?? defaultRepeats.y;
      const diffuse = this.loadExternalTexture(colorUrl, rx, ry, true);
      const normal = entry.normal
        ? this.loadExternalTexture(entry.normal, rx, ry, false)
        : this.createNeutralNormalTexture();
      const roughness = entry.roughness
        ? this.loadExternalTexture(entry.roughness, rx, ry, false)
        : this.createNeutralRoughnessTexture(0.7);
      const ao = entry.ao ? this.loadExternalTexture(entry.ao, rx, ry, false) : undefined;
      return { diffuse, albedo: diffuse, normal, roughness, ao };
    }
    return fallbackGenerator();
  }

  /**
   * PBR Textures for Western Dirt & Prairie Grass
   * Fast, lightweight 256x256 procedural fallback tile with organic soil tones.
   */
  public static getGroundTextures(): PBRTextureSet {
    return this.resolvePBRSet('ground', { x: 12, y: 8 }, () => {
      const key = 'ground_pbr_fast';
      if (this.cache.has(`${key}_diffuse`)) {
        const diff = this.cache.get(`${key}_diffuse`)!;
        return {
          diffuse: diff,
          albedo: diff,
          normal: this.cache.get(`${key}_normal`)!,
          roughness: this.cache.get(`${key}_roughness`)!
        };
      }

      const size = 256;
      const diffCanvas = document.createElement('canvas');
      diffCanvas.width = size;
      diffCanvas.height = size;
      const diffCtx = diffCanvas.getContext('2d')!;

      const heightCanvas = document.createElement('canvas');
      heightCanvas.width = size;
      heightCanvas.height = size;
      const heightCtx = heightCanvas.getContext('2d')!;

      // Base warm ochre soil
      diffCtx.fillStyle = '#8a6845';
      diffCtx.fillRect(0, 0, size, size);

      heightCtx.fillStyle = '#808080';
      heightCtx.fillRect(0, 0, size, size);

      // Fast layered stipple & organic grain
      for (let i = 0; i < 600; i++) {
        const x = Math.random() * size;
        const y = Math.random() * size;
        const r = 2 + Math.random() * 4;
        diffCtx.fillStyle = Math.random() > 0.5 ? 'rgba(110, 80, 50, 0.35)' : 'rgba(160, 130, 90, 0.3)';
        diffCtx.beginPath();
        diffCtx.arc(x, y, r, 0, Math.PI * 2);
        diffCtx.fill();

        heightCtx.fillStyle = Math.random() > 0.5 ? 'rgba(60, 60, 60, 0.3)' : 'rgba(200, 200, 200, 0.3)';
        heightCtx.beginPath();
        heightCtx.arc(x, y, r, 0, Math.PI * 2);
        heightCtx.fill();
      }

      const normalCanvas = this.createNormalMapFromHeight(heightCtx, size, size, 2.0);

      const diffTex = this.createCanvasTexture(diffCanvas, true);
      diffTex.repeat.set(12, 8);

      const normalTex = this.createCanvasTexture(normalCanvas, false);
      normalTex.repeat.set(12, 8);

      const roughTex = this.createNeutralRoughnessTexture(0.85);

      this.cache.set(`${key}_diffuse`, diffTex);
      this.cache.set(`${key}_normal`, normalTex);
      this.cache.set(`${key}_roughness`, roughTex);

      return { diffuse: diffTex, albedo: diffTex, normal: normalTex, roughness: roughTex };
    });
  }

  /**
   * PBR Muddy Churned Frontier Street
   * High performance 256x256 fallback with wagon ruts and wet mud sheen.
   */
  public static getMuddyStreetTextures(): PBRTextureSet {
    return this.resolvePBRSet('mud_street', { x: 16, y: 10 }, () => {
      const key = 'mud_street_pbr_fast';
      if (this.cache.has(`${key}_diffuse`)) {
        const diff = this.cache.get(`${key}_diffuse`)!;
        return {
          diffuse: diff,
          albedo: diff,
          normal: this.cache.get(`${key}_normal`)!,
          roughness: this.cache.get(`${key}_roughness`)!
        };
      }

      const size = 256;
      const diffCanvas = document.createElement('canvas');
      diffCanvas.width = size;
      diffCanvas.height = size;
      const diffCtx = diffCanvas.getContext('2d')!;

      const heightCanvas = document.createElement('canvas');
      heightCanvas.width = size;
      heightCanvas.height = size;
      const heightCtx = heightCanvas.getContext('2d')!;

      // Dark frontier loam / mud
      diffCtx.fillStyle = '#483525';
      diffCtx.fillRect(0, 0, size, size);

      heightCtx.fillStyle = '#808080';
      heightCtx.fillRect(0, 0, size, size);

      // Longitudinal wagon ruts
      for (const rutY of [48, 80, 160, 192]) {
        diffCtx.fillStyle = 'rgba(28, 18, 12, 0.6)';
        diffCtx.fillRect(0, rutY - 8, size, 16);

        heightCtx.fillStyle = '#404040';
        heightCtx.fillRect(0, rutY - 8, size, 16);

        // Wet rut reflection highlights
        diffCtx.fillStyle = 'rgba(70, 52, 38, 0.4)';
        diffCtx.fillRect(0, rutY - 2, size, 4);
      }

      // Soil texture spots
      for (let i = 0; i < 400; i++) {
        const x = Math.random() * size;
        const y = Math.random() * size;
        const rad = 1.5 + Math.random() * 3;
        diffCtx.fillStyle = Math.random() > 0.5 ? 'rgba(30, 20, 12, 0.4)' : 'rgba(90, 68, 48, 0.3)';
        diffCtx.beginPath();
        diffCtx.arc(x, y, rad, 0, Math.PI * 2);
        diffCtx.fill();
      }

      const normalCanvas = this.createNormalMapFromHeight(heightCtx, size, size, 2.5);

      const diffTex = this.createCanvasTexture(diffCanvas, true);
      diffTex.repeat.set(16, 10);

      const normalTex = this.createCanvasTexture(normalCanvas, false);
      normalTex.repeat.set(16, 10);

      const roughTex = this.createNeutralRoughnessTexture(0.68);

      this.cache.set(`${key}_diffuse`, diffTex);
      this.cache.set(`${key}_normal`, normalTex);
      this.cache.set(`${key}_roughness`, roughTex);

      return { diffuse: diffTex, albedo: diffTex, normal: normalTex, roughness: roughTex };
    });
  }

  /**
   * Weathered Wood Planks (Buildings, Boardwalks, Porches)
   */
  public static getWoodPlankTextures(variant: 'dark_cedar' | 'honey_pine' | 'boardwalk' = 'dark_cedar'): PBRTextureSet {
    const manifestKey = variant === 'dark_cedar' ? 'wood_dark' : variant === 'honey_pine' ? 'wood_honey' : 'boardwalk';
    return this.resolvePBRSet(manifestKey, { x: 2, y: 2 }, () => this.generateFastWoodPlank(variant));
  }

  private static generateFastWoodPlank(variant: 'dark_cedar' | 'honey_pine' | 'boardwalk'): PBRTextureSet {
    const key = `wood_fast_${variant}`;
    if (this.cache.has(`${key}_diffuse`)) {
      const diff = this.cache.get(`${key}_diffuse`)!;
      return {
        diffuse: diff,
        albedo: diff,
        normal: this.cache.get(`${key}_normal`)!,
        roughness: this.cache.get(`${key}_roughness`)!
      };
    }

    const width = 256;
    const height = 256;
    const diffCanvas = document.createElement('canvas');
    diffCanvas.width = width;
    diffCanvas.height = height;
    const diffCtx = diffCanvas.getContext('2d')!;

    const heightCanvas = document.createElement('canvas');
    heightCanvas.width = width;
    heightCanvas.height = height;
    const heightCtx = heightCanvas.getContext('2d')!;

    let baseHex = '#6e4c30';
    let seamHex = '#24170e';
    if (variant === 'honey_pine') {
      baseHex = '#946a3d';
      seamHex = '#422c18';
    } else if (variant === 'boardwalk') {
      baseHex = '#7d5e42';
      seamHex = '#342416';
    }

    diffCtx.fillStyle = baseHex;
    diffCtx.fillRect(0, 0, width, height);

    heightCtx.fillStyle = '#808080';
    heightCtx.fillRect(0, 0, width, height);

    const plankHeight = 32;
    const plankCount = height / plankHeight;

    for (let i = 0; i < plankCount; i++) {
      const y = i * plankHeight;
      const toneShift = (Math.random() - 0.5) * 20;
      diffCtx.fillStyle = `rgba(0,0,0, ${Math.abs(toneShift) * 0.015})`;
      diffCtx.fillRect(0, y, width, plankHeight);

      // Wood grain lines
      diffCtx.strokeStyle = 'rgba(20, 10, 5, 0.25)';
      diffCtx.lineWidth = 1;
      for (let g = 0; g < 4; g++) {
        const gy = y + 4 + g * 6;
        diffCtx.beginPath();
        diffCtx.moveTo(0, gy);
        diffCtx.lineTo(width, gy);
        diffCtx.stroke();
      }

      // Plank seam groove
      diffCtx.fillStyle = seamHex;
      diffCtx.fillRect(0, y + plankHeight - 2, width, 2);

      heightCtx.fillStyle = '#202020';
      heightCtx.fillRect(0, y + plankHeight - 2, width, 2);

      // Nails
      for (let nx = 32; nx < width; nx += 96) {
        diffCtx.fillStyle = '#1a1a1a';
        diffCtx.beginPath();
        diffCtx.arc(nx, y + plankHeight / 2, 2, 0, Math.PI * 2);
        diffCtx.fill();

        heightCtx.fillStyle = '#d0d0d0';
        heightCtx.beginPath();
        heightCtx.arc(nx, y + plankHeight / 2, 2, 0, Math.PI * 2);
        heightCtx.fill();
      }
    }

    const normalCanvas = this.createNormalMapFromHeight(heightCtx, width, height, 2.5);

    const diffTex = this.createCanvasTexture(diffCanvas, true);
    const normalTex = this.createCanvasTexture(normalCanvas, false);

    const roughTex = this.createNeutralRoughnessTexture(0.76);

    this.cache.set(`${key}_diffuse`, diffTex);
    this.cache.set(`${key}_normal`, normalTex);
    this.cache.set(`${key}_roughness`, roughTex);

    return { diffuse: diffTex, albedo: diffTex, normal: normalTex, roughness: roughTex };
  }

  /**
   * PBR Textures for Railroad Gravel Ballast Bed (Schotterbett)
   * Dark coarse gravel, crushed basalt rock and limestone with gritty normal map.
   */
  public static getBallastTextures(): PBRTextureSet {
    return this.resolvePBRSet('ballast_gravel', { x: 4, y: 16 }, () => {
      const key = 'ballast_gravel_fast';
      if (this.cache.has(`${key}_diffuse`)) {
        const diff = this.cache.get(`${key}_diffuse`)!;
        return {
          diffuse: diff,
          albedo: diff,
          normal: this.cache.get(`${key}_normal`)!,
          roughness: this.cache.get(`${key}_roughness`)!
        };
      }

      const size = 256;
      const diffCanvas = document.createElement('canvas');
      diffCanvas.width = size;
      diffCanvas.height = size;
      const diffCtx = diffCanvas.getContext('2d')!;

      const heightCanvas = document.createElement('canvas');
      heightCanvas.width = size;
      heightCanvas.height = size;
      const heightCtx = heightCanvas.getContext('2d')!;

      // Base dark charcoal / crushed stone
      diffCtx.fillStyle = '#2d2a27';
      diffCtx.fillRect(0, 0, size, size);

      heightCtx.fillStyle = '#606060';
      heightCtx.fillRect(0, 0, size, size);

      // Procedural gravel pebbles with organic color variations
      for (let i = 0; i < 900; i++) {
        const x = Math.random() * size;
        const y = Math.random() * size;
        const rx = 2 + Math.random() * 4;
        const ry = 2 + Math.random() * 3;
        const shade = Math.random();
        let color = '#3b3834';
        let hColor = '#808080';
        if (shade > 0.7) {
          color = '#4a4642';
          hColor = '#b0b0b0';
        } else if (shade < 0.3) {
          color = '#1f1d1b';
          hColor = '#404040';
        }

        diffCtx.fillStyle = color;
        diffCtx.beginPath();
        diffCtx.ellipse(x, y, rx, ry, Math.random() * Math.PI, 0, Math.PI * 2);
        diffCtx.fill();

        heightCtx.fillStyle = hColor;
        heightCtx.beginPath();
        heightCtx.ellipse(x, y, rx, ry, Math.random() * Math.PI, 0, Math.PI * 2);
        heightCtx.fill();
      }

      const normalCanvas = this.createNormalMapFromHeight(heightCtx, size, size, 3.2);

      const diffTex = this.createCanvasTexture(diffCanvas, true);
      diffTex.repeat.set(4, 16);

      const normalTex = this.createCanvasTexture(normalCanvas, false);
      normalTex.repeat.set(4, 16);

      const roughTex = this.createNeutralRoughnessTexture(0.92);

      this.cache.set(`${key}_diffuse`, diffTex);
      this.cache.set(`${key}_normal`, normalTex);
      this.cache.set(`${key}_roughness`, roughTex);

      return { diffuse: diffTex, albedo: diffTex, normal: normalTex, roughness: roughTex };
    });
  }

  /**
   * Authentic Weathered Old Wood / Boardwalk Timber (Altholz)
   * High-contrast weathered silver-grey timber with deep grain cracks, nailheads and wear.
   */
  public static getAgedWoodTextures(): PBRTextureSet {
    const key = 'aged_wood_pbr';
    if (this.cache.has(`${key}_diffuse`)) {
      const diff = this.cache.get(`${key}_diffuse`)!;
      return {
        diffuse: diff,
        albedo: diff,
        normal: this.cache.get(`${key}_normal`)!,
        roughness: this.cache.get(`${key}_roughness`)!
      };
    }

    const size = 256;
    const diffCanvas = document.createElement('canvas');
    diffCanvas.width = size;
    diffCanvas.height = size;
    const diffCtx = diffCanvas.getContext('2d')!;

    const heightCanvas = document.createElement('canvas');
    heightCanvas.width = size;
    heightCanvas.height = size;
    const heightCtx = heightCanvas.getContext('2d')!;

    // Weathered silvered grey-brown timber base
    diffCtx.fillStyle = '#655749';
    diffCtx.fillRect(0, 0, size, size);

    heightCtx.fillStyle = '#7a7a7a';
    heightCtx.fillRect(0, 0, size, size);

    const plankH = 32;
    const count = size / plankH;

    for (let i = 0; i < count; i++) {
      const y = i * plankH;
      // Slight tone variations per plank
      const delta = Math.sin(i * 3.7) * 12;
      diffCtx.fillStyle = `rgba(${delta > 0 ? 255 : 0}, ${delta > 0 ? 255 : 0}, ${delta > 0 ? 255 : 0}, ${Math.abs(delta) * 0.01})`;
      diffCtx.fillRect(0, y, size, plankH);

      // Fine grain lines
      for (let g = 0; g < 6; g++) {
        const gy = y + 2 + g * 5;
        diffCtx.strokeStyle = 'rgba(30, 20, 14, 0.35)';
        diffCtx.lineWidth = 1;
        diffCtx.beginPath();
        diffCtx.moveTo(0, gy);
        diffCtx.lineTo(size, gy);
        diffCtx.stroke();
      }

      // Deep cracks / grain fissures
      for (let c = 0; c < 2; c++) {
        const cx1 = Math.random() * (size - 60);
        const cy1 = y + 4 + Math.random() * (plankH - 8);
        diffCtx.strokeStyle = '#221810';
        diffCtx.lineWidth = 1.5;
        diffCtx.beginPath();
        diffCtx.moveTo(cx1, cy1);
        diffCtx.lineTo(cx1 + 40 + Math.random() * 30, cy1 + (Math.random() - 0.5) * 4);
        diffCtx.stroke();

        heightCtx.strokeStyle = '#1a1a1a';
        heightCtx.lineWidth = 1.5;
        heightCtx.beginPath();
        heightCtx.moveTo(cx1, cy1);
        heightCtx.lineTo(cx1 + 40 + Math.random() * 30, cy1 + (Math.random() - 0.5) * 4);
        heightCtx.stroke();
      }

      // Plank seam groove
      diffCtx.fillStyle = '#281c13';
      diffCtx.fillRect(0, y + plankH - 2, size, 2);
      heightCtx.fillStyle = '#1e1e1e';
      heightCtx.fillRect(0, y + plankH - 2, size, 2);

      // Forged iron square nails on both ends
      for (const nx of [24, size - 24]) {
        diffCtx.fillStyle = '#1c1c1c';
        diffCtx.fillRect(nx - 2, y + 6, 4, 4);
        diffCtx.fillRect(nx - 2, y + plankH - 10, 4, 4);

        heightCtx.fillStyle = '#b0b0b0';
        heightCtx.fillRect(nx - 2, y + 6, 4, 4);
        heightCtx.fillRect(nx - 2, y + plankH - 10, 4, 4);
      }
    }

    const normalCanvas = this.createNormalMapFromHeight(heightCtx, size, size, 2.8);

    const diffTex = this.createCanvasTexture(diffCanvas, true);
    const normalTex = this.createCanvasTexture(normalCanvas, false);

    const roughTex = this.createNeutralRoughnessTexture(0.84);

    this.cache.set(`${key}_diffuse`, diffTex);
    this.cache.set(`${key}_normal`, normalTex);
    this.cache.set(`${key}_roughness`, roughTex);

    return { diffuse: diffTex, albedo: diffTex, normal: normalTex, roughness: roughTex };
  }

  /**
   * Weathered Red Barn Timber (Livery Stable)
   */
  public static getBarnRedWoodTextures(): PBRTextureSet {
    const key = 'barn_red_wood_pbr';
    if (this.cache.has(`${key}_diffuse`)) {
      const diff = this.cache.get(`${key}_diffuse`)!;
      return {
        diffuse: diff,
        albedo: diff,
        normal: this.cache.get(`${key}_normal`)!,
        roughness: this.cache.get(`${key}_roughness`)!
      };
    }

    const size = 256;
    const diffCanvas = document.createElement('canvas');
    diffCanvas.width = size;
    diffCanvas.height = size;
    const diffCtx = diffCanvas.getContext('2d')!;

    const heightCanvas = document.createElement('canvas');
    heightCanvas.width = size;
    heightCanvas.height = size;
    const heightCtx = heightCanvas.getContext('2d')!;

    // Dark Swedish / frontier barn red
    diffCtx.fillStyle = '#6b241c';
    diffCtx.fillRect(0, 0, size, size);

    heightCtx.fillStyle = '#808080';
    heightCtx.fillRect(0, 0, size, size);

    const plankH = 24;
    const count = size / plankH;
    for (let i = 0; i < count; i++) {
      const y = i * plankH;
      diffCtx.fillStyle = i % 2 === 0 ? '#742a21' : '#64211a';
      diffCtx.fillRect(0, y, size, plankH - 2);

      // Wood grain lines
      diffCtx.strokeStyle = 'rgba(40, 10, 8, 0.3)';
      diffCtx.lineWidth = 1;
      for (let g = 0; g < 3; g++) {
        const gy = y + 4 + g * 6;
        diffCtx.beginPath();
        diffCtx.moveTo(0, gy);
        diffCtx.lineTo(size, gy);
        diffCtx.stroke();
      }

      // Seam
      diffCtx.fillStyle = '#32100c';
      diffCtx.fillRect(0, y + plankH - 2, size, 2);
      heightCtx.fillStyle = '#202020';
      heightCtx.fillRect(0, y + plankH - 2, size, 2);
    }

    const normalCanvas = this.createNormalMapFromHeight(heightCtx, size, size, 2.4);

    const diffTex = this.createCanvasTexture(diffCanvas, true);
    diffTex.repeat.set(3, 3);

    const normalTex = this.createCanvasTexture(normalCanvas, false);
    normalTex.repeat.set(3, 3);

    const roughTex = this.createNeutralRoughnessTexture(0.8);

    this.cache.set(`${key}_diffuse`, diffTex);
    this.cache.set(`${key}_normal`, normalTex);
    this.cache.set(`${key}_roughness`, roughTex);

    return { diffuse: diffTex, albedo: diffTex, normal: normalTex, roughness: roughTex };
  }

  /**
   * High-detail western Saloon Signboard ("SMITHFIELD'S SALOON")
   */
  public static getSaloonSignTexture(): THREE.CanvasTexture {
    return this.createSignboardTexture(
      "SMITHFIELD'S SALOON",
      "FINE WINES, LIQUORS & BEER",
      '#26170d',
      '#f3dfba',
      true
    );
  }

  /**
   * Roof Shingle Texture
   */
  public static getRoofTextures(): PBRTextureSet {
    return this.resolvePBRSet('roof_shingles', { x: 4, y: 4 }, () => {
      const key = 'roof_shingles_fast';
      if (this.cache.has(`${key}_diffuse`)) {
        const diff = this.cache.get(`${key}_diffuse`)!;
        return {
          diffuse: diff,
          albedo: diff,
          normal: this.cache.get(`${key}_normal`)!,
          roughness: this.cache.get(`${key}_roughness`)!
        };
      }

      const size = 128;
      const diffCanvas = document.createElement('canvas');
      diffCanvas.width = size;
      diffCanvas.height = size;
      const diffCtx = diffCanvas.getContext('2d')!;

      const heightCanvas = document.createElement('canvas');
      heightCanvas.width = size;
      heightCanvas.height = size;
      const heightCtx = heightCanvas.getContext('2d')!;

      diffCtx.fillStyle = '#55493e';
      diffCtx.fillRect(0, 0, size, size);

      heightCtx.fillStyle = '#808080';
      heightCtx.fillRect(0, 0, size, size);

      const rowH = 16;
      const shingleW = 24;
      const rows = size / rowH;

      for (let r = 0; r < rows; r++) {
        const y = r * rowH;
        const xOffset = (r % 2) * (shingleW / 2);
        for (let x = -shingleW; x < size + shingleW; x += shingleW) {
          const sx = x + xOffset;
          diffCtx.fillStyle = (x + r) % 2 === 0 ? '#635345' : '#4d4136';
          diffCtx.fillRect(sx + 1, y + 1, shingleW - 2, rowH - 2);

          diffCtx.fillStyle = 'rgba(0,0,0,0.4)';
          diffCtx.fillRect(sx, y + rowH - 2, shingleW, 2);

          heightCtx.fillStyle = '#a0a0a0';
          heightCtx.fillRect(sx + 1, y + 1, shingleW - 2, rowH - 2);
          heightCtx.fillStyle = '#303030';
          heightCtx.fillRect(sx, y + rowH - 2, shingleW, 2);
        }
      }

      const normalCanvas = this.createNormalMapFromHeight(heightCtx, size, size, 2.6);

      const diffTex = this.createCanvasTexture(diffCanvas, true);
      diffTex.repeat.set(4, 4);

      const normalTex = this.createCanvasTexture(normalCanvas, false);
      normalTex.repeat.set(4, 4);

      const roughTex = this.createNeutralRoughnessTexture(0.85);

      this.cache.set(`${key}_diffuse`, diffTex);
      this.cache.set(`${key}_normal`, normalTex);
      this.cache.set(`${key}_roughness`, roughTex);

      return { diffuse: diffTex, albedo: diffTex, normal: normalTex, roughness: roughTex };
    });
  }

  /**
   * Weathered Corrugated Sheet Metal (Livery Barn roof)
   */
  public static getCorrugatedMetalTextures(): PBRTextureSet {
    return this.resolvePBRSet('corrugated_metal', { x: 4, y: 4 }, () => {
      const key = 'corrugated_metal_fast';
      if (this.cache.has(`${key}_diffuse`)) {
        const diff = this.cache.get(`${key}_diffuse`)!;
        return {
          diffuse: diff,
          albedo: diff,
          normal: this.cache.get(`${key}_normal`)!,
          roughness: this.cache.get(`${key}_roughness`)!
        };
      }

      const size = 128;
      const diffCanvas = document.createElement('canvas');
      diffCanvas.width = size;
      diffCanvas.height = size;
      const diffCtx = diffCanvas.getContext('2d')!;

      const heightCanvas = document.createElement('canvas');
      heightCanvas.width = size;
      heightCanvas.height = size;
      const heightCtx = heightCanvas.getContext('2d')!;

      diffCtx.fillStyle = '#657078';
      diffCtx.fillRect(0, 0, size, size);

      const corrugationPeriod = 16;
      for (let x = 0; x < size; x += corrugationPeriod) {
        const grad = diffCtx.createLinearGradient(x, 0, x + corrugationPeriod, 0);
        grad.addColorStop(0, '#555f66');
        grad.addColorStop(0.5, '#7d8a94');
        grad.addColorStop(1, '#555f66');
        diffCtx.fillStyle = grad;
        diffCtx.fillRect(x, 0, corrugationPeriod, size);

        const hGrad = heightCtx.createLinearGradient(x, 0, x + corrugationPeriod, 0);
        hGrad.addColorStop(0, '#303030');
        hGrad.addColorStop(0.5, '#e0e0e0');
        hGrad.addColorStop(1, '#303030');
        heightCtx.fillStyle = hGrad;
        heightCtx.fillRect(x, 0, corrugationPeriod, size);
      }

      const normalCanvas = this.createNormalMapFromHeight(heightCtx, size, size, 3.2);

      const diffTex = this.createCanvasTexture(diffCanvas, true);
      diffTex.repeat.set(4, 4);

      const normalTex = this.createCanvasTexture(normalCanvas, false);
      normalTex.repeat.set(4, 4);

      const roughTex = this.createNeutralRoughnessTexture(0.5);

      this.cache.set(`${key}_diffuse`, diffTex);
      this.cache.set(`${key}_normal`, normalTex);
      this.cache.set(`${key}_roughness`, roughTex);

      return { diffuse: diffTex, albedo: diffTex, normal: normalTex, roughness: roughTex };
    });
  }

  /**
   * Weathered Red Frontier Brick & Mortar (Sheriff Jail)
   */
  public static getRedBrickTextures(): PBRTextureSet {
    return this.resolvePBRSet('red_brick', { x: 4, y: 4 }, () => {
      const key = 'red_brick_fast';
      if (this.cache.has(`${key}_diffuse`)) {
        const diff = this.cache.get(`${key}_diffuse`)!;
        return {
          diffuse: diff,
          albedo: diff,
          normal: this.cache.get(`${key}_normal`)!,
          roughness: this.cache.get(`${key}_roughness`)!
        };
      }

      const size = 128;
      const diffCanvas = document.createElement('canvas');
      diffCanvas.width = size;
      diffCanvas.height = size;
      const diffCtx = diffCanvas.getContext('2d')!;

      const heightCanvas = document.createElement('canvas');
      heightCanvas.width = size;
      heightCanvas.height = size;
      const heightCtx = heightCanvas.getContext('2d')!;

      diffCtx.fillStyle = '#b8b2a5'; // Mortar
      diffCtx.fillRect(0, 0, size, size);

      heightCtx.fillStyle = '#404040';
      heightCtx.fillRect(0, 0, size, size);

      const brickH = 16;
      const brickW = 32;
      const rows = size / brickH;

      for (let r = 0; r < rows; r++) {
        const y = r * brickH;
        const xOffset = (r % 2) * (brickW / 2);
        for (let x = -brickW; x < size + brickW; x += brickW) {
          const bx = x + xOffset;
          diffCtx.fillStyle = (r + x) % 3 === 0 ? '#7a281c' : '#8e3526';
          diffCtx.fillRect(bx + 1, y + 1, brickW - 2, brickH - 2);

          heightCtx.fillStyle = '#c8c8c8';
          heightCtx.fillRect(bx + 1, y + 1, brickW - 2, brickH - 2);
        }
      }

      const normalCanvas = this.createNormalMapFromHeight(heightCtx, size, size, 2.8);

      const diffTex = this.createCanvasTexture(diffCanvas, true);
      diffTex.repeat.set(4, 4);

      const normalTex = this.createCanvasTexture(normalCanvas, false);
      normalTex.repeat.set(4, 4);

      const roughTex = this.createNeutralRoughnessTexture(0.82);

      this.cache.set(`${key}_diffuse`, diffTex);
      this.cache.set(`${key}_normal`, normalTex);
      this.cache.set(`${key}_roughness`, roughTex);

      return { diffuse: diffTex, albedo: diffTex, normal: normalTex, roughness: roughTex };
    });
  }

  /**
   * Weathered Painted Clapboard Siding (Doctor Clinic, Church)
   */
  public static getClapboardTextures(paintColor: 'sage_green' | 'aged_white' = 'aged_white'): PBRTextureSet {
    const manifestKey = paintColor === 'sage_green' ? 'clapboard_sage_green' : 'clapboard_aged_white';
    return this.resolvePBRSet(manifestKey, { x: 3, y: 3 }, () => {
      const key = `clapboard_fast_${paintColor}`;
      if (this.cache.has(`${key}_diffuse`)) {
        const diff = this.cache.get(`${key}_diffuse`)!;
        return {
          diffuse: diff,
          albedo: diff,
          normal: this.cache.get(`${key}_normal`)!,
          roughness: this.cache.get(`${key}_roughness`)!
        };
      }

      const size = 128;
      const diffCanvas = document.createElement('canvas');
      diffCanvas.width = size;
      diffCanvas.height = size;
      const diffCtx = diffCanvas.getContext('2d')!;

      const heightCanvas = document.createElement('canvas');
      heightCanvas.width = size;
      heightCanvas.height = size;
      const heightCtx = heightCanvas.getContext('2d')!;

      const baseHex = paintColor === 'sage_green' ? '#3c5243' : '#d2c9bd';
      diffCtx.fillStyle = baseHex;
      diffCtx.fillRect(0, 0, size, size);

      const plankH = 16;
      const count = size / plankH;

      for (let i = 0; i < count; i++) {
        const y = i * plankH;
        diffCtx.fillStyle = 'rgba(0, 0, 0, 0.35)';
        diffCtx.fillRect(0, y + plankH - 2, size, 2);

        diffCtx.fillStyle = 'rgba(255, 255, 255, 0.15)';
        diffCtx.fillRect(0, y, size, 1);

        const grad = heightCtx.createLinearGradient(0, y, 0, y + plankH);
        grad.addColorStop(0, '#505050');
        grad.addColorStop(0.9, '#c0c0c0');
        grad.addColorStop(1.0, '#303030');
        heightCtx.fillStyle = grad;
        heightCtx.fillRect(0, y, size, plankH);
      }

      const normalCanvas = this.createNormalMapFromHeight(heightCtx, size, size, 2.4);

      const diffTex = this.createCanvasTexture(diffCanvas, true);
      diffTex.repeat.set(3, 3);

      const normalTex = this.createCanvasTexture(normalCanvas, false);
      normalTex.repeat.set(3, 3);

      const roughTex = this.createNeutralRoughnessTexture(0.75);

      this.cache.set(`${key}_diffuse`, diffTex);
      this.cache.set(`${key}_normal`, normalTex);
      this.cache.set(`${key}_roughness`, roughTex);

      return { diffuse: diffTex, albedo: diffTex, normal: normalTex, roughness: roughTex };
    });
  }

  /**
   * Warm glowing window texture for taverns and shops
   */
  public static getWindowGlowTexture(): THREE.Texture {
    const key = 'window_glow_fast';
    if (this.cache.has(key)) return this.cache.get(key)!;

    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;

    const grad = ctx.createRadialGradient(64, 64, 10, 64, 64, 60);
    grad.addColorStop(0, '#fff2c2');
    grad.addColorStop(0.5, '#f5a623');
    grad.addColorStop(1, '#8b4513');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);

    ctx.fillStyle = '#22150d';
    ctx.fillRect(62, 0, 4, 128);
    ctx.fillRect(0, 62, 128, 4);
    ctx.strokeRect(0, 0, 128, 128);

    const tex = this.createCanvasTexture(canvas, true);
    this.cache.set(key, tex);
    return tex;
  }

  /**
   * Soft circular alpha texture for dust and rain particles
   */
  public static getParticleTexture(): THREE.Texture {
    const key = 'soft_particle_fast';
    if (this.cache.has(key)) return this.cache.get(key)!;

    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d')!;

    const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 15);
    grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    grad.addColorStop(0.4, 'rgba(255, 255, 255, 0.7)');
    grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 32, 32);

    const tex = this.createCanvasTexture(canvas, false);
    this.cache.set(key, tex);
    return tex;
  }

  /**
   * Painted Frontier Wooden Signboard Textures
   */
  public static createSignboardTexture(
    title: string,
    sub: string,
    bgHex: string = '#241a12',
    textHex: string = '#ebdcb9',
    goldBorder: boolean = true
  ): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = bgHex;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 42); ctx.lineTo(512, 42);
    ctx.moveTo(0, 85); ctx.lineTo(512, 85);
    ctx.stroke();

    if (goldBorder) {
      ctx.strokeStyle = '#d4af37';
      ctx.lineWidth = 4;
      ctx.strokeRect(6, 6, canvas.width - 12, canvas.height - 12);

      ctx.strokeStyle = 'rgba(212, 175, 55, 0.5)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);
    }

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 32px "Cinzel", "Times New Roman", serif';
    ctx.fillStyle = '#080605';
    ctx.fillText(title, canvas.width / 2 + 2, 50);
    ctx.fillStyle = textHex;
    ctx.fillText(title, canvas.width / 2, 48);

    if (sub) {
      ctx.font = 'bold 15px "Playfair Display", "Times New Roman", serif';
      ctx.fillStyle = '#080605';
      ctx.fillText(sub, canvas.width / 2 + 1, 92);
      ctx.fillStyle = goldBorder ? '#d4af37' : '#a89478';
      ctx.fillText(sub, canvas.width / 2, 91);
    }

    const tex = this.createCanvasTexture(canvas, true);
    return tex;
  }
}
