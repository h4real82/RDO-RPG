import * as THREE from 'three';

/**
 * Procedural PBR Texture Generator
 * Produces high-resolution Diffuse, Normal, Roughness, and Emissive maps using Canvas2D
 * ensuring instant loading with zero network overhead.
 */
export class TextureGenerator {
  private static cache: Map<string, THREE.CanvasTexture> = new Map();

  /**
   * Generates a tangent-space normal map from a grayscale height canvas
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
   * PBR Textures for Western Dirt / Mud Street & Prairie Grass
   * Natural multi-frequency organic noise without repeating sine stripes
   */
  public static getGroundTextures(): {
    diffuse: THREE.CanvasTexture;
    normal: THREE.CanvasTexture;
    roughness: THREE.CanvasTexture;
  } {
    const key = 'ground_pbr_v2';
    if (this.cache.has(`${key}_diffuse`)) {
      return {
        diffuse: this.cache.get(`${key}_diffuse`)!,
        normal: this.cache.get(`${key}_normal`)!,
        roughness: this.cache.get(`${key}_roughness`)!
      };
    }

    const size = 1024;
    const diffCanvas = document.createElement('canvas');
    diffCanvas.width = size;
    diffCanvas.height = size;
    const diffCtx = diffCanvas.getContext('2d')!;

    const heightCanvas = document.createElement('canvas');
    heightCanvas.width = size;
    heightCanvas.height = size;
    const heightCtx = heightCanvas.getContext('2d')!;

    const roughCanvas = document.createElement('canvas');
    roughCanvas.width = size;
    roughCanvas.height = size;
    const roughCtx = roughCanvas.getContext('2d')!;

    // Base warm ochre frontier soil
    diffCtx.fillStyle = '#8a6845';
    diffCtx.fillRect(0, 0, size, size);

    heightCtx.fillStyle = '#808080';
    heightCtx.fillRect(0, 0, size, size);

    roughCtx.fillStyle = '#a0a0a0';
    roughCtx.fillRect(0, 0, size, size);

    const imgData = diffCtx.getImageData(0, 0, size, size);
    const heightData = heightCtx.getImageData(0, 0, size, size);
    const roughData = roughCtx.getImageData(0, 0, size, size);

    // Multi-octave organic soil noise
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const idx = (y * size + x) * 4;

        // Subtle broad soil tone shifts
        const n1 = Math.sin(x * 0.015) * Math.cos(y * 0.018) * 15;
        const n2 = Math.sin(x * 0.04 + y * 0.03) * 10;
        const grain = (Math.random() - 0.5) * 25;
        const pebble = Math.random() > 0.988 ? 35 : 0;

        let r = 142 + n1 + n2 * 0.8 + grain * 0.7 + pebble;
        let g = 108 + n1 * 0.8 + n2 * 0.6 + grain * 0.5 + pebble * 0.9;
        let b = 76  + n1 * 0.6 + n2 * 0.4 + grain * 0.3 + pebble * 0.8;
        let h = 128 + n1 * 1.5 + n2 + grain + pebble * 2.2;
        let rough = 210 - pebble * 1.2;

        imgData.data[idx]     = Math.max(0, Math.min(255, r));
        imgData.data[idx + 1] = Math.max(0, Math.min(255, g));
        imgData.data[idx + 2] = Math.max(0, Math.min(255, b));
        imgData.data[idx + 3] = 255;

        heightData.data[idx]     = Math.max(0, Math.min(255, h));
        heightData.data[idx + 1] = Math.max(0, Math.min(255, h));
        heightData.data[idx + 2] = Math.max(0, Math.min(255, h));
        heightData.data[idx + 3] = 255;

        roughData.data[idx]     = Math.max(0, Math.min(255, rough));
        roughData.data[idx + 1] = Math.max(0, Math.min(255, rough));
        roughData.data[idx + 2] = Math.max(0, Math.min(255, rough));
        roughData.data[idx + 3] = 255;
      }
    }

    diffCtx.putImageData(imgData, 0, 0);
    heightCtx.putImageData(heightData, 0, 0);
    roughCtx.putImageData(roughData, 0, 0);

    const normalCanvas = this.createNormalMapFromHeight(heightCtx, size, size, 2.2);

    const diffTex = new THREE.CanvasTexture(diffCanvas);
    diffTex.wrapS = THREE.RepeatWrapping;
    diffTex.wrapT = THREE.RepeatWrapping;
    diffTex.colorSpace = THREE.SRGBColorSpace;
    diffTex.repeat.set(12, 8);

    const normalTex = new THREE.CanvasTexture(normalCanvas);
    normalTex.wrapS = THREE.RepeatWrapping;
    normalTex.wrapT = THREE.RepeatWrapping;
    normalTex.repeat.set(12, 8);

    const roughTex = new THREE.CanvasTexture(roughCanvas);
    roughTex.wrapS = THREE.RepeatWrapping;
    roughTex.wrapT = THREE.RepeatWrapping;
    roughTex.repeat.set(12, 8);

    this.cache.set(`${key}_diffuse`, diffTex);
    this.cache.set(`${key}_normal`, normalTex);
    this.cache.set(`${key}_roughness`, roughTex);

    return { diffuse: diffTex, normal: normalTex, roughness: roughTex };
  }

  /**
   * Weathered Wood Planks (Buildings, Boardwalks, Porches)
   */
  public static getWoodPlankTextures(variant: 'dark_cedar' | 'honey_pine' | 'boardwalk' = 'dark_cedar'): {
    diffuse: THREE.CanvasTexture;
    normal: THREE.CanvasTexture;
    roughness: THREE.CanvasTexture;
  } {
    const key = `wood_v2_${variant}`;
    if (this.cache.has(`${key}_diffuse`)) {
      return {
        diffuse: this.cache.get(`${key}_diffuse`)!,
        normal: this.cache.get(`${key}_normal`)!,
        roughness: this.cache.get(`${key}_roughness`)!
      };
    }

    const width = 512;
    const height = 512;
    const diffCanvas = document.createElement('canvas');
    diffCanvas.width = width;
    diffCanvas.height = height;
    const diffCtx = diffCanvas.getContext('2d')!;

    const heightCanvas = document.createElement('canvas');
    heightCanvas.width = width;
    heightCanvas.height = height;
    const heightCtx = heightCanvas.getContext('2d')!;

    const roughCanvas = document.createElement('canvas');
    roughCanvas.width = width;
    roughCanvas.height = height;
    const roughCtx = roughCanvas.getContext('2d')!;

    let baseHex = '#6e4c30';
    let grainDark = '#422c1c';
    if (variant === 'honey_pine') {
      baseHex = '#946a3d';
      grainDark = '#5e4122';
    } else if (variant === 'boardwalk') {
      baseHex = '#7d5e42';
      grainDark = '#483525';
    }

    diffCtx.fillStyle = baseHex;
    diffCtx.fillRect(0, 0, width, height);

    heightCtx.fillStyle = '#808080';
    heightCtx.fillRect(0, 0, width, height);

    roughCtx.fillStyle = '#b8b8b8';
    roughCtx.fillRect(0, 0, width, height);

    const plankHeight = 32;
    const plankCount = height / plankHeight;

    for (let i = 0; i < plankCount; i++) {
      const y = i * plankHeight;
      const toneShift = (Math.random() - 0.5) * 24;
      diffCtx.fillStyle = `rgba(${Math.max(0, 80 + toneShift)}, ${Math.max(0, 55 + toneShift)}, ${Math.max(0, 35 + toneShift)}, 0.3)`;
      diffCtx.fillRect(0, y, width, plankHeight);

      // Fine grain streaks
      for (let g = 0; g < 7; g++) {
        const gy = y + Math.random() * plankHeight;
        diffCtx.strokeStyle = grainDark;
        diffCtx.globalAlpha = 0.4;
        diffCtx.lineWidth = 1;
        diffCtx.beginPath();
        diffCtx.moveTo(0, gy);
        diffCtx.bezierCurveTo(
          width * 0.3, gy + (Math.random() - 0.5) * 4,
          width * 0.7, gy + (Math.random() - 0.5) * 4,
          width, gy
        );
        diffCtx.stroke();
      }
      diffCtx.globalAlpha = 1.0;

      // Dark seam groove
      diffCtx.fillStyle = '#1c120a';
      diffCtx.fillRect(0, y + plankHeight - 2, width, 2);

      heightCtx.fillStyle = '#202020';
      heightCtx.fillRect(0, y + plankHeight - 2, width, 2);

      // Nails
      for (let nailX = 32; nailX < width; nailX += 128) {
        diffCtx.fillStyle = '#1a1a1a';
        diffCtx.beginPath();
        diffCtx.arc(nailX, y + plankHeight * 0.5, 2.5, 0, Math.PI * 2);
        diffCtx.fill();

        heightCtx.fillStyle = '#e0e0e0';
        heightCtx.beginPath();
        heightCtx.arc(nailX, y + plankHeight * 0.5, 2.5, 0, Math.PI * 2);
        heightCtx.fill();

        roughCtx.fillStyle = '#505050';
        roughCtx.beginPath();
        roughCtx.arc(nailX, y + plankHeight * 0.5, 2.5, 0, Math.PI * 2);
        roughCtx.fill();
      }
    }

    const normalCanvas = this.createNormalMapFromHeight(heightCtx, width, height, 3.0);

    const diffTex = new THREE.CanvasTexture(diffCanvas);
    diffTex.wrapS = THREE.RepeatWrapping;
    diffTex.wrapT = THREE.RepeatWrapping;
    diffTex.colorSpace = THREE.SRGBColorSpace;

    const normalTex = new THREE.CanvasTexture(normalCanvas);
    normalTex.wrapS = THREE.RepeatWrapping;
    normalTex.wrapT = THREE.RepeatWrapping;

    const roughTex = new THREE.CanvasTexture(roughCanvas);
    roughTex.wrapS = THREE.RepeatWrapping;
    roughTex.wrapT = THREE.RepeatWrapping;

    this.cache.set(`${key}_diffuse`, diffTex);
    this.cache.set(`${key}_normal`, normalTex);
    this.cache.set(`${key}_roughness`, roughTex);

    return { diffuse: diffTex, normal: normalTex, roughness: roughTex };
  }

  /**
   * Roof Shingle Texture
   */
  public static getRoofTextures(): {
    diffuse: THREE.CanvasTexture;
    normal: THREE.CanvasTexture;
    roughness: THREE.CanvasTexture;
  } {
    const key = 'roof_shingles_v2';
    if (this.cache.has(`${key}_diffuse`)) {
      return {
        diffuse: this.cache.get(`${key}_diffuse`)!,
        normal: this.cache.get(`${key}_normal`)!,
        roughness: this.cache.get(`${key}_roughness`)!
      };
    }

    const size = 512;
    const diffCanvas = document.createElement('canvas');
    diffCanvas.width = size;
    diffCanvas.height = size;
    const diffCtx = diffCanvas.getContext('2d')!;

    const heightCanvas = document.createElement('canvas');
    heightCanvas.width = size;
    heightCanvas.height = size;
    const heightCtx = heightCanvas.getContext('2d')!;

    const roughCanvas = document.createElement('canvas');
    roughCanvas.width = size;
    roughCanvas.height = size;
    const roughCtx = roughCanvas.getContext('2d')!;

    diffCtx.fillStyle = '#55493e'; // weathered cedar shingles
    diffCtx.fillRect(0, 0, size, size);
    heightCtx.fillStyle = '#808080';
    heightCtx.fillRect(0, 0, size, size);
    roughCtx.fillStyle = '#c0c0c0';
    roughCtx.fillRect(0, 0, size, size);

    const rowH = 24;
    const shingleW = 32;
    const rows = size / rowH;

    for (let r = 0; r < rows; r++) {
      const y = r * rowH;
      const xOffset = (r % 2) * (shingleW / 2);
      for (let x = -shingleW; x < size + shingleW; x += shingleW) {
        const sx = x + xOffset;
        diffCtx.fillStyle = `rgb(${75 + Math.random() * 20}, ${65 + Math.random() * 18}, ${55 + Math.random() * 15})`;
        diffCtx.fillRect(sx + 1, y + 1, shingleW - 2, rowH - 2);

        // Highlight top edge
        diffCtx.fillStyle = 'rgba(255,255,255,0.18)';
        diffCtx.fillRect(sx + 1, y + 1, shingleW - 2, 2);

        // Shadow bottom
        diffCtx.fillStyle = 'rgba(0,0,0,0.5)';
        diffCtx.fillRect(sx, y + rowH - 3, shingleW, 3);

        const gradient = heightCtx.createLinearGradient(0, y, 0, y + rowH);
        gradient.addColorStop(0, '#505050');
        gradient.addColorStop(0.9, '#d0d0d0');
        gradient.addColorStop(1.0, '#303030');
        heightCtx.fillStyle = gradient;
        heightCtx.fillRect(sx, y, shingleW, rowH);
      }
    }

    const normalCanvas = this.createNormalMapFromHeight(heightCtx, size, size, 3.2);

    const diffTex = new THREE.CanvasTexture(diffCanvas);
    diffTex.wrapS = THREE.RepeatWrapping;
    diffTex.wrapT = THREE.RepeatWrapping;
    diffTex.colorSpace = THREE.SRGBColorSpace;
    diffTex.repeat.set(4, 4);

    const normalTex = new THREE.CanvasTexture(normalCanvas);
    normalTex.wrapS = THREE.RepeatWrapping;
    normalTex.wrapT = THREE.RepeatWrapping;
    normalTex.repeat.set(4, 4);

    const roughTex = new THREE.CanvasTexture(roughCanvas);
    roughTex.wrapS = THREE.RepeatWrapping;
    roughTex.wrapT = THREE.RepeatWrapping;
    roughTex.repeat.set(4, 4);

    this.cache.set(`${key}_diffuse`, diffTex);
    this.cache.set(`${key}_normal`, normalTex);
    this.cache.set(`${key}_roughness`, roughTex);

    return { diffuse: diffTex, normal: normalTex, roughness: roughTex };
  }

  /**
   * Warm glowing window texture for taverns and shops
   */
  public static getWindowGlowTexture(): THREE.CanvasTexture {
    const key = 'window_glow';
    if (this.cache.has(key)) return this.cache.get(key)!;

    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    // Warm golden amber interior
    const grad = ctx.createRadialGradient(128, 128, 20, 128, 128, 120);
    grad.addColorStop(0, '#fff2c2');
    grad.addColorStop(0.5, '#f5a623');
    grad.addColorStop(1, '#8b4513');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);

    // Dark timber window panes / mullions
    ctx.fillStyle = '#22150d';
    ctx.fillRect(124, 0, 8, 256); // vertical divider
    ctx.fillRect(0, 124, 256, 8); // horizontal divider
    ctx.strokeRect(0, 0, 256, 256);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    this.cache.set(key, tex);
    return tex;
  }

  /**
   * Soft circular alpha texture for dust and rain particles
   */
  public static getParticleTexture(): THREE.CanvasTexture {
    const key = 'soft_particle';
    if (this.cache.has(key)) return this.cache.get(key)!;

    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;

    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 30);
    grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    grad.addColorStop(0.4, 'rgba(255, 255, 255, 0.7)');
    grad.addColorStop(1, 'rgba(255, 255, 255, 0)');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);

    const tex = new THREE.CanvasTexture(canvas);
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

    // Wood background
    ctx.fillStyle = bgHex;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Weathered planks lines
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

    // Main text
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 34px "Cinzel", "Times New Roman", serif';
    ctx.fillStyle = '#080605';
    ctx.fillText(title, canvas.width / 2 + 2, 50);
    ctx.fillStyle = textHex;
    ctx.fillText(title, canvas.width / 2, 48);

    // Subtitle
    if (sub) {
      ctx.font = 'bold 15px "Playfair Display", "Times New Roman", serif';
      ctx.fillStyle = '#080605';
      ctx.fillText(sub, canvas.width / 2 + 1, 92);
      ctx.fillStyle = goldBorder ? '#d4af37' : '#a89478';
      ctx.fillText(sub, canvas.width / 2, 91);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }
}
