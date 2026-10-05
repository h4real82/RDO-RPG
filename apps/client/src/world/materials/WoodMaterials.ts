import * as THREE from 'three';

export interface WoodMaterialOptions {
  baseColor?: string;
  seamColor?: string;
  grainColor?: string;
  plankHeight?: number;
  planksPerTile?: number;
  bumpScale?: number;
  roughness?: number;
  metalness?: number;
  repeatX?: number;
  repeatY?: number;
}

/**
 * Procedural HTML5-Canvas Wood PBR Textures & Materials
 * Western/Frontier style horizontal wooden planks with bump maps, uneven seams, and knots.
 */
export class WoodMaterials {
  private static textureCache: Map<string, { diffuse: THREE.CanvasTexture; bump: THREE.CanvasTexture }> = new Map();

  /**
   * Generates seamless horizontal wood plank diffuse and bump maps on HTML5 Canvas.
   */
  public static generateWoodPlankCanvases(options: WoodMaterialOptions = {}): {
    diffuseTexture: THREE.CanvasTexture;
    bumpTexture: THREE.CanvasTexture;
  } {
    const width = 512;
    const height = 512;
    const baseColor = options.baseColor ?? '#6a4e32'; // Western Brown/Grey default
    const seamColor = options.seamColor ?? '#1c120a';
    const grainColor = options.grainColor ?? 'rgba(28, 18, 10, 0.35)';
    const planksCount = options.planksPerTile ?? 10;
    const plankH = height / planksCount;

    const cacheKey = `${baseColor}_${seamColor}_${planksCount}_${options.repeatX ?? 1}_${options.repeatY ?? 1}`;
    if (this.textureCache.has(cacheKey)) {
      return {
        diffuseTexture: this.textureCache.get(cacheKey)!.diffuse,
        bumpTexture: this.textureCache.get(cacheKey)!.bump
      };
    }

    if (typeof document === 'undefined') {
      const dummyTex = new THREE.CanvasTexture({} as HTMLCanvasElement);
      return { diffuseTexture: dummyTex, bumpTexture: dummyTex };
    }

    // 1. Diffuse Canvas
    const diffCanvas = document.createElement('canvas');
    diffCanvas.width = width;
    diffCanvas.height = height;
    const diffCtx = diffCanvas.getContext('2d')!;

    // 2. Bump/Height Canvas (greyscale for bumpMap)
    const bumpCanvas = document.createElement('canvas');
    bumpCanvas.width = width;
    bumpCanvas.height = height;
    const bumpCtx = bumpCanvas.getContext('2d')!;

    // Fill base diffuse & base neutral height
    diffCtx.fillStyle = baseColor;
    diffCtx.fillRect(0, 0, width, height);

    bumpCtx.fillStyle = '#808080';
    bumpCtx.fillRect(0, 0, width, height);

    // Seeded random pseudo generator for repeatable pattern
    let seed = 1899;
    const pseudoRandom = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };

    // Draw individual horizontal planks
    for (let i = 0; i < planksCount; i++) {
      const y = i * plankH;

      // Plank color variation (weathered tones per plank)
      const toneShift = (pseudoRandom() - 0.5) * 28;
      const rShift = Math.floor(toneShift);
      const bShift = Math.floor(toneShift * 0.7);
      diffCtx.fillStyle = `rgba(${rShift > 0 ? 255 : 0}, ${rShift > 0 ? 240 : 0}, ${bShift > 0 ? 220 : 0}, ${Math.abs(toneShift) * 0.007})`;
      diffCtx.fillRect(0, y, width, plankH);

      // Wood grain lines (fine horizontal lines)
      const grainCount = 5 + Math.floor(pseudoRandom() * 4);
      for (let g = 0; g < grainCount; g++) {
        const gy = y + 2 + (g / grainCount) * (plankH - 4);
        diffCtx.strokeStyle = grainColor;
        diffCtx.lineWidth = 1 + pseudoRandom() * 0.8;
        diffCtx.beginPath();
        diffCtx.moveTo(0, gy);

        // Subtle curve in the grain
        const midY = gy + (pseudoRandom() - 0.5) * 3;
        diffCtx.quadraticCurveTo(width * 0.5, midY, width, gy);
        diffCtx.stroke();

        // Slight grain lines in bump map
        bumpCtx.strokeStyle = 'rgba(70, 70, 70, 0.4)';
        bumpCtx.lineWidth = 1;
        bumpCtx.beginPath();
        bumpCtx.moveTo(0, gy);
        bumpCtx.quadraticCurveTo(width * 0.5, midY, width, gy);
        bumpCtx.stroke();
      }

      // Astlöcher (Knots) - occasional irregular knots
      if (pseudoRandom() > 0.4) {
        const knotX = width * (0.15 + pseudoRandom() * 0.7);
        const knotY = y + plankH * (0.3 + pseudoRandom() * 0.4);
        const knotRadiusX = 4 + pseudoRandom() * 6;
        const knotRadiusY = 3 + pseudoRandom() * 4;

        // Dark center of knot
        diffCtx.fillStyle = '#22140a';
        diffCtx.beginPath();
        diffCtx.ellipse(knotX, knotY, knotRadiusX, knotRadiusY, 0, 0, Math.PI * 2);
        diffCtx.fill();

        // Rings around knot
        diffCtx.strokeStyle = 'rgba(35, 22, 12, 0.5)';
        diffCtx.lineWidth = 1.2;
        diffCtx.beginPath();
        diffCtx.ellipse(knotX, knotY, knotRadiusX + 3, knotRadiusY + 2, 0, 0, Math.PI * 2);
        diffCtx.stroke();

        // Knot depression in bump map
        bumpCtx.fillStyle = '#252525';
        bumpCtx.beginPath();
        bumpCtx.ellipse(knotX, knotY, knotRadiusX, knotRadiusY, 0, 0, Math.PI * 2);
        bumpCtx.fill();

        bumpCtx.strokeStyle = '#505050';
        bumpCtx.lineWidth = 1.2;
        bumpCtx.beginPath();
        bumpCtx.ellipse(knotX, knotY, knotRadiusX + 3, knotRadiusY + 2, 0, 0, Math.PI * 2);
        bumpCtx.stroke();
      }

      // Plank seam groove (Dunkle Rille an den Plankenübergängen)
      const seamHeight = 3;
      diffCtx.fillStyle = seamColor;
      diffCtx.fillRect(0, y + plankH - seamHeight, width, seamHeight);

      // Very dark notch in bump map for plastische Tiefenwirkung
      bumpCtx.fillStyle = '#050505';
      bumpCtx.fillRect(0, y + plankH - seamHeight, width, seamHeight);

      // Upper bevel highlight on plank seam in bump map
      bumpCtx.fillStyle = '#c0c0c0';
      bumpCtx.fillRect(0, y, width, 1.5);

      // Random nails / fasteners
      for (const nx of [32, 160, 288, 416, 490]) {
        if (pseudoRandom() > 0.15) {
          diffCtx.fillStyle = '#141414';
          diffCtx.beginPath();
          diffCtx.arc(nx, y + plankH * 0.5, 2.2, 0, Math.PI * 2);
          diffCtx.fill();

          bumpCtx.fillStyle = '#1a1a1a';
          bumpCtx.beginPath();
          bumpCtx.arc(nx, y + plankH * 0.5, 2.2, 0, Math.PI * 2);
          bumpCtx.fill();
        }
      }
    }

    const rx = options.repeatX ?? 2;
    const ry = options.repeatY ?? 2;

    const diffTexture = new THREE.CanvasTexture(diffCanvas);
    diffTexture.wrapS = THREE.RepeatWrapping;
    diffTexture.wrapT = THREE.RepeatWrapping;
    diffTexture.generateMipmaps = true;
    diffTexture.minFilter = THREE.LinearMipmapLinearFilter;
    diffTexture.magFilter = THREE.LinearFilter;
    diffTexture.repeat.set(rx, ry);
    diffTexture.colorSpace = THREE.SRGBColorSpace;

    const bumpTexture = new THREE.CanvasTexture(bumpCanvas);
    bumpTexture.wrapS = THREE.RepeatWrapping;
    bumpTexture.wrapT = THREE.RepeatWrapping;
    bumpTexture.generateMipmaps = true;
    bumpTexture.minFilter = THREE.LinearMipmapLinearFilter;
    bumpTexture.magFilter = THREE.LinearFilter;
    bumpTexture.repeat.set(rx, ry);

    this.textureCache.set(cacheKey, { diffuse: diffTexture, bump: bumpTexture });

    return { diffuseTexture: diffTexture, bumpTexture };
  }

  /**
   * Creates a ready-to-use MeshStandardMaterial with diffuse & bumpMap for building walls.
   */
  public static createBuildingWoodMaterial(options: WoodMaterialOptions = {}): THREE.MeshStandardMaterial {
    const { diffuseTexture, bumpTexture } = this.generateWoodPlankCanvases(options);

    return new THREE.MeshStandardMaterial({
      map: diffuseTexture,
      bumpMap: bumpTexture,
      bumpScale: options.bumpScale ?? 0.12,
      roughness: options.roughness ?? 0.85,
      metalness: options.metalness ?? 0.05
    });
  }

  /**
   * Standard Western Dark Cedar Material (Saloon, Barn, Sheriff)
   */
  public static getDarkCedarMaterial(repeatX = 2, repeatY = 2): THREE.MeshStandardMaterial {
    return this.createBuildingWoodMaterial({
      baseColor: '#5c432d',
      seamColor: '#1a1008',
      grainColor: 'rgba(25, 14, 8, 0.4)',
      roughness: 0.85,
      bumpScale: 0.14,
      repeatX,
      repeatY
    });
  }

  /**
   * Standard Western Weathered Grey Material (Outbuildings, boardwalks)
   */
  public static getWeatheredGreyMaterial(repeatX = 2, repeatY = 2): THREE.MeshStandardMaterial {
    return this.createBuildingWoodMaterial({
      baseColor: '#6a6155',
      seamColor: '#1c1915',
      grainColor: 'rgba(28, 24, 20, 0.4)',
      roughness: 0.88,
      bumpScale: 0.12,
      repeatX,
      repeatY
    });
  }

  /**
   * Warm Honey Pine Material (General Store, Church trim)
   */
  public static getHoneyPineMaterial(repeatX = 2, repeatY = 2): THREE.MeshStandardMaterial {
    return this.createBuildingWoodMaterial({
      baseColor: '#8a673c',
      seamColor: '#2b1b0c',
      grainColor: 'rgba(38, 22, 10, 0.35)',
      roughness: 0.82,
      bumpScale: 0.12,
      repeatX,
      repeatY
    });
  }
}
