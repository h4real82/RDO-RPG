import * as THREE from 'three';
import { VALENTINE_OBSTACLES, ObstacleAABB, POIDefinition } from '@rdo-rpg/shared';
import { pois } from '@rdo-rpg/content';
import { TextureGenerator } from './TextureGenerator';

export interface POIMarker3D {
  poi: POIDefinition;
  root: THREE.Group;
  ring: THREE.Mesh;
  iconSprite: THREE.Sprite;
  labelSprite: THREE.Sprite;
}

/**
 * Authentic 3D Reconstruction of Valentine (Red Dead Online)
 * Faithfully built according to Map 1 (Street grid & sectors) and RDO Screenshots 2 & 3:
 * - Nord-Sektor: Church (cruciform, white clapboard, high bell tower) & Graveyard (crosses, tombstones, fence, pond)
 * - Zentraler Hauptstraßen-Streifen: Smithfield's Saloon (2 stories, ext. stairs, balcony), Doctor & Apothecary ("DRUGS." false front),
 *   Sheriff's Office (timber front + red brick jail with bars), General Store, Bank, Baustelle (studs, rafters, lumber, tarps)
 * - Süd-Sektor: Valentine Livery Stable (barrel-vault corrugated zinc roof, water tank), Paddocks/Corrals, Wagon Camp
 * - Südost-Sektor: Valentine Train Station (platform, station house), curved railroad tracks, railroad water tower, telegraph lines
 */
export class ValentineBuilder {
  public static readonly SCALE = 0.1; // 10 px in 2D = 1 meter in 3D
  private scene: THREE.Scene;
  public obstacleBoxes: THREE.Box3[] = [];
  public poiMarkers: POIMarker3D[] = [];
  public waterMesh: THREE.Mesh | null = null;
  public groundMesh!: THREE.Mesh;
  public puddles: THREE.Mesh[] = [];

  // Occluder meshes for dynamic camera line-of-sight fading (opacity 0.15)
  public occluderMeshes: THREE.Mesh[] = [];

  // PBR Materials
  private mudStreetMat!: THREE.MeshStandardMaterial;
  private woodDarkMat!: THREE.MeshStandardMaterial;
  private woodHoneyMat!: THREE.MeshStandardMaterial;
  private boardwalkMat!: THREE.MeshStandardMaterial;
  private roofShingleMat!: THREE.MeshStandardMaterial;
  private corrugatedMetalMat!: THREE.MeshStandardMaterial;
  private redBrickMat!: THREE.MeshStandardMaterial;
  private doctorClapboardMat!: THREE.MeshStandardMaterial;
  private churchClapboardMat!: THREE.MeshStandardMaterial;
  private tentCanvasMat!: THREE.MeshStandardMaterial;
  private stoneMat!: THREE.MeshStandardMaterial;
  private ironMat!: THREE.MeshStandardMaterial;
  private steelRailMat!: THREE.MeshStandardMaterial;
  private glassMat!: THREE.MeshStandardMaterial;
  private puddleMat!: THREE.MeshStandardMaterial;
  private hayMat!: THREE.MeshStandardMaterial;
  private windowGlowMat!: THREE.MeshBasicMaterial;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.initMaterials();
  }

  private initMaterials() {
    // 1. Muddy churned frontier road
    const mudTex = TextureGenerator.getMuddyStreetTextures();
    this.mudStreetMat = new THREE.MeshStandardMaterial({
      map: mudTex.diffuse,
      normalMap: mudTex.normal,
      roughnessMap: mudTex.roughness,
      roughness: 0.72,
      metalness: 0.08
    });

    // 2. Weathered Dark Cedar (Saloon, Barn frames, Posts)
    const woodDark = TextureGenerator.getWoodPlankTextures('dark_cedar');
    this.woodDarkMat = new THREE.MeshStandardMaterial({
      map: woodDark.diffuse,
      normalMap: woodDark.normal,
      roughnessMap: woodDark.roughness,
      roughness: 0.78,
      metalness: 0.02
    });

    // 3. Honey Pine (General Store, trim, furniture)
    const woodHoney = TextureGenerator.getWoodPlankTextures('honey_pine');
    this.woodHoneyMat = new THREE.MeshStandardMaterial({
      map: woodHoney.diffuse,
      normalMap: woodHoney.normal,
      roughnessMap: woodHoney.roughness,
      roughness: 0.70,
      metalness: 0.02
    });

    // 4. Boardwalk Timber
    const boardwalk = TextureGenerator.getWoodPlankTextures('boardwalk');
    this.boardwalkMat = new THREE.MeshStandardMaterial({
      map: boardwalk.diffuse,
      normalMap: boardwalk.normal,
      roughnessMap: boardwalk.roughness,
      roughness: 0.75,
      metalness: 0.02
    });

    // 5. Weathered Cedar Shingle Roofs
    const roofTex = TextureGenerator.getRoofTextures();
    this.roofShingleMat = new THREE.MeshStandardMaterial({
      map: roofTex.diffuse,
      normalMap: roofTex.normal,
      roughnessMap: roofTex.roughness,
      roughness: 0.85,
      metalness: 0.02,
      transparent: true,
      opacity: 0.85,
      depthWrite: true
    });

    // 6. Corrugated Metal / Zinc (Livery Barn curved roof)
    const metalTex = TextureGenerator.getCorrugatedMetalTextures();
    this.corrugatedMetalMat = new THREE.MeshStandardMaterial({
      map: metalTex.diffuse,
      normalMap: metalTex.normal,
      roughnessMap: metalTex.roughness,
      roughness: 0.48,
      metalness: 0.82,
      transparent: true,
      opacity: 0.85,
      depthWrite: true
    });

    // 7. Red Brick Masonry (Sheriff Jail block)
    const brickTex = TextureGenerator.getRedBrickTextures();
    this.redBrickMat = new THREE.MeshStandardMaterial({
      map: brickTex.diffuse,
      normalMap: brickTex.normal,
      roughnessMap: brickTex.roughness,
      roughness: 0.85,
      metalness: 0.04
    });

    // 8. Doctor Clapboard (Sage green apothecary siding)
    const docTex = TextureGenerator.getClapboardTextures('sage_green');
    this.doctorClapboardMat = new THREE.MeshStandardMaterial({
      map: docTex.diffuse,
      normalMap: docTex.normal,
      roughnessMap: docTex.roughness,
      roughness: 0.72,
      metalness: 0.03
    });

    // 9. Church White Clapboard (Aged white church siding)
    const churchTex = TextureGenerator.getClapboardTextures('aged_white');
    this.churchClapboardMat = new THREE.MeshStandardMaterial({
      map: churchTex.diffuse,
      normalMap: churchTex.normal,
      roughnessMap: churchTex.roughness,
      roughness: 0.75,
      metalness: 0.02
    });

    // 10. Tent Canvas
    this.tentCanvasMat = new THREE.MeshStandardMaterial({
      color: 0xdfd4bc,
      roughness: 0.88,
      metalness: 0.02,
      side: THREE.DoubleSide
    });

    // 11. Stone & Foundation
    this.stoneMat = new THREE.MeshStandardMaterial({
      color: 0x5a524b,
      roughness: 0.92,
      metalness: 0.05
    });

    // 12. Forged Black Iron (Bars, lanterns, hitching rings)
    this.ironMat = new THREE.MeshStandardMaterial({
      color: 0x1f1f22,
      roughness: 0.45,
      metalness: 0.9
    });

    // 13. Polished Steel Rails
    this.steelRailMat = new THREE.MeshStandardMaterial({
      color: 0x8a929a,
      roughness: 0.25,
      metalness: 0.92
    });

    // 14. Window Glass
    this.glassMat = new THREE.MeshStandardMaterial({
      color: 0x3d4f59,
      roughness: 0.12,
      metalness: 0.75,
      transparent: true,
      opacity: 0.65
    });

    // 15. Reflective Mud Puddle Water
    this.puddleMat = new THREE.MeshStandardMaterial({
      color: 0x242d34,
      roughness: 0.04,
      metalness: 0.85,
      transparent: true,
      opacity: 0.85
    });

    // 16. Golden Prairie Hay
    this.hayMat = new THREE.MeshStandardMaterial({
      color: 0xc49b48,
      roughness: 0.95,
      metalness: 0.02
    });

    // 17. Warm Interior Window Glow
    this.windowGlowMat = new THREE.MeshBasicMaterial({
      map: TextureGenerator.getWindowGlowTexture()
    });
  }

  /**
   * Registers a mesh for dynamic occlusion-fading when blocking the player.
   * Clones its material so fading happens independently.
   */
  public registerOccluder(mesh: THREE.Mesh) {
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    if (mesh.material) {
      if (Array.isArray(mesh.material)) {
        mesh.material = mesh.material.map((m) => {
          const cloned = m.clone();
          cloned.transparent = true;
          cloned.depthWrite = true;
          return cloned;
        });
      } else {
        const cloned = (mesh.material as THREE.Material).clone();
        cloned.transparent = true;
        cloned.depthWrite = true;
        mesh.material = cloned;
      }
    }
    this.occluderMeshes.push(mesh);
  }

  public buildValentineWorld() {
    this.buildTerrain();
    this.buildNorthSector();
    this.buildCentralSector();
    this.buildSouthSector();
    this.buildSoutheastSector();
    this.buildBoardwalks();
    this.buildStreetFurniture();
    this.buildWaterTrough();
    this.buildPOIMarkers();
    this.generateBoundingBoxes();
  }

  /**
   * GEOGRAFISCHER MASTER-PLAN (Auf Basis der "Valentine MAP"):
   * 1. Start/Haupteingang: Bahnhof & Gleise im Südosten (X: 122 -> worldX: 122, Z: 78). Player spawn / road lead at X: 60, Z: 60.
   * 2. Hauptstraße: Zieht sich geschwungen vom Bahnhofsbereich (Südost) nach Nordwesten durch das Zentrum.
   * 3. Terrain-Texturierung: Schlammige Hauptstraße mit erkennbaren Wagenspuren, abzweigende Erdpfade, Grünflächen im Umland.
   * 4. Exakte Zonen:
   *    - Nordhügel (Z: 14 - 24, X: 55 - 75): Kirche & Friedhof
   *    - Zentrum (Z: 34 - 45, X: 30 - 110): Saloon, Hotel, Bank, Doctor, Sheriff, Baustelle
   *    - Süden (Z: 68 - 85, X: 45 - 85): Große Livery Stable & Pferdekoppeln
   *    - Südost (Z: 70 - 105, X: 110 - 145): Bahnhof & Gleisanlage mit Wasserturm
   */
  public static readonly MASTER_GRID = {
    SOUTHEAST_STATION: { x: 122, z: 78, railsZ: 105 },
    MAIN_STREET_SPAWN: { x: 60, z: 60 },
    NORTH_HILL_CHURCH: { x: 65, z: 14, hillY: 2.4 },
    CENTER_SALOON: { x: 34, z: 36 },
    CENTER_SHERIFF: { x: 80, z: 37.5 },
    CENTER_BANK: { x: 95, z: 38 },
    SOUTH_LIVERY: { x: 52, z: 74 }
  } as const;

  /**
   * Samples exact ground elevation at world coordinate (x, z)
   */
  public getGroundHeight(x: number, z: number): number {
    let y = 0;

    // 1. Church Hill in North Sector
    const distChurchHill = Math.hypot((x - 68) / 22, (z - 16) / 14);
    if (distChurchHill < 1.8) {
      y += Math.exp(-Math.pow(distChurchHill, 2)) * 2.6;
    }

    // 2. Graveyard pond depression
    const distPond = Math.hypot((x - 82) / 6.0, (z - 22) / 4.2);
    if (distPond < 1.5) {
      y -= Math.exp(-Math.pow(distPond, 2)) * 0.45;
    }

    // 3. Main Street organic S-curve
    const streetCenterZ = 46.5 + Math.sin((x - 20) * 0.04) * 3.5;
    const distToStreet = Math.abs(z - streetCenterZ);
    if (distToStreet < 8.0 && x >= 12 && x <= 148) {
      const rutNorth = Math.exp(-Math.pow((z - (streetCenterZ - 2.6)) / 1.5, 2)) * -0.22;
      const rutSouth = Math.exp(-Math.pow((z - (streetCenterZ + 2.6)) / 1.5, 2)) * -0.22;
      const centerCrown = Math.exp(-Math.pow((z - streetCenterZ) / 1.6, 2)) * 0.08;
      y += rutNorth + rutSouth + centerCrown - 0.06;
    }

    // 4. North road to church
    const roadChurchDist = Math.abs(x - (56 + (43 - z) * 0.35));
    if (z > 20 && z < 43 && roadChurchDist < 4.0) {
      y -= 0.12;
    }

    // 5. South road to livery barn
    if (z >= 50 && z <= 76 && Math.abs(x - 52) < 4.5) {
      y -= 0.10;
    }

    // 6. Railroad ballast elevation
    const trackCurveZ = 105 - (x - 105) * 1.1 + Math.pow((x - 105) / 22, 2) * 2.2;
    if (x >= 108 && x <= 148 && Math.abs(z - trackCurveZ) < 3.0) {
      y += 0.14;
    }

    return y;
  }

  /**
   * 3D Dirt/Mud Terrain with Main Street wagon ruts, church hill, and ruts
   */
  private buildHollowBuilding(x: number, y: number, z: number, w: number, h: number, d: number, mat: THREE.Material) {
    const t = 0.15;
    const group = new THREE.Group();
    group.position.set(x, y, z);
    
    const front = new THREE.Mesh(new THREE.BoxGeometry(w, h, t), mat);
    front.position.set(0, 0, d/2 - t/2);
    front.castShadow = true; front.receiveShadow = true;
    this.registerOccluder(front);
    group.add(front);

    const back = new THREE.Mesh(new THREE.BoxGeometry(w, h, t), mat);
    back.position.set(0, 0, -d/2 + t/2);
    back.castShadow = true; back.receiveShadow = true;
    this.registerOccluder(back);
    group.add(back);

    const left = new THREE.Mesh(new THREE.BoxGeometry(t, h, d - t*2), mat);
    left.position.set(-w/2 + t/2, 0, 0);
    left.castShadow = true; left.receiveShadow = true;
    this.registerOccluder(left);
    group.add(left);

    const right = new THREE.Mesh(new THREE.BoxGeometry(t, h, d - t*2), mat);
    right.position.set(w/2 - t/2, 0, 0);
    right.castShadow = true; right.receiveShadow = true;
    this.registerOccluder(right);
    group.add(right);

    this.scene.add(group);
  }

  private buildTerrain() {
    const width = 164;
    const depth = 114;
    const geo = new THREE.PlaneGeometry(width, depth, 164, 114);
    geo.rotateX(-Math.PI / 2);

    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);

      let y = this.getGroundHeight(x, z);
      // Add subtle micro-churn
      if (Math.abs(z - (46.5 + Math.sin((x - 20) * 0.04) * 3.5)) < 8.0) {
        y += Math.sin(x * 0.6) * Math.cos(z * 0.7) * 0.035;
      }

      // 1. Church Hill in North Sector (z <= 28, x between 42 and 94)
      const distChurchHill = Math.hypot((x - 68) / 22, (z - 16) / 14);
      if (distChurchHill < 1.8) {
        y += Math.exp(-Math.pow(distChurchHill, 2)) * 2.6;
      }

      // 2. Graveyard pond depression (near x=82, z=22)
      const distPond = Math.hypot((x - 82) / 6.0, (z - 22) / 4.2);
      if (distPond < 1.5) {
        y -= Math.exp(-Math.pow(distPond, 2)) * 0.45;
      }

      // 3. Main Street organic S-curve (Z roughly 43 to 53, X from 15 to 145)
      const streetCenterZ = 46.5 + Math.sin((x - 20) * 0.04) * 3.5;
      const distToStreet = Math.abs(z - streetCenterZ);

      if (distToStreet < 8.0 && x >= 12 && x <= 148) {
        // Dual wagon wheel ruts
        const rutNorth = Math.exp(-Math.pow((z - (streetCenterZ - 2.6)) / 1.5, 2)) * -0.22;
        const rutSouth = Math.exp(-Math.pow((z - (streetCenterZ + 2.6)) / 1.5, 2)) * -0.22;
        // Raised center crown
        const centerCrown = Math.exp(-Math.pow((z - streetCenterZ) / 1.6, 2)) * 0.08;
        // Micro-undulation from carriage traffic and hoofprints
        const churn = Math.sin(x * 0.6) * Math.cos(z * 0.7) * 0.035;

        y += rutNorth + rutSouth + centerCrown + churn - 0.06;
      }

      // 4. North road cut to church (x around 54 to 68, z from 22 to 43)
      const roadChurchDist = Math.abs(x - (56 + (43 - z) * 0.35));
      if (z > 20 && z < 43 && roadChurchDist < 4.0) {
        y -= 0.12;
      }

      // 5. South road to livery barn (x around 48 to 56, z from 50 to 76)
      if (z >= 50 && z <= 76 && Math.abs(x - 52) < 4.5) {
        y -= 0.10 + Math.sin(x * 0.5) * 0.02;
      }

      // 6. Railroad ballast elevation in Southeast (x: 105 to 145, z: 62 to 105)
      const trackCurveZ = 105 - (x - 105) * 1.1 + Math.pow((x - 105) / 22, 2) * 2.2;
      if (x >= 108 && x <= 148 && Math.abs(z - trackCurveZ) < 3.0) {
        y += 0.14;
      }

      pos.setY(i, y);
    }
    geo.computeVertexNormals();

    this.groundMesh = new THREE.Mesh(geo, this.mudStreetMat);
    this.groundMesh.position.set(80, 0, 55);
    this.groundMesh.receiveShadow = true;
    this.scene.add(this.groundMesh);

    // Reflective Mud Puddles nestled along the curved wheel ruts
    const puddleLocations = [
      { x: 28.0, z: 44.5, rx: 2.8, rz: 1.2 },
      { x: 42.0, z: 50.8, rx: 3.4, rz: 1.4 },
      { x: 56.0, z: 45.2, rx: 3.0, rz: 1.3 },
      { x: 68.0, z: 52.0, rx: 2.6, rz: 1.1 },
      { x: 80.0, z: 46.5, rx: 3.2, rz: 1.5 },
      { x: 94.0, z: 53.0, rx: 3.8, rz: 1.4 },
      { x: 108.0, z: 47.8, rx: 2.5, rz: 1.2 },
      { x: 122.0, z: 54.2, rx: 3.0, rz: 1.3 },
      { x: 136.0, z: 49.0, rx: 3.2, rz: 1.2 },
      // Puddle in livestock paddock
      { x: 72.0, z: 75.0, rx: 3.5, rz: 1.6 }
    ];

    puddleLocations.forEach((p) => {
      const pGeo = new THREE.PlaneGeometry(p.rx, p.rz, 12, 8);
      pGeo.rotateX(-Math.PI / 2);
      const pPos = pGeo.attributes.position;
      for (let j = 0; j < pPos.count; j++) {
        const px = pPos.getX(j);
        const pz = pPos.getZ(j);
        pPos.setY(j, Math.sin(px * 3) * Math.cos(pz * 3) * 0.01);
      }
      pGeo.computeVertexNormals();

      const puddleMesh = new THREE.Mesh(pGeo, this.puddleMat);
      puddleMesh.position.set(p.x, -0.11, p.z);
      puddleMesh.renderOrder = 2;
      puddleMesh.receiveShadow = true;
      this.scene.add(puddleMesh);
      this.puddles.push(puddleMesh);
    });

    // Graveyard pond water plane
    const pondGeo = new THREE.PlaneGeometry(8.5, 5.5, 16, 12);
    pondGeo.rotateX(-Math.PI / 2);
    const pondMesh = new THREE.Mesh(pondGeo, this.puddleMat);
    pondMesh.position.set(82.0, 1.95, 22.0);
    pondMesh.renderOrder = 2;
    this.scene.add(pondMesh);

    // Modular 3D Wagon Wheel Rut Strips (churned dark wet mud tracks)
    const rutTex = TextureGenerator.getMuddyStreetTextures();
    const rutMat = new THREE.MeshStandardMaterial({
      map: rutTex.diffuse,
      normalMap: rutTex.normal,
      roughnessMap: rutTex.roughness,
      roughness: 0.42,
      metalness: 0.18,
      color: 0x3d3025
    });

    const rutSegments = 28;
    const startX = 18;
    const endX = 142;
    const stepX = (endX - startX) / rutSegments;

    for (let s = 0; s < rutSegments; s++) {
      const rx1 = startX + s * stepX;
      const rx2 = rx1 + stepX;
      const midX = (rx1 + rx2) / 2;
      const centerZ = 46.5 + Math.sin((midX - 20) * 0.04) * 3.5;
      const angle = Math.atan2(
        (46.5 + Math.sin((rx2 - 20) * 0.04) * 3.5) - (46.5 + Math.sin((rx1 - 20) * 0.04) * 3.5),
        stepX
      );
      const segLen = Math.hypot(stepX, (46.5 + Math.sin((rx2 - 20) * 0.04) * 3.5) - (46.5 + Math.sin((rx1 - 20) * 0.04) * 3.5));

      // Dual ruts (North rut at -2.6, South rut at +2.6 from street centerline)
      [-2.6, 2.6].forEach((offsetZ) => {
        const rutGeo = new THREE.PlaneGeometry(segLen + 0.1, 0.45);
        rutGeo.rotateX(-Math.PI / 2);
        const rutMesh = new THREE.Mesh(rutGeo, rutMat);
        const groundY = this.getGroundHeight(midX, centerZ + offsetZ);
        rutMesh.position.set(midX, groundY + 0.015, centerZ + offsetZ);
        rutMesh.rotation.y = -angle;
        rutMesh.receiveShadow = true;
        this.scene.add(rutMesh);
      });
    }
  }

  /**
   * Sektor 1: Nord-Sektor (Hügel)
   * - Valentine Church (Cruciform, white clapboard, high bell tower, slate spire, cross)
   * - Graveyard (tombstones, crooked crosses, weathered picket fence)
   */
  private buildNorthSector() {
    const hillY = 2.4; // Base elevation on church hill

    // --- 1. Valentine Church ---
    const churchX = 65.0;
    const churchZ = 14.0;

    // Church Nave (Longitudinal hall: width 8m, depth 14m, wall height 6m)
    this.buildHollowBuilding(churchX, hillY + 3.0, churchZ, 8.0, 6.0, 14.0, this.churchClapboardMat);

    // Church Transept (Cruciform cross-wing: width 15m, depth 6m, wall height 6m)
    this.buildHollowBuilding(churchX, hillY + 3.0, churchZ - 1.0, 15.0, 6.0, 6.0, this.churchClapboardMat);

    // Nave Gabled Roof (lowered pitch 1.4m)
    this.buildGableRoofWithOcclusion(churchX, hillY + 6.0, churchZ, 8.4, 14.4, 1.4, 'z', this.churchClapboardMat);
    // Transept Cross Gabled Roof (lowered pitch 1.4m)
    this.buildGableRoofWithOcclusion(churchX, hillY + 6.0, churchZ - 1.0, 15.4, 6.4, 1.4, 'x', this.churchClapboardMat);

    // Church Bell Tower (Entrance tower: 4.5m x 4.5m, total height 16m)
    const towerX = churchX;
    const towerZ = churchZ + 7.5;

    // Tower base (square white clapboard, height 10m)
    this.buildHollowBuilding(towerX, hillY + 5.0, towerZ, 4.5, 10.0, 4.5, this.churchClapboardMat);

    // Belfry Openings (4 arched columns showing bronze bell)
    const belfryRoof = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.4, 4.6), this.woodDarkMat);
    belfryRoof.position.set(towerX, hillY + 12.0, towerZ);
    this.scene.add(belfryRoof);

    // Bronze Church Bell inside tower
    const bellGeo = new THREE.CylinderGeometry(0.35, 0.75, 1.1, 12);
    const bellMat = new THREE.MeshStandardMaterial({ color: 0xb8860b, metalness: 0.85, roughness: 0.3 });
    const bell = new THREE.Mesh(bellGeo, bellMat);
    bell.position.set(towerX, hillY + 11.0, towerZ);
    this.scene.add(bell);

    // Tower Slate Spire (Steep 4-sided pyramid, height 5m)
    const spireGeo = new THREE.ConeGeometry(2.8, 5.2, 4);
    spireGeo.rotateY(Math.PI / 4);
    const spireMat = new THREE.MeshStandardMaterial({ color: 0x2d3436, roughness: 0.8 });
    const spire = new THREE.Mesh(spireGeo, spireMat);
    spire.position.set(towerX, hillY + 14.8, towerZ);
    spire.castShadow = true;
    this.registerOccluder(spire);
    this.scene.add(spire);

    // Wooden Cross on peak of spire
    const crossVert = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.6, 0.12), this.woodHoneyMat);
    crossVert.position.set(towerX, hillY + 17.8, towerZ);
    const crossHoriz = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.12, 0.12), this.woodHoneyMat);
    crossHoriz.position.set(towerX, hillY + 18.0, towerZ);
    this.scene.add(crossVert);
    this.scene.add(crossHoriz);

    // Arched Church Entrance Door with stone steps
    const doorGeo = new THREE.BoxGeometry(1.8, 3.0, 0.2);
    const door = new THREE.Mesh(doorGeo, this.woodDarkMat);
    door.position.set(towerX, hillY + 1.5, towerZ + 2.3);
    this.scene.add(door);

    const stepGeo = new THREE.BoxGeometry(2.6, 0.35, 1.2);
    const step = new THREE.Mesh(stepGeo, this.stoneMat);
    step.position.set(towerX, hillY + 0.18, towerZ + 2.8);
    this.scene.add(step);

    // Gothic Arched Stained Windows (warm glow)
    const winGeo = new THREE.PlaneGeometry(1.2, 2.4);
    [-4.05, 4.05].forEach((wx) => {
      [-3.5, 1.5].forEach((wz) => {
        const win = new THREE.Mesh(winGeo, this.windowGlowMat);
        win.position.set(churchX + wx, hillY + 3.2, churchZ + wz);
        win.rotateY(wx > 0 ? Math.PI / 2 : -Math.PI / 2);
        this.scene.add(win);
      });
    });

    // Signboard at church path
    const churchSign = TextureGenerator.createSignboardTexture(
      'CHURCH OF VALENTINE',
      'SUNDAY SERVICE · ALL WELCOME',
      '#1c1815',
      '#f1ede4',
      true
    );
    const cSignMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(2.4, 0.7),
      new THREE.MeshStandardMaterial({ map: churchSign, roughness: 0.6 })
    );
    cSignMesh.position.set(towerX + 2.8, hillY + 1.2, towerZ + 3.2);
    cSignMesh.rotateY(-0.35);
    this.scene.add(cSignMesh);

    // --- 2. Friedhof (Cemetery) next to Church ---
    const cemX = 78.0;
    const cemZ = 16.0;

    // Headstones and crooked wooden crosses
    const graveSpots = [
      { x: cemX - 3.0, z: cemZ - 3.5, type: 'cross', rot: 0.15 },
      { x: cemX - 0.5, z: cemZ - 4.0, type: 'stone', rot: -0.1 },
      { x: cemX + 2.5, z: cemZ - 3.0, type: 'cross', rot: 0.25 },
      { x: cemX - 3.5, z: cemZ - 0.5, type: 'stone', rot: 0.05 },
      { x: cemX - 1.0, z: cemZ + 0.2, type: 'cross', rot: -0.2 },
      { x: cemX + 2.0, z: cemZ - 0.5, type: 'stone', rot: 0.12 },
      { x: cemX - 2.5, z: cemZ + 3.0, type: 'cross', rot: 0.08 },
      { x: cemX + 0.5, z: cemZ + 3.5, type: 'stone', rot: -0.18 },
      { x: cemX + 3.2, z: cemZ + 2.5, type: 'cross', rot: -0.12 }
    ];

    graveSpots.forEach((g) => {
      const gY = hillY - 0.2;
      if (g.type === 'stone') {
        const headstoneGeo = new THREE.BoxGeometry(0.55, 0.85, 0.18);
        const headstone = new THREE.Mesh(headstoneGeo, this.stoneMat);
        headstone.position.set(g.x, gY + 0.42, g.z);
        headstone.rotateZ(g.rot);
        headstone.castShadow = true;
        this.scene.add(headstone);
      } else {
        const cV = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.1, 0.08), this.woodDarkMat);
        cV.position.set(g.x, gY + 0.55, g.z);
        cV.rotateZ(g.rot);
        const cH = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.08, 0.08), this.woodDarkMat);
        cH.position.set(g.x, gY + 0.78, g.z);
        cH.rotateZ(g.rot);
        cV.castShadow = true;
        this.scene.add(cV);
        this.scene.add(cH);
      }
    });

    // Weathered picket fence around cemetery perimeter
    this.buildFenceLine(cemX - 5.5, cemZ - 5.5, cemX + 5.5, cemZ - 5.5, hillY); // North
    this.buildFenceLine(cemX + 5.5, cemZ - 5.5, cemX + 5.5, cemZ + 5.5, hillY); // East
    this.buildFenceLine(cemX - 5.5, cemZ + 5.5, cemX + 1.0, cemZ + 5.5, hillY); // South (with open gate)
    this.buildFenceLine(cemX - 5.5, cemZ - 5.5, cemX - 5.5, cemZ + 5.5, hillY); // West
  }

  /**
   * Sektor 2: Zentraler Hauptstraßen-Streifen
   * - Smithfield's Saloon (2-story, ext. staircase on west wall, 1st-floor balcony, porch, swing doors)
   * - Valentine General Store (false front, awning on posts, boardwalk)
   * - Doctor & Apothecary ("DRUGS." false front matching Bild 3, sage-green siding, bay window)
   * - Sheriff's Office & Jail (timber front + red brick jail with iron bars, chimney, matching Bild 3)
   * - Valentine Bank (false front with ornate cornice)
   * - Valentine Gunsmith & Blacksmith
   * - Baustelle (House under construction matching Bild 2: vertical studs, exposed rafters, lumber stacks, tarps)
   * - South Residences & Hotel
   */
  private buildCentralSector() {
    this.buildSmithfieldsSaloon();
    this.buildGeneralStore();
    this.buildDoctorClinic();
    this.buildSheriffOfficeAndJail();
    this.buildBank();
    this.buildGunsmithAndBlacksmith();
    this.buildHouseUnderConstruction();
    this.buildSouthResidences();
  }

  /**
   * Smithfield's Saloon: 2-story landmark matching Bild 2 & 3
   */
  private buildSmithfieldsSaloon() {
    const x = 34.0;
    const z = 36.0;
    const w = 16.0;
    const d = 11.0;
    const h1 = 3.8;
    const h2 = 3.6;
    const totalH = h1 + h2;

    // Ground Floor (Weathered timber)
    this.buildHollowBuilding(x, h1 / 2, z, w, h1, d, this.woodDarkMat);

    // First Floor
    this.buildHollowBuilding(x, h1 + h2 / 2, z, w, h2, d, this.woodDarkMat);

    // Gabled Roof (reduced roof height to 1.3m)
    this.buildGableRoofWithOcclusion(x, totalH, z, w, d, 1.3, 'x');

    // Brick Chimney
    const chimGeo = new THREE.BoxGeometry(0.9, 3.2, 0.9);
    const chim = new THREE.Mesh(chimGeo, this.redBrickMat);
    chim.position.set(x + 5.5, totalH + 1.2, z - 2.5);
    chim.castShadow = true;
    this.scene.add(chim);

    // Ground Floor Front Veranda / Porch (hard-capped to 1.2m depth)
    const porchD = 1.0;
    const porchH = 0.25;
    const porchFloor = new THREE.Mesh(new THREE.BoxGeometry(w, porchH, porchD), this.boardwalkMat);
    porchFloor.position.set(x, porchH / 2, z + d / 2 + porchD / 2);
    porchFloor.receiveShadow = true;
    this.registerOccluder(porchFloor);
    this.scene.add(porchFloor);

    // Porch Support Posts (4 timber columns)
    const postCount = 5;
    for (let i = 0; i < postCount; i++) {
      const px = x - w / 2 + (i / (postCount - 1)) * w;
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.08, h1, 0.08), this.woodDarkMat);
      post.position.set(px, h1 / 2, z + d / 2 + porchD - 0.1);
      post.castShadow = true;
      this.scene.add(post);
    }

    // 1st Floor Balcony (Walkable with balustrade)
    const balconyFloor = new THREE.Mesh(new THREE.BoxGeometry(w, 0.2, porchD), this.boardwalkMat);
    balconyFloor.position.set(x, h1 + 0.1, z + d / 2 + porchD / 2);
    this.registerOccluder(balconyFloor);
    this.scene.add(balconyFloor);

    // Balcony Railing & Balusters
    this.buildRailing(x, h1 + 0.2, z + d / 2 + porchD - 0.05, w, 'x');
    this.buildRailing(x - w / 2 + 0.05, h1 + 0.2, z + d / 2 + porchD / 2, porchD, 'z');
    this.buildRailing(x + w / 2 - 0.05, h1 + 0.2, z + d / 2 + porchD / 2, porchD, 'z');

    // Balcony Roof Awning on Timber Posts (hard-capped depth 1.2m, thin shingles 0.08m)
    const balRoofGeo = new THREE.BoxGeometry(w + 0.2, 0.04, porchD);
    const balRoof = new THREE.Mesh(balRoofGeo, this.roofShingleMat);
    balRoof.position.set(x, totalH, z + d / 2 + porchD / 2);
    balRoof.rotateX(-0.06);
    this.registerOccluder(balRoof);
    this.scene.add(balRoof);

    // Exterior Wooden Staircase on West Wall (matching Bild 2 & 3)
    const stairSteps = 16;
    const stairW = 1.2;
    const totalRise = h1;
    const totalRun = 6.2;
    const startZ = z + d / 2;
    const westX = x - w / 2 - stairW / 2 - 0.08;

    for (let s = 0; s < stairSteps; s++) {
      const frac = s / stairSteps;
      const sy = frac * totalRise;
      const sz = startZ - frac * totalRun;
      const tread = new THREE.Mesh(new THREE.BoxGeometry(stairW, 0.12, 0.42), this.boardwalkMat);
      tread.position.set(westX, sy + 0.06, sz);
      tread.castShadow = true;
      this.scene.add(tread);
    }
    // Diagonal handrail on stairs
    const handrailGeo = new THREE.BoxGeometry(0.1, 0.1, Math.hypot(totalRise, totalRun));
    const handrail = new THREE.Mesh(handrailGeo, this.woodDarkMat);
    handrail.position.set(westX - stairW / 2 + 0.05, totalRise / 2 + 0.8, startZ - totalRun / 2);
    handrail.rotateX(Math.atan2(totalRise, totalRun));
    this.scene.add(handrail);

    // Batwing Swing Doors on Ground Floor
    const doorL = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.6, 0.08), this.woodHoneyMat);
    doorL.position.set(x - 0.45, 1.2, z + d / 2 + 0.05);
    doorL.rotateY(0.25);
    const doorR = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.6, 0.08), this.woodHoneyMat);
    doorR.position.set(x + 0.45, 1.2, z + d / 2 + 0.05);
    doorR.rotateY(-0.25);
    this.scene.add(doorL);
    this.scene.add(doorR);

    // Saloon Signboard on Balcony Face
    const signTex = TextureGenerator.createSignboardTexture(
      "SMITHFIELD'S SALOON",
      'FINE WHISKEY · COLD BEER · BILLIARDS',
      '#22160d',
      '#ebdcb9',
      true
    );
    const signMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(8.5, 1.3),
      new THREE.MeshStandardMaterial({ map: signTex, roughness: 0.6 })
    );
    signMesh.position.set(x, h1 + 0.65, z + d / 2 + porchD + 0.02);
    this.registerOccluder(signMesh);
    this.scene.add(signMesh);

    // Warm Interior Windows
    this.addGlowingWindows(x - 4.5, 2.0, z + d / 2 + 0.02, 1.6, 1.8);
    this.addGlowingWindows(x + 4.5, 2.0, z + d / 2 + 0.02, 1.6, 1.8);
    this.addGlowingWindows(x - 4.5, h1 + 1.8, z + d / 2 + 0.02, 1.4, 1.6);
    this.addGlowingWindows(x + 4.5, h1 + 1.8, z + d / 2 + 0.02, 1.4, 1.6);
  }

  /**
   * Valentine General Store: False-front boomtown facade
   */
  private buildGeneralStore() {
    const x = 50.0;
    const z = 37.0;
    const w = 12.0;
    const d = 10.0;
    const wallH = 5.2;
    const falseFrontH = 7.4;

    // Main Building Body
    this.buildHollowBuilding(x, wallH / 2, z, w, wallH, d, this.woodHoneyMat);

    // Low Pitch Roof Behind False Front (reduced height 0.9m)
    this.buildGableRoofWithOcclusion(x, wallH, z, w, d, 0.9, 'z', this.woodHoneyMat);

    // High Rectangular False-Front Parapet Wall
    const ffGeo = new THREE.BoxGeometry(w + 0.4, falseFrontH - wallH + 1.2, 0.15);
    const ff = new THREE.Mesh(ffGeo, this.woodHoneyMat);
    ff.position.set(x, (wallH + falseFrontH) / 2, z + d / 2 + 0.15);
    ff.castShadow = true;
    this.registerOccluder(ff);
    this.scene.add(ff);

    // Decorative Stepped Cornice Moulding
    const corniceGeo = new THREE.BoxGeometry(w + 0.8, 0.4, 0.5);
    const cornice = new THREE.Mesh(corniceGeo, this.woodDarkMat);
    cornice.position.set(x, falseFrontH + 0.6, z + d / 2 + 0.15);
    this.registerOccluder(cornice);
    this.scene.add(cornice);

    // Front Timber Awning over Boardwalk (hard-capped to max 1.2m depth, thin 0.08m)
    const awningD = 1.0;
    const awningGeo = new THREE.BoxGeometry(w + 0.2, 0.04, awningD);
    const awning = new THREE.Mesh(awningGeo, this.woodDarkMat);
    awning.position.set(x, 3.6, z + d / 2 + awningD / 2);
    awning.rotateX(-0.06);
    this.registerOccluder(awning);
    this.scene.add(awning);

    // Awning Support Posts
    [-w / 2 + 0.2, 0, w / 2 - 0.2].forEach((px) => {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.08, 3.6, 0.08), this.woodDarkMat);
      post.position.set(x + px, 1.8, z + d / 2 + awningD);
      post.castShadow = true;
      this.scene.add(post);
    });

    // General Store Painted Signboard on False-Front
    const signTex = TextureGenerator.createSignboardTexture(
      'VALENTINE GENERAL STORE',
      'GROCERIES · TONICS · AMMUNITION · DRY GOODS',
      '#1b1610',
      '#ebdcb9',
      true
    );
    const signMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(8.0, 1.4),
      new THREE.MeshStandardMaterial({ map: signTex, roughness: 0.6 })
    );
    signMesh.position.set(x, 5.8, z + d / 2 + 0.35);
    this.registerOccluder(signMesh);
    this.scene.add(signMesh);

    // Large Double Windows & Entrance Door
    this.addGlowingWindows(x - 3.2, 1.8, z + d / 2 + 0.18, 2.0, 1.8);
    this.addGlowingWindows(x + 3.2, 1.8, z + d / 2 + 0.18, 2.0, 1.8);
  }

  /**
   * Valentine Doctor & Apotheke: Tall False-Front with prominent "DRUGS." signboard (exact match to Bild 3)
   */
  private buildDoctorClinic() {
    const x = 65.0;
    const z = 37.5;
    const w = 11.0;
    const d = 10.0;
    const wallH = 5.0;
    const falseFrontH = 7.6;

    // Sage-green clapboard clinic body
    this.buildHollowBuilding(x, wallH / 2, z, w, wallH, d, this.doctorClapboardMat);

    // Gabled roof behind false front (reduced height 0.9m)
    this.buildGableRoofWithOcclusion(x, wallH, z, w, d, 0.9, 'z', this.doctorClapboardMat);

    // Tall Boomtown False-Front Parapet Wall
    const ffGeo = new THREE.BoxGeometry(w + 0.4, falseFrontH - wallH + 1.4, 0.15);
    const ff = new THREE.Mesh(ffGeo, this.doctorClapboardMat);
    ff.position.set(x, (wallH + falseFrontH) / 2, z + d / 2 + 0.15);
    ff.castShadow = true;
    this.registerOccluder(ff);
    this.scene.add(ff);

    // Stepped Upper False-Front Peak
    const peakGeo = new THREE.BoxGeometry(6.0, 0.8, 0.15);
    const peak = new THREE.Mesh(peakGeo, this.doctorClapboardMat);
    peak.position.set(x, falseFrontH + 0.8, z + d / 2 + 0.15);
    this.registerOccluder(peak);
    this.scene.add(peak);

    // Prominent "DRUGS." Signboard (matching Bild 3: white/cream sign, bold black serif letters)
    const drugsSignTex = TextureGenerator.createSignboardTexture(
      'DRUGS.',
      'APOTHECARY & SURGERY',
      '#e4ded2',
      '#0d0d0d',
      false
    );
    const drugsSignMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(5.6, 1.4),
      new THREE.MeshStandardMaterial({ map: drugsSignTex, roughness: 0.65 })
    );
    drugsSignMesh.position.set(x, 6.0, z + d / 2 + 0.35);
    this.registerOccluder(drugsSignMesh);
    this.scene.add(drugsSignMesh);

    // Secondary Doctor Signboard
    const docSignTex = TextureGenerator.createSignboardTexture(
      'DR. BARNES · SURGEON',
      'HEALTH TONICS · SNAKE OIL · RESTORATIVES',
      '#162019',
      '#d4af37',
      true
    );
    const docSignMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(7.2, 0.9),
      new THREE.MeshStandardMaterial({ map: docSignTex, roughness: 0.6 })
    );
    docSignMesh.position.set(x, 4.4, z + d / 2 + 0.35);
    this.registerOccluder(docSignMesh);
    this.scene.add(docSignMesh);

    // Covered Awning on Posts over Elevated Boardwalk (hard-capped to max 1.2m depth, thin 0.08m)
    const awningD = 1.0;
    const awningGeo = new THREE.BoxGeometry(w + 0.2, 0.04, awningD);
    const awning = new THREE.Mesh(awningGeo, this.woodDarkMat);
    awning.position.set(x, 3.4, z + d / 2 + awningD / 2);
    awning.rotateX(-0.06);
    this.registerOccluder(awning);
    this.scene.add(awning);

    [-w / 2 + 0.2, w / 2 - 0.2].forEach((px) => {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.08, 3.4, 0.08), this.woodDarkMat);
      post.position.set(x + px, 1.7, z + d / 2 + awningD);
      post.castShadow = true;
      this.scene.add(post);
    });

    // Bay Display Window with medicine jars
    const bayGeo = new THREE.BoxGeometry(2.8, 1.8, 0.8);
    const bay = new THREE.Mesh(bayGeo, this.doctorClapboardMat);
    bay.position.set(x - 2.8, 1.8, z + d / 2 + 0.4);
    this.scene.add(bay);

    const bayGlass = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.6), this.windowGlowMat);
    bayGlass.position.set(x - 2.8, 1.8, z + d / 2 + 0.81);
    this.scene.add(bayGlass);
  }

  /**
   * Sheriff's Office & Jail: 2-part structure matching Bild 3
   * - Front weathered timber office with "★ SHERIFF ★" lettering and covered porch
   * - Rear brick jail block with red masonry, barred iron windows, and chimney
   */
  private buildSheriffOfficeAndJail() {
    const x = 80.0;
    const z = 37.5;

    // --- 1. Front Section: Weathered Timber Office ---
    const fW = 8.2;
    const fD = 6.2;
    const fH = 4.8;
    this.buildHollowBuilding(x - 2.0, fH / 2, z + 2.2, fW, fH, fD, this.woodDarkMat);

    // Front Office Gabled Roof (reduced height 0.8m)
    this.buildGableRoofWithOcclusion(x - 2.0, fH, z + 2.2, fW, fD, 0.8, 'x');

    // Covered Porch over boardwalk (hard-capped to max 1.2m depth, thin 0.08m)
    const porchD = 1.0;
    const porchRoof = new THREE.Mesh(new THREE.BoxGeometry(fW + 0.2, 0.04, porchD), this.roofShingleMat);
    porchRoof.position.set(x - 2.0, 3.2, z + 2.2 + fD / 2 + porchD / 2);
    porchRoof.rotateX(-0.06);
    this.registerOccluder(porchRoof);
    this.scene.add(porchRoof);

    // Porch posts
    [-fW / 2 + 0.15, fW / 2 - 0.15].forEach((px) => {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.08, 3.2, 0.08), this.woodDarkMat);
      post.position.set(x - 2.0 + px, 1.6, z + 2.2 + fD / 2 + porchD);
      post.castShadow = true;
      this.scene.add(post);
    });

    // Sheriff Signboard with Star Badge
    const signTex = TextureGenerator.createSignboardTexture(
      '★ SHERIFF ★',
      'TOWN OF VALENTINE · WANTED POSTERS',
      '#1a140f',
      '#ebdcb9',
      true
    );
    const signMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(5.2, 1.0),
      new THREE.MeshStandardMaterial({ map: signTex, roughness: 0.6 })
    );
    signMesh.position.set(x - 2.0, 3.8, z + 2.2 + fD / 2 + 0.05);
    this.registerOccluder(signMesh);
    this.scene.add(signMesh);

    // Steckbrief-Tafel (Bounty Board) on porch post
    const boardTex = TextureGenerator.createSignboardTexture(
      'WANTED',
      'DEAD OR ALIVE',
      '#ebdcb9',
      '#800000',
      true
    );
    const boardMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(0.7, 1.1),
      new THREE.MeshStandardMaterial({ map: boardTex, roughness: 0.8 })
    );
    boardMesh.position.set(x - 2.0 + fW / 2 - 0.15, 1.6, z + 2.2 + fD / 2 + porchD + 0.1);
    this.scene.add(boardMesh);

    // --- 2. Rear Section: Weathered Red Brick Jail Block (matching Bild 3) ---
    const jW = 6.4;
    const jD = 5.6;
    const jH = 3.8;
    this.buildHollowBuilding(x + 4.2, jH / 2, z - 1.8, jW, jH, jD, this.redBrickMat);

    // Low pitched hipped roof on brick jail
    const jRoof = new THREE.Mesh(new THREE.BoxGeometry(jW + 0.3, 0.4, jD + 0.3), this.roofShingleMat);
    jRoof.position.set(x + 4.2, jH + 0.2, z - 1.8);
    this.registerOccluder(jRoof);
    this.scene.add(jRoof);

    // Brick Chimney
    const chim = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.8, 0.8), this.redBrickMat);
    chim.position.set(x + 2.5, jH + 0.9, z - 3.2);
    chim.castShadow = true;
    this.scene.add(chim);

    // High Barred Iron Cell Windows
    [-1.2, 1.2].forEach((wx) => {
      const barFrame = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.8, 0.1), this.ironMat);
      barFrame.position.set(x + 4.2 + wx, 2.6, z - 1.8 + jD / 2 + 0.05);
      this.scene.add(barFrame);
      for (let b = -0.35; b <= 0.35; b += 0.22) {
        const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.75), this.ironMat);
        bar.position.set(x + 4.2 + wx + b, 2.6, z - 1.8 + jD / 2 + 0.06);
        this.scene.add(bar);
      }
    });

    // Barrels outside brick wall (matching Bild 3)
    [
      { bx: x + 6.8, bz: z + 0.8 },
      { bx: x + 7.4, bz: z + 0.4 },
      { bx: x + 7.0, bz: z + 1.4 }
    ].forEach((bp) => {
      const bGeo = new THREE.CylinderGeometry(0.38, 0.42, 0.95, 10);
      const barrel = new THREE.Mesh(bGeo, this.woodDarkMat);
      barrel.position.set(bp.bx, 0.48, bp.bz);
      barrel.castShadow = true;
      this.scene.add(barrel);
    });
  }

  /**
   * Valentine Bank: Classical Boomtown False Front
   */
  private buildBank() {
    const x = 95.0;
    const z = 38.0;
    const w = 11.5;
    const d = 10.0;
    const wallH = 5.2;
    const ffH = 7.2;

    this.buildHollowBuilding(x, wallH / 2, z, w, wallH, d, this.woodHoneyMat);

    this.buildGableRoofWithOcclusion(x, wallH, z, w, d, 0.9, 'z', this.stoneMat);

    // Stone/False-Front Parapet Wall with Arched Pediment
    const ff = new THREE.Mesh(new THREE.BoxGeometry(w + 0.4, ffH - wallH + 1.2, 0.15), this.stoneMat);
    ff.position.set(x, (wallH + ffH) / 2, z + d / 2 + 0.15);
    this.registerOccluder(ff);
    this.scene.add(ff);

    // Bank Signboard
    const signTex = TextureGenerator.createSignboardTexture(
      'VALENTINE BANK',
      'SAFE DEPOSIT · LOANS · GOLD EXCHANGE',
      '#18201a',
      '#d4af37',
      true
    );
    const signMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(7.8, 1.3),
      new THREE.MeshStandardMaterial({ map: signTex, roughness: 0.6 })
    );
    signMesh.position.set(x, 5.6, z + d / 2 + 0.35);
    this.registerOccluder(signMesh);
    this.scene.add(signMesh);

    this.addGlowingWindows(x - 3.2, 2.0, z + d / 2 + 0.18, 1.8, 2.0);
    this.addGlowingWindows(x + 3.2, 2.0, z + d / 2 + 0.18, 1.8, 2.0);
  }

  /**
   * Valentine Gunsmith & Blacksmith
   */
  private buildGunsmithAndBlacksmith() {
    const x = 108.0;
    const z = 39.0;
    const w = 11.0;
    const d = 9.0;
    const wallH = 4.6;

    this.buildHollowBuilding(x, wallH / 2, z, w, wallH, d, this.woodDarkMat);

    this.buildGableRoofWithOcclusion(x, wallH, z, w, d, 0.9, 'x', this.woodDarkMat);

    // Forge Chimney
    const chim = new THREE.Mesh(new THREE.BoxGeometry(1.4, 4.2, 1.4), this.stoneMat);
    chim.position.set(x + w / 2 - 1.0, wallH + 1.2, z - 2.0);
    chim.castShadow = true;
    this.scene.add(chim);

    // Gunsmith Signboard
    const signTex = TextureGenerator.createSignboardTexture(
      'VALENTINE GUNSMITH',
      'REPEATING RIFLES · REVOLVERS · AMMO · CUSTOM ENGRAVING',
      '#1b120c',
      '#ebdcb9',
      true
    );
    const signMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(7.5, 1.2),
      new THREE.MeshStandardMaterial({ map: signTex, roughness: 0.6 })
    );
    signMesh.position.set(x, 3.8, z + d / 2 + 0.05);
    this.registerOccluder(signMesh);
    this.scene.add(signMesh);

    // Exterior Anvil & Wagon Wheel
    const anvil = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.6, 0.3), this.ironMat);
    anvil.position.set(x - 3.5, 0.3, z + d / 2 + 1.4);
    this.scene.add(anvil);
  }

  /**
   * Baustelle (Haus im Bau) matching Bild 2:
   * Vertical studs, exposed rafters, timber floor deck, stacked lumber, saw horses, tarps
   */
  private buildHouseUnderConstruction() {
    const x = 49.0;
    const z = 54.0;
    const w = 11.5;
    const d = 8.0;
    const floorH = 0.45;
    const studH = 3.6;

    // 1. Raised Timber Foundation & Floor Deck (Pine subfloor)
    const deckGeo = new THREE.BoxGeometry(w, floorH, d);
    const deck = new THREE.Mesh(deckGeo, this.woodHoneyMat);
    deck.position.set(x, floorH / 2, z);
    deck.receiveShadow = true;
    this.scene.add(deck);

    // 2. Vertical Wall Studs (2x4 pine framing)
    const studThickness = 0.12;
    const studGeo = new THREE.BoxGeometry(studThickness, studH, studThickness);

    // North wall studs (facing street)
    const studCountX = 9;
    for (let i = 0; i < studCountX; i++) {
      // Leave entrance opening
      if (i === 4 || i === 5) continue;
      const sx = x - w / 2 + (i / (studCountX - 1)) * w;
      const stud = new THREE.Mesh(studGeo, this.woodHoneyMat);
      stud.position.set(sx, floorH + studH / 2, z + d / 2);
      stud.castShadow = true;
      this.scene.add(stud);
    }

    // South wall studs
    for (let i = 0; i < studCountX; i++) {
      const sx = x - w / 2 + (i / (studCountX - 1)) * w;
      const stud = new THREE.Mesh(studGeo, this.woodHoneyMat);
      stud.position.set(sx, floorH + studH / 2, z - d / 2);
      stud.castShadow = true;
      this.scene.add(stud);
    }

    // East & West wall studs
    const studCountZ = 6;
    for (let i = 0; i < studCountZ; i++) {
      const sz = z - d / 2 + (i / (studCountZ - 1)) * d;
      const studW = new THREE.Mesh(studGeo, this.woodHoneyMat);
      studW.position.set(x - w / 2, floorH + studH / 2, sz);
      this.scene.add(studW);

      const studE = new THREE.Mesh(studGeo, this.woodHoneyMat);
      studE.position.set(x + w / 2, floorH + studH / 2, sz);
      this.scene.add(studE);
    }

    // 3. Top Wall Plates / Headers
    const topPlateN = new THREE.Mesh(new THREE.BoxGeometry(w, 0.14, 0.14), this.woodHoneyMat);
    topPlateN.position.set(x, floorH + studH, z + d / 2);
    this.scene.add(topPlateN);

    const topPlateS = new THREE.Mesh(new THREE.BoxGeometry(w, 0.14, 0.14), this.woodHoneyMat);
    topPlateS.position.set(x, floorH + studH, z - d / 2);
    this.scene.add(topPlateS);

    // 4. Exposed Roof Rafters / Trusses (matching Bild 2)
    const rafterCount = 8;
    const ridgeH = 1.8;
    for (let r = 0; r < rafterCount; r++) {
      const rx = x - w / 2 + (r / (rafterCount - 1)) * w;
      // North slope rafter
      const rN = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.12, Math.hypot(d / 2, ridgeH)), this.woodHoneyMat);
      rN.position.set(rx, floorH + studH + ridgeH / 2, z + d / 4);
      rN.rotateX(Math.atan2(ridgeH, d / 2));
      rN.castShadow = true;
      this.registerOccluder(rN);
      this.scene.add(rN);

      // South slope rafter
      const rS = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.12, Math.hypot(d / 2, ridgeH)), this.woodHoneyMat);
      rS.position.set(rx, floorH + studH + ridgeH / 2, z - d / 4);
      rS.rotateX(-Math.atan2(ridgeH, d / 2));
      rS.castShadow = true;
      this.registerOccluder(rS);
      this.scene.add(rS);
    }

    // 5. Construction Props: Stacked Lumber, Saw Horses, Tarps
    // Stack of pine lumber boards
    const lumberGeo = new THREE.BoxGeometry(3.6, 0.6, 1.4);
    const lumber = new THREE.Mesh(lumberGeo, this.woodHoneyMat);
    lumber.position.set(x - 3.2, floorH + 0.3, z - 1.2);
    lumber.castShadow = true;
    this.scene.add(lumber);

    // Second stack outside
    const lumberOut = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.8, 1.6), this.woodHoneyMat);
    lumberOut.position.set(x - w / 2 - 2.4, 0.4, z + 1.5);
    lumberOut.castShadow = true;
    this.scene.add(lumberOut);

    // Saw horse (Sägebock)
    this.buildSawHorse(x + 2.5, floorH, z + 1.2);
    this.buildSawHorse(x + 2.5, floorH, z - 1.2);

    // Folded Canvas Tarp draped over lumber
    const tarpGeo = new THREE.BoxGeometry(2.4, 0.3, 1.8);
    const tarp = new THREE.Mesh(tarpGeo, this.tentCanvasMat);
    tarp.position.set(x - 3.2, floorH + 0.72, z - 1.2);
    this.scene.add(tarp);
  }

  /**
   * South Commercial Buildings & Hotel (South Main Street row)
   */
  private buildSouthResidences() {
    // Building 1: South Commercial Store / Boarding House
    const x1 = 68.0;
    const z1 = 55.0;
    const w1 = 12.0;
    const d1 = 9.5;
    const h1 = 5.2;

    this.buildHollowBuilding(x1, h1 / 2, z1, w1, h1, d1, this.woodDarkMat);
    this.buildGableRoofWithOcclusion(x1, h1, z1, w1, d1, 1.0, 'z', this.woodDarkMat);

    // Building 2: South Hotel
    const x2 = 83.0;
    const z2 = 56.0;
    const w2 = 12.5;
    const d2 = 10.0;
    const h2 = 6.0;

    this.buildHollowBuilding(x2, h2 / 2, z2, w2, h2, d2, this.woodHoneyMat);
    this.buildGableRoofWithOcclusion(x2, h2, z2, w2, d2, 1.1, 'x', this.woodHoneyMat);

    const hotelSign = TextureGenerator.createSignboardTexture(
      'VALENTINE HOTEL',
      'ROOMS BY DAY OR WEEK · HOT BATHS',
      '#1c1611',
      '#ebdcb9',
      true
    );
    const hotelSignMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(7.2, 1.2),
      new THREE.MeshStandardMaterial({ map: hotelSign, roughness: 0.6 })
    );
    hotelSignMesh.position.set(x2, 4.6, z2 - d2 / 2 - 0.05);
    hotelSignMesh.rotateY(Math.PI);
    this.registerOccluder(hotelSignMesh);
    this.scene.add(hotelSignMesh);
  }

  /**
   * Sektor 3: Süd-Sektor (Viehhandel & Ställe)
   * - Valentine Livery Stable (Auktionshalle): Large barn with barrel-vault corrugated zinc roof, water tank (matching Bild 2)
   * - Corrals & Paddocks: Interconnected 3-rail split-rail fences with gates, feed troughs, hay bales
   * - Wagon Camp: Canvas tents, chuck wagons, campfire
   */
  private buildSouthSector() {
    this.buildValentineLiveryStable();
    this.buildLivestockCorrals();
    this.buildWagonCamp();
  }

  /**
   * Valentine Livery Stable (Auktionshalle) matching Bild 2
   */
  private buildValentineLiveryStable() {
    const x = 52.0;
    const z = 74.0;
    const w = 18.0;
    const d = 13.0;
    const wallH = 5.2;

    // Timber Barn Body
    this.buildHollowBuilding(x, wallH / 2, z, w, wallH, d, this.woodDarkMat);

    // Barrel-Vault / Arched Corrugated Zinc Roof (hard-capped height 1.17m <= 1.2m)
    const arcRadius = w / 2; // 9.0m radius to span entire 18m width
    const arcSegments = 24;
    const roofLen = d + 0.3; // Historical 0.15m eave overhang, <= 0.5 units
    const arcGeo = new THREE.CylinderGeometry(arcRadius, arcRadius, roofLen, arcSegments, 1, true, 0, Math.PI);
    arcGeo.rotateX(-Math.PI / 2);

    const roofMesh = new THREE.Mesh(arcGeo, this.corrugatedMetalMat);
    roofMesh.position.set(x, wallH, z);
    roofMesh.scale.set(1.0, 0.13, 1.0);
    roofMesh.castShadow = true;
    this.registerOccluder(roofMesh);
    this.scene.add(roofMesh);

    // Arched Gable End Caps
    const gableNorthGeo = new THREE.CylinderGeometry(arcRadius, arcRadius, 0.12, arcSegments, 1, false, 0, Math.PI);
    gableNorthGeo.rotateX(-Math.PI / 2);
    const gableNorth = new THREE.Mesh(gableNorthGeo, this.woodDarkMat);
    gableNorth.position.set(x, wallH, z + d / 2);
    gableNorth.scale.set(1.0, 0.13, 1.0);
    this.registerOccluder(gableNorth);
    this.scene.add(gableNorth);

    const gableSouth = gableNorth.clone();
    gableSouth.position.z = z - d / 2;
    this.registerOccluder(gableSouth);
    this.scene.add(gableSouth);

    // Sliding Timber Barn Doors
    const doorGeo = new THREE.BoxGeometry(2.4, 3.8, 0.12);
    const doorL = new THREE.Mesh(doorGeo, this.woodHoneyMat);
    doorL.position.set(x - 1.25, 1.9, z - d / 2 - 0.08);
    const doorR = new THREE.Mesh(doorGeo, this.woodHoneyMat);
    doorR.position.set(x + 1.25, 1.9, z - d / 2 - 0.08);
    this.scene.add(doorL);
    this.scene.add(doorR);

    // Sliding Track Beam above doors
    const trackBeam = new THREE.Mesh(new THREE.BoxGeometry(6.4, 0.18, 0.18), this.ironMat);
    trackBeam.position.set(x, 4.0, z - d / 2 - 0.16);
    this.scene.add(trackBeam);

    // Hay Hoist Beam & Pulley projecting from upper gable
    const hoistBeam = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 2.4), this.woodDarkMat);
    hoistBeam.position.set(x, wallH + 3.2, z - d / 2 - 1.0);
    this.scene.add(hoistBeam);

    // Cylindrical Wooden Water Tank on West Wall (matching Bild 2)
    const tankGeo = new THREE.CylinderGeometry(1.4, 1.4, 3.4, 16);
    const tank = new THREE.Mesh(tankGeo, this.woodDarkMat);
    tank.position.set(x - w / 2 - 1.6, 2.0, z);
    tank.castShadow = true;
    this.scene.add(tank);

    // Iron Hoops on Water Tank
    [0.8, 2.0, 3.2].forEach((hy) => {
      const hoop = new THREE.Mesh(new THREE.TorusGeometry(1.42, 0.03, 8, 24), this.ironMat);
      hoop.position.set(x - w / 2 - 1.6, hy, z);
      hoop.rotateX(Math.PI / 2);
      this.scene.add(hoop);
    });

    // Side Lean-To Covered Shelter on East Wall with stacked hay
    const leanGeo = new THREE.BoxGeometry(3.6, 0.15, d - 1.0);
    const lean = new THREE.Mesh(leanGeo, this.corrugatedMetalMat);
    lean.position.set(x + w / 2 + 1.8, 3.2, z);
    lean.rotateZ(-0.25);
    this.registerOccluder(lean);
    this.scene.add(lean);

    // Hay bales in lean-to
    for (let h = 0; h < 6; h++) {
      const hay = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.5, 1.2), this.hayMat);
      hay.position.set(x + w / 2 + 1.2 + (h % 2) * 0.9, 0.25 + Math.floor(h / 2) * 0.52, z - 3.0 + h * 0.8);
      hay.castShadow = true;
      this.scene.add(hay);
    }

    // Large Arched Signboard across barn front
    const signTex = TextureGenerator.createSignboardTexture(
      'VALENTINE LIVERY & AUCTION STABLE',
      'HORSE CARE · SADDLERY · LIVESTOCK AUCTIONS',
      '#1b130a',
      '#ebdcb9',
      true
    );
    const signMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(10.5, 1.5),
      new THREE.MeshStandardMaterial({ map: signTex, roughness: 0.6 })
    );
    signMesh.position.set(x, wallH + 1.2, z - d / 2 - 0.1);
    this.registerOccluder(signMesh);
    this.scene.add(signMesh);
  }

  /**
   * Livestock Corrals & Paddocks (Pferdekoppeln & Viehgatter)
   */
  private buildLivestockCorrals() {
    // Interconnected paddocks extending east of livery stable
    const p1X = 72.0;
    const p1Z = 74.0;
    const pW = 14.0;
    const pD = 12.0;

    // Outer split-rail fence lines
    this.buildSplitRailFence(p1X - pW / 2, p1Z - pD / 2, p1X + pW / 2, p1Z - pD / 2); // North
    this.buildSplitRailFence(p1X + pW / 2, p1Z - pD / 2, p1X + pW / 2, p1Z + pD / 2); // East
    this.buildSplitRailFence(p1X - pW / 2, p1Z + pD / 2, p1X + pW / 2, p1Z + pD / 2); // South
    this.buildSplitRailFence(p1X - pW / 2, p1Z - pD / 2, p1X - pW / 2, p1Z + 1.0);     // West with open gate

    // Second adjoining paddock to the east
    const p2X = 84.0;
    const p2Z = 74.0;
    const p2W = 10.0;
    this.buildSplitRailFence(p2X - p2W / 2, p1Z - pD / 2, p2X + p2W / 2, p1Z - pD / 2);
    this.buildSplitRailFence(p2X + p2W / 2, p1Z - pD / 2, p2X + p2W / 2, p1Z + pD / 2);
    this.buildSplitRailFence(p2X - p2W / 2, p1Z + pD / 2, p2X + p2W / 2, p1Z + pD / 2);

    // Feed troughs in paddocks
    const troughGeo = new THREE.BoxGeometry(2.8, 0.65, 0.85);
    const trough1 = new THREE.Mesh(troughGeo, this.woodDarkMat);
    trough1.position.set(p1X - 3.5, 0.35, p1Z - 3.5);
    this.scene.add(trough1);

    const trough2 = new THREE.Mesh(troughGeo, this.woodDarkMat);
    trough2.position.set(p2X, 0.35, p2Z - 3.5);
    this.scene.add(trough2);

    // Scattered round hay bales
    [
      { x: p1X + 3.0, z: p1Z + 2.5 },
      { x: p1X - 2.5, z: p1Z + 3.0 },
      { x: p2X + 2.0, z: p2Z + 2.0 }
    ].forEach((hp) => {
      const hayGeo = new THREE.CylinderGeometry(0.65, 0.65, 1.2, 12);
      const hay = new THREE.Mesh(hayGeo, this.hayMat);
      hay.position.set(hp.x, 0.65, hp.z);
      hay.rotateZ(Math.PI / 2);
      hay.castShadow = true;
      this.scene.add(hay);
    });

    // 1. "AUCTION YARD" Entrance Wooden Archway Gate matching Bild 2
    const gateX = p1X;
    const gateZ = p1Z + pD / 2; // Southern entrance
    const postGeo = new THREE.CylinderGeometry(0.18, 0.22, 4.4, 8);
    const postLeft = new THREE.Mesh(postGeo, this.woodDarkMat);
    postLeft.position.set(gateX - 2.8, 2.2, gateZ);
    postLeft.castShadow = true;
    this.scene.add(postLeft);

    const postRight = new THREE.Mesh(postGeo, this.woodDarkMat);
    postRight.position.set(gateX + 2.8, 2.2, gateZ);
    postRight.castShadow = true;
    this.scene.add(postRight);

    const beamCross = new THREE.Mesh(new THREE.BoxGeometry(6.2, 0.24, 0.24), this.woodDarkMat);
    beamCross.position.set(gateX, 4.2, gateZ);
    beamCross.castShadow = true;
    this.scene.add(beamCross);

    const auctionSignTex = TextureGenerator.createSignboardTexture(
      'AUCTION YARD',
      'JACKSON / WORTH · LIVESTOCK',
      '#e0dacb',
      '#800000',
      true
    );
    const auctionSignMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(4.4, 0.9),
      new THREE.MeshStandardMaterial({ map: auctionSignTex, roughness: 0.6 })
    );
    auctionSignMesh.position.set(gateX, 3.8, gateZ + 0.14);
    this.scene.add(auctionSignMesh);

    // 2. Sheep grazing inside the Auction Yard corrals (matching Bild 2)
    const sheepPositions = [
      { x: p1X - 3.2, z: p1Z - 1.5, rot: 0.4 },
      { x: p1X - 1.2, z: p1Z + 2.2, rot: -0.8 },
      { x: p1X + 2.4, z: p1Z - 2.8, rot: 1.2 },
      { x: p1X + 3.5, z: p1Z + 1.0, rot: -1.7 },
      { x: p1X + 0.8, z: p1Z - 0.5, rot: 2.1 },
      { x: p2X - 2.5, z: p2Z - 1.2, rot: 0.6 },
      { x: p2X + 1.5, z: p2Z + 1.8, rot: -0.9 },
      { x: p2X + 2.8, z: p2Z - 2.2, rot: 1.5 }
    ];

    const sheepWoolMat = new THREE.MeshStandardMaterial({ color: 0xeeece2, roughness: 0.95 });
    const sheepHeadMat = new THREE.MeshStandardMaterial({ color: 0x2c2621, roughness: 0.7 });

    sheepPositions.forEach((sp) => {
      const sheepGroup = new THREE.Group();
      // Body
      const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.32, 0.55, 6, 8), sheepWoolMat);
      body.rotation.x = Math.PI / 2;
      body.position.y = 0.48;
      body.castShadow = true;
      sheepGroup.add(body);

      // Head
      const head = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.32, 6), sheepHeadMat);
      head.rotation.x = -Math.PI / 3;
      head.position.set(0, 0.52, 0.42);
      head.castShadow = true;
      sheepGroup.add(head);

      // 4 tiny legs
      const legGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.35, 4);
      [
        { lx: -0.16, lz: -0.22 },
        { lx: 0.16, lz: -0.22 },
        { lx: -0.16, lz: 0.22 },
        { lx: 0.16, lz: 0.22 }
      ].forEach((l) => {
        const leg = new THREE.Mesh(legGeo, sheepHeadMat);
        leg.position.set(l.lx, 0.18, l.lz);
        sheepGroup.add(leg);
      });

      sheepGroup.position.set(sp.x, 0, sp.z);
      sheepGroup.rotation.y = sp.rot;
      this.scene.add(sheepGroup);
    });

    // 3. Wooden Freight Wagon / Chuck Wagon parked by corral (matching Bild 2 & 3)
    const wagonGroup = new THREE.Group();
    // Wagon Bed
    const wagonBed = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.8, 3.4), this.woodDarkMat);
    wagonBed.position.y = 0.95;
    wagonBed.castShadow = true;
    wagonGroup.add(wagonBed);

    // 4 Wagon Wheels with spokes
    const wheelGeo = new THREE.CylinderGeometry(0.48, 0.48, 0.1, 14);
    wheelGeo.rotateZ(Math.PI / 2);
    [
      { wx: -0.9, wz: -1.2 },
      { wx: 0.9, wz: -1.2 },
      { wx: -0.9, wz: 1.2 },
      { wx: 0.9, wz: 1.2 }
    ].forEach((w) => {
      const wheel = new THREE.Mesh(wheelGeo, this.woodDarkMat);
      wheel.position.set(w.wx, 0.48, w.wz);
      wheel.castShadow = true;
      wagonGroup.add(wheel);
    });

    wagonGroup.position.set(p1X - pW / 2 - 3.2, 0, p1Z + 2.0);
    wagonGroup.rotation.y = 0.35;
    this.scene.add(wagonGroup);
  }

  /**
   * Wagon Camp matching Bild 2 (Canvas tents, chuck wagons, campfire)
   */
  private buildWagonCamp() {
    const campX = 96.0;
    const campZ = 74.0;

    // 1. Canvas Wall Tent
    this.buildCanvasTent(campX - 3.5, campZ - 2.5, 3.8, 3.2, 2.6);
    // 2. A-Frame Wedge Tent
    this.buildCanvasTent(campX + 3.0, campZ - 1.5, 3.0, 2.8, 2.2);

    // 3. Campfire with stone ring
    const stoneCount = 10;
    for (let i = 0; i < stoneCount; i++) {
      const angle = (i / stoneCount) * Math.PI * 2;
      const stone = new THREE.Mesh(new THREE.DodecahedronGeometry(0.18), this.stoneMat);
      stone.position.set(campX + Math.cos(angle) * 0.9, 0.12, campZ + 2.0 + Math.sin(angle) * 0.9);
      this.scene.add(stone);
    }
    // Charred firewood
    const log1 = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.8), this.woodDarkMat);
    log1.position.set(campX, 0.15, campZ + 2.0);
    log1.rotateZ(0.6);
    const log2 = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.8), this.woodDarkMat);
    log2.position.set(campX, 0.15, campZ + 2.0);
    log2.rotateX(0.7);
    this.scene.add(log1);
    this.scene.add(log2);

    // Warm embers point light
    const fireLight = new THREE.PointLight(0xff7722, 1.5, 12);
    fireLight.position.set(campX, 0.45, campZ + 2.0);
    this.scene.add(fireLight);
  }

  /**
   * Sektor 4: Südost-Sektor (Infrastruktur)
   * - Valentine Train Station (wooden platform, station house, ticket window, telegraph)
   * - Railroad Tracks (curved steel rails, creosoted ties, gravel ballast)
   * - Railroad Water Tower (round tank on tall timber stilts for steam locomotives)
   */
  private buildSoutheastSector() {
    this.buildTrainStation();
    this.buildRailroadTracks();
    this.buildRailroadWaterTower();
    this.buildTelegraphLine();
  }

  /**
   * Valentine Train Station & Passenger Platform
   */
  private buildTrainStation() {
    const x = 122.0;
    const z = 78.0;
    const sW = 16.0;
    const sD = 8.5;
    const sH = 4.8;

    // Station House
    this.buildHollowBuilding(x, sH / 2, z, sW, sH, sD, this.woodDarkMat);

    // Overhanging Gabled Roof (reduced height 1.1m)
    this.buildGableRoofWithOcclusion(x, sH, z, sW, sD, 1.1, 'x', this.woodDarkMat);

    // Extended Wooden Station Platform along Track (26m long x 4m wide)
    const platW = 28.0;
    const platD = 4.2;
    const platH = 0.45;
    const plat = new THREE.Mesh(new THREE.BoxGeometry(platW, platH, platD), this.boardwalkMat);
    plat.position.set(x, platH / 2, z + sD / 2 + platD / 2);
    plat.receiveShadow = true;
    this.scene.add(plat);

    // Station Roof Canopy over Platform (hard-capped depth 1.2m, thin 0.08m)
    const canopy = new THREE.Mesh(new THREE.BoxGeometry(platW, 0.04, 1.0), this.roofShingleMat);
    canopy.position.set(x, 3.8, z + sD / 2 + 0.5);
    canopy.rotateX(-0.06);
    this.registerOccluder(canopy);
    this.scene.add(canopy);

    // Canopy Timber Posts along edge of platform
    const cPostCount = 6;
    for (let p = 0; p < cPostCount; p++) {
      const cpx = x - platW / 2 + 1.5 + (p / (cPostCount - 1)) * (platW - 3.0);
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.08, 3.8, 0.08), this.woodDarkMat);
      post.position.set(cpx, 1.9, z + sD / 2 + platD - 0.15);
      post.castShadow = true;
      this.scene.add(post);
    }

    // Painted Station Signboard
    const signTex = TextureGenerator.createSignboardTexture(
      'VALENTINE',
      'CORNWALL K. & P. RAILROAD · TELEGRAPH OFFICE',
      '#1e1812',
      '#ebdcb9',
      true
    );
    const signMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(9.0, 1.3),
      new THREE.MeshStandardMaterial({ map: signTex, roughness: 0.6 })
    );
    signMesh.position.set(x, 4.0, z + sD / 2 + platD + 0.05);
    this.registerOccluder(signMesh);
    this.scene.add(signMesh);

    // Passenger Benches on Platform
    [-6.0, 6.0].forEach((bx) => {
      const bench = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.5, 0.6), this.woodHoneyMat);
      bench.position.set(x + bx, platH + 0.25, z + sD / 2 + 1.2);
      this.scene.add(bench);
    });
  }

  /**
   * Curved Railroad Tracks curving from South to Northeast (matching Map 1)
   */
  private buildRailroadTracks() {
    const startX = 110.0;
    const endX = 146.0;
    const tieSpacing = 0.9;
    const gauge = 1.435; // Standard gauge width

    const getTrackZ = (rx: number) => {
      // Curving track path matching Map 1
      return 105.0 - (rx - 105.0) * 1.05 + Math.pow((rx - 105.0) / 22.0, 2) * 2.2;
    };

    // Place Creosoted Wooden Ties along the track
    const tieGeo = new THREE.BoxGeometry(2.6, 0.16, 0.28);
    for (let rx = startX; rx <= endX; rx += tieSpacing) {
      const rz = getTrackZ(rx);
      const nextZ = getTrackZ(rx + 0.1);
      const angle = Math.atan2(nextZ - rz, 0.1);

      const tie = new THREE.Mesh(tieGeo, this.woodDarkMat);
      tie.position.set(rx, 0.08, rz);
      tie.rotateY(-angle);
      tie.receiveShadow = true;
      this.scene.add(tie);
    }

    // Steel Rails (North Rail and South Rail) using continuous path curves
    const pointsN: THREE.Vector3[] = [];
    const pointsS: THREE.Vector3[] = [];

    for (let rx = startX; rx <= endX; rx += 1.5) {
      const rz = getTrackZ(rx);
      const nextZ = getTrackZ(rx + 0.1);
      const angle = Math.atan2(nextZ - rz, 0.1);

      const normX = -Math.sin(angle) * (gauge / 2);
      const normZ = Math.cos(angle) * (gauge / 2);

      pointsN.push(new THREE.Vector3(rx - normX, 0.22, rz - normZ));
      pointsS.push(new THREE.Vector3(rx + normX, 0.22, rz + normZ));
    }

    const curveN = new THREE.CatmullRomCurve3(pointsN);
    const curveS = new THREE.CatmullRomCurve3(pointsS);

    const railGeoN = new THREE.TubeGeometry(curveN, 48, 0.06, 6, false);
    const railGeoS = new THREE.TubeGeometry(curveS, 48, 0.06, 6, false);

    const railMeshN = new THREE.Mesh(railGeoN, this.steelRailMat);
    const railMeshS = new THREE.Mesh(railGeoS, this.steelRailMat);
    railMeshN.castShadow = true;
    railMeshS.castShadow = true;

    this.scene.add(railMeshN);
    this.scene.add(railMeshS);
  }

  /**
   * Railroad Water Tower on tall timber stilts for steam locomotives
   */
  private buildRailroadWaterTower() {
    const x = 135.0;
    const z = 76.0;
    const stiltH = 6.2;
    const tankRadius = 2.4;
    const tankH = 3.6;

    // 6 Diagonal Timber Stilt Legs
    const stiltLegCount = 6;
    for (let i = 0; i < stiltLegCount; i++) {
      const angle = (i / stiltLegCount) * Math.PI * 2;
      const legX = Math.cos(angle) * 1.8;
      const legZ = Math.sin(angle) * 1.8;

      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, stiltH), this.woodDarkMat);
      leg.position.set(x + legX, stiltH / 2, z + legZ);
      leg.castShadow = true;
      this.scene.add(leg);
    }

    // Heavy Timber Cross Bracing
    const platform = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.6, 0.35, 12), this.woodDarkMat);
    platform.position.set(x, stiltH + 0.18, z);
    this.scene.add(platform);

    // Cylindrical Wooden Tank
    const tank = new THREE.Mesh(new THREE.CylinderGeometry(tankRadius, tankRadius, tankH, 16), this.woodHoneyMat);
    tank.position.set(x, stiltH + 0.35 + tankH / 2, z);
    tank.castShadow = true;
    this.registerOccluder(tank);
    this.scene.add(tank);

    // Conical Roof
    const roof = new THREE.Mesh(new THREE.ConeGeometry(tankRadius + 0.3, 1.6, 16), this.roofShingleMat);
    roof.position.set(x, stiltH + 0.35 + tankH + 0.8, z);
    this.registerOccluder(roof);
    this.scene.add(roof);

    // Steel Hoop Bands
    [1.0, 2.0, 3.0].forEach((by) => {
      const hoop = new THREE.Mesh(new THREE.TorusGeometry(tankRadius + 0.02, 0.03, 6, 24), this.ironMat);
      hoop.position.set(x, stiltH + 0.35 + by, z);
      hoop.rotateX(Math.PI / 2);
      this.scene.add(hoop);
    });

    // Pivoting Locomotive Discharge Water Spout Pipe
    const spout = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.12, 3.2), this.ironMat);
    spout.position.set(x - 2.0, stiltH + 1.2, z + 1.8);
    spout.rotateZ(0.65);
    this.scene.add(spout);
  }

  /**
   * Telegraph Poles along Main Street and along Railroad Line
   */
  private buildTelegraphLine() {
    const poleLocations = [
      { x: 26.0, z: 42.0 },
      { x: 46.0, z: 43.5 },
      { x: 68.0, z: 44.5 },
      { x: 88.0, z: 45.0 },
      { x: 108.0, z: 47.0 },
      { x: 126.0, z: 51.0 },
      { x: 138.0, z: 68.0 },
      { x: 144.0, z: 86.0 }
    ];

    const poleGeo = new THREE.CylinderGeometry(0.12, 0.16, 7.5, 8);
    const crossbarGeo = new THREE.BoxGeometry(2.4, 0.12, 0.12);

    poleLocations.forEach((p) => {
      const pole = new THREE.Mesh(poleGeo, this.woodDarkMat);
      pole.position.set(p.x, 3.75, p.z);
      pole.castShadow = true;
      this.scene.add(pole);

      const crossbar = new THREE.Mesh(crossbarGeo, this.woodDarkMat);
      crossbar.position.set(p.x, 7.0, p.z);
      crossbar.rotateY(0.2);
      this.scene.add(crossbar);

      // Ceramic Insulators
      [-0.9, -0.3, 0.3, 0.9].forEach((ix) => {
        const ins = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.15), this.glassMat);
        ins.position.set(p.x + ix, 7.15, p.z);
        this.scene.add(ins);
      });
    });

    // Sagging telegraph wire catenaries connecting the poles
    for (let i = 0; i < poleLocations.length - 1; i++) {
      const p1 = poleLocations[i];
      const p2 = poleLocations[i + 1];
      const midX = (p1.x + p2.x) / 2;
      const midZ = (p1.z + p2.z) / 2;
      const midY = 6.4; // 0.6m sag

      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(p1.x, 7.1, p1.z),
        new THREE.Vector3(midX, midY, midZ),
        new THREE.Vector3(p2.x, 7.1, p2.z)
      ]);

      const wireGeo = new THREE.TubeGeometry(curve, 16, 0.015, 4, false);
      const wire = new THREE.Mesh(wireGeo, this.ironMat);
      this.scene.add(wire);
    }
  }

  /**
   * Elevated Wooden Boardwalks along shop rows with small access steps
   */
  private buildBoardwalks() {
    // North Boardwalk: along Saloon, General Store, Doctor, Sheriff, Bank, Gunsmith
    const nbX = 24.0;
    const nbZ = 41.8;
    const nbW = 90.0;
    const nbD = 2.4;
    const nbH = 0.12;

    const northBoardwalk = new THREE.Mesh(new THREE.BoxGeometry(nbW, nbH, nbD), this.boardwalkMat);
    northBoardwalk.position.set(nbX + nbW / 2, nbH / 2, nbZ);
    northBoardwalk.receiveShadow = true;
    this.scene.add(northBoardwalk);

    // Access steps down to mud street every 14 meters
    for (let sx = nbX + 6.0; sx <= nbX + nbW - 6.0; sx += 14.0) {
      const step = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.06, 0.65), this.boardwalkMat);
      step.position.set(sx, 0.03, nbZ + nbD / 2 + 0.32);
      step.receiveShadow = true;
      this.scene.add(step);
    }

    // South Boardwalk: in front of South Residences & Hotel
    const sbX = 64.0;
    const sbZ = 49.5;
    const sbW = 34.0;
    const sbD = 2.2;
    const southBoardwalk = new THREE.Mesh(new THREE.BoxGeometry(sbW, nbH, sbD), this.boardwalkMat);
    southBoardwalk.position.set(sbX + sbW / 2, nbH / 2, sbZ);
    southBoardwalk.receiveShadow = true;
    this.scene.add(southBoardwalk);
  }

  /**
   * Hitching Posts (Pferde-Anbindebalken) and Street Props
   */
  private buildStreetFurniture() {
    const hitchLocations = [
      { x: 31.0, z: 43.5, label: 'Saloon' },
      { x: 49.0, z: 43.5, label: 'General Store' },
      { x: 64.0, z: 43.5, label: 'Doctor' },
      { x: 79.0, z: 43.5, label: 'Sheriff' },
      { x: 94.0, z: 43.5, label: 'Bank' }
    ];

    hitchLocations.forEach((h) => {
      // 2 vertical posts + horizontal tie bar
      const postL = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.2), this.woodDarkMat);
      postL.position.set(h.x - 2.0, 0.6, h.z);
      postL.castShadow = true;
      const postR = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.2), this.woodDarkMat);
      postR.position.set(h.x + 2.0, 0.6, h.z);
      postR.castShadow = true;

      const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 4.4), this.woodHoneyMat);
      bar.position.set(h.x, 1.05, h.z);
      bar.rotateZ(Math.PI / 2);
      bar.castShadow = true;

      this.scene.add(postL);
      this.scene.add(postR);
      this.scene.add(bar);
    });

    // Street Kerosene Lanterns on brackets
    [
      { x: 34.0, y: 3.2, z: 38.5 },
      { x: 50.0, y: 3.2, z: 39.5 },
      { x: 65.0, y: 3.2, z: 40.0 },
      { x: 80.0, y: 3.2, z: 40.0 },
      { x: 122.0, y: 3.4, z: 82.5 }
    ].forEach((lp) => {
      const lanternGeo = new THREE.BoxGeometry(0.25, 0.4, 0.25);
      const lanternMat = new THREE.MeshBasicMaterial({ color: 0xffcc66 });
      const lantern = new THREE.Mesh(lanternGeo, lanternMat);
      lantern.position.set(lp.x, lp.y, lp.z);
      this.scene.add(lantern);

      const light = new THREE.PointLight(0xffaa44, 0.8, 8);
      light.position.set(lp.x, lp.y, lp.z);
      this.scene.add(light);
    });

    // Freight cart parked on muddy street in front of doctor / sheriff (matching Bild 3)
    const streetCart = new THREE.Group();
    const cartBed = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.6, 2.8), this.woodDarkMat);
    cartBed.position.y = 0.8;
    cartBed.castShadow = true;
    streetCart.add(cartBed);
    const cartWheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.08, 12);
    cartWheelGeo.rotateZ(Math.PI / 2);
    [-0.85, 0.85].forEach((wx) => {
      [-0.9, 0.9].forEach((wz) => {
        const wheel = new THREE.Mesh(cartWheelGeo, this.woodDarkMat);
        wheel.position.set(wx, 0.42, wz);
        wheel.castShadow = true;
        streetCart.add(wheel);
      });
    });
    streetCart.position.set(58.0, 0, 48.2);
    streetCart.rotation.y = -0.4;
    this.scene.add(streetCart);
  }

  private buildWaterTrough() {
    const troughGeo = new THREE.BoxGeometry(2.8, 0.7, 1.2);
    const trough = new THREE.Mesh(troughGeo, this.woodDarkMat);
    trough.position.set(46.0, 0.35, 43.6);
    trough.castShadow = true;
    this.scene.add(trough);

    const waterGeo = new THREE.PlaneGeometry(2.6, 1.0);
    waterGeo.rotateX(-Math.PI / 2);
    const water = new THREE.Mesh(waterGeo, this.puddleMat);
    water.position.set(46.0, 0.65, 43.6);
    this.scene.add(water);
  }

  /**
   * Helper: Gabled Roof with tight eaves and triangular pediment caps (reduced shingle depth to 0.05m)
   */
  private buildGableRoofWithOcclusion(
    cx: number,
    baseY: number,
    cz: number,
    w: number,
    d: number,
    height: number,
    ridgeAxis: 'x' | 'z',
    wallMat: THREE.Material = this.woodDarkMat
  ) {
    const cappedHeight = Math.min(height, 0.8);
    const shingleThickness = 0.04;
    const eaveOverhang = 0.15; // Tight historical eave overhang (strictly <= 0.5 units)
    if (ridgeAxis === 'x') {
      const halfD = d / 2 + eaveOverhang;
      const slopeLen = Math.hypot(halfD, cappedHeight);
      const angle = Math.atan2(cappedHeight, halfD);

      // A-frame slopes (ridge at cz is apex, thin shingles 0.08m)
      const nSlope = new THREE.Mesh(new THREE.BoxGeometry(w + 0.15, shingleThickness, slopeLen), this.roofShingleMat);
      nSlope.position.set(cx, baseY + cappedHeight / 2, cz - halfD / 2);
      nSlope.rotateX(-angle);
      this.registerOccluder(nSlope);
      this.scene.add(nSlope);

      const sSlope = new THREE.Mesh(new THREE.BoxGeometry(w + 0.15, shingleThickness, slopeLen), this.roofShingleMat);
      sSlope.position.set(cx, baseY + cappedHeight / 2, cz + halfD / 2);
      sSlope.rotateX(angle);
      this.registerOccluder(sSlope);
      this.scene.add(sSlope);

      // Triangular pediments at West and East gable walls
      const triGeoWest = new THREE.BufferGeometry();
      triGeoWest.setAttribute('position', new THREE.Float32BufferAttribute([
        0, 0, -d / 2,
        0, 0, d / 2,
        0, cappedHeight, 0
      ], 3));
      triGeoWest.computeVertexNormals();
      const westPed = new THREE.Mesh(triGeoWest, wallMat);
      westPed.position.set(cx - w / 2, baseY, cz);
      this.registerOccluder(westPed);
      this.scene.add(westPed);

      const triGeoEast = new THREE.BufferGeometry();
      triGeoEast.setAttribute('position', new THREE.Float32BufferAttribute([
        0, 0, d / 2,
        0, 0, -d / 2,
        0, cappedHeight, 0
      ], 3));
      triGeoEast.computeVertexNormals();
      const eastPed = new THREE.Mesh(triGeoEast, wallMat);
      eastPed.position.set(cx + w / 2, baseY, cz);
      this.registerOccluder(eastPed);
      this.scene.add(eastPed);
    } else {
      const halfW = w / 2 + eaveOverhang;
      const slopeLen = Math.hypot(halfW, cappedHeight);
      const angle = Math.atan2(cappedHeight, halfW);

      // A-frame slopes (ridge at cx is apex, thin shingles 0.08m)
      const wSlope = new THREE.Mesh(new THREE.BoxGeometry(slopeLen, shingleThickness, d + 0.15), this.roofShingleMat);
      wSlope.position.set(cx - halfW / 2, baseY + cappedHeight / 2, cz);
      wSlope.rotateZ(angle);
      this.registerOccluder(wSlope);
      this.scene.add(wSlope);

      const eSlope = new THREE.Mesh(new THREE.BoxGeometry(slopeLen, shingleThickness, d + 0.15), this.roofShingleMat);
      eSlope.position.set(cx + halfW / 2, baseY + cappedHeight / 2, cz);
      eSlope.rotateZ(-angle);
      this.registerOccluder(eSlope);
      this.scene.add(eSlope);

      // Triangular pediments at North and South gable walls
      const triGeoNorth = new THREE.BufferGeometry();
      triGeoNorth.setAttribute('position', new THREE.Float32BufferAttribute([
        -w / 2, 0, 0,
        0, cappedHeight, 0,
        w / 2, 0, 0
      ], 3));
      triGeoNorth.computeVertexNormals();
      const northPed = new THREE.Mesh(triGeoNorth, wallMat);
      northPed.position.set(cx, baseY, cz - d / 2);
      this.registerOccluder(northPed);
      this.scene.add(northPed);

      const triGeoSouth = new THREE.BufferGeometry();
      triGeoSouth.setAttribute('position', new THREE.Float32BufferAttribute([
        w / 2, 0, 0,
        0, cappedHeight, 0,
        -w / 2, 0, 0
      ], 3));
      triGeoSouth.computeVertexNormals();
      const southPed = new THREE.Mesh(triGeoSouth, wallMat);
      southPed.position.set(cx, baseY, cz + d / 2);
      this.registerOccluder(southPed);
      this.scene.add(southPed);
    }
  }

  private buildRailing(cx: number, cy: number, cz: number, length: number, axis: 'x' | 'z') {
    const topBarGeo = axis === 'x' ? new THREE.BoxGeometry(length, 0.08, 0.08) : new THREE.BoxGeometry(0.08, 0.08, length);
    const topBar = new THREE.Mesh(topBarGeo, this.woodDarkMat);
    topBar.position.set(cx, cy + 0.85, cz);
    this.scene.add(topBar);

    const postSpacing = 1.2;
    const count = Math.max(2, Math.floor(length / postSpacing));
    for (let i = 0; i <= count; i++) {
      const frac = i / count - 0.5;
      const px = axis === 'x' ? cx + frac * length : cx;
      const pz = axis === 'z' ? cz + frac * length : cz;
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.85, 0.08), this.woodDarkMat);
      post.position.set(px, cy + 0.42, pz);
      this.scene.add(post);
    }
  }

  private buildSplitRailFence(x1: number, z1: number, x2: number, z2: number) {
    const dist = Math.hypot(x2 - x1, z2 - z1);
    const postDist = 3.0;
    const postCount = Math.max(2, Math.ceil(dist / postDist));
    const angle = Math.atan2(z2 - z1, x2 - x1);

    for (let i = 0; i <= postCount; i++) {
      const frac = i / postCount;
      const px = x1 + frac * (x2 - x1);
      const pz = z1 + frac * (z2 - z1);

      const post = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.4, 0.16), this.woodDarkMat);
      post.position.set(px, 0.7, pz);
      post.castShadow = true;
      this.scene.add(post);
    }

    // 3 Horizontal Split Rails
    [0.35, 0.75, 1.15].forEach((ry) => {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(dist, 0.1, 0.08), this.woodDarkMat);
      rail.position.set((x1 + x2) / 2, ry, (z1 + z2) / 2);
      rail.rotateY(-angle);
      rail.castShadow = true;
      this.scene.add(rail);
    });
  }

  private buildFenceLine(x1: number, z1: number, x2: number, z2: number, baseY: number) {
    const dist = Math.hypot(x2 - x1, z2 - z1);
    const postCount = Math.max(2, Math.ceil(dist / 2.2));
    const angle = Math.atan2(z2 - z1, x2 - x1);

    for (let i = 0; i <= postCount; i++) {
      const frac = i / postCount;
      const px = x1 + frac * (x2 - x1);
      const pz = z1 + frac * (z2 - z1);
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.1, 0.12), this.woodDarkMat);
      post.position.set(px, baseY + 0.55, pz);
      this.scene.add(post);
    }

    [0.35, 0.8].forEach((ry) => {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(dist, 0.08, 0.06), this.woodDarkMat);
      rail.position.set((x1 + x2) / 2, baseY + ry, (z1 + z2) / 2);
      rail.rotateY(-angle);
      this.scene.add(rail);
    });
  }

  private buildCanvasTent(x: number, z: number, w: number, d: number, h: number) {
    // 2-slope A-frame canvas tent
    const slopeLen = Math.hypot(w / 2, h);
    const angle = Math.atan2(h, w / 2);

    const slopeL = new THREE.Mesh(new THREE.PlaneGeometry(slopeLen, d), this.tentCanvasMat);
    slopeL.position.set(x - w / 4, h / 2, z);
    slopeL.rotateY(Math.PI / 2);
    slopeL.rotateX(angle);
    this.registerOccluder(slopeL);
    this.scene.add(slopeL);

    const slopeR = new THREE.Mesh(new THREE.PlaneGeometry(slopeLen, d), this.tentCanvasMat);
    slopeR.position.set(x + w / 4, h / 2, z);
    slopeR.rotateY(Math.PI / 2);
    slopeR.rotateX(-angle);
    this.registerOccluder(slopeR);
    this.scene.add(slopeR);

    // Ridge pole
    const ridge = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, d), this.woodDarkMat);
    ridge.position.set(x, h, z);
    ridge.rotateX(Math.PI / 2);
    this.scene.add(ridge);
  }

  private buildSawHorse(x: number, y: number, z: number) {
    const beam = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.12, 0.12), this.woodHoneyMat);
    beam.position.set(x, y + 0.75, z);
    this.scene.add(beam);

    [-0.65, 0.65].forEach((lx) => {
      const leg1 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.85, 0.08), this.woodHoneyMat);
      leg1.position.set(x + lx, y + 0.38, z - 0.25);
      leg1.rotateX(0.25);
      const leg2 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.85, 0.08), this.woodHoneyMat);
      leg2.position.set(x + lx, y + 0.38, z + 0.25);
      leg2.rotateX(-0.25);
      this.scene.add(leg1);
      this.scene.add(leg2);
    });
  }

  private addGlowingWindows(x: number, y: number, z: number, w: number, h: number) {
    const group = new THREE.Group();
    group.position.set(x, y, z);

    const recess = 0.02;
    const win = new THREE.Mesh(new THREE.PlaneGeometry(w, h), this.windowGlowMat);
    win.position.set(0, 0, recess);
    group.add(win);

    const frameThick = 0.08;
    const frameDepth = 0.12;
    const fZ = recess + frameDepth / 2 - 0.04;

    const top = new THREE.Mesh(new THREE.BoxGeometry(w + frameThick * 2, frameThick, frameDepth), this.woodDarkMat);
    top.position.set(0, h / 2 + frameThick / 2, fZ);
    group.add(top);

    const bot = new THREE.Mesh(new THREE.BoxGeometry(w + frameThick * 2, frameThick, frameDepth), this.woodDarkMat);
    bot.position.set(0, -h / 2 - frameThick / 2, fZ);
    group.add(bot);

    const left = new THREE.Mesh(new THREE.BoxGeometry(frameThick, h, frameDepth), this.woodDarkMat);
    left.position.set(-w / 2 - frameThick / 2, 0, fZ);
    group.add(left);

    const right = new THREE.Mesh(new THREE.BoxGeometry(frameThick, h, frameDepth), this.woodDarkMat);
    right.position.set(w / 2 + frameThick / 2, 0, fZ);
    group.add(right);

    this.scene.add(group);
  }

  /**
   * Builds 3D interactive floating markers for all POIs defined in pois.json
   */
  private buildPOIMarkers() {
    this.poiMarkers = [];

    pois.forEach((poi) => {
      const group = new THREE.Group();
      const worldX = poi.x * ValentineBuilder.SCALE;
      const worldZ = poi.y * ValentineBuilder.SCALE;

      // Pulse ring on ground
      const ringGeo = new THREE.RingGeometry(1.2, 1.5, 24);
      ringGeo.rotateX(-Math.PI / 2);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0xd4af37,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.65
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.set(0, 0.06, 0);
      group.add(ring);

      // Icon Sprite
      const iconCanvas = document.createElement('canvas');
      iconCanvas.width = 128;
      iconCanvas.height = 128;
      const iCtx = iconCanvas.getContext('2d')!;
      iCtx.font = '72px sans-serif';
      iCtx.textAlign = 'center';
      iCtx.textBaseline = 'middle';
      iCtx.fillText(poi.icon, 64, 64);

      const iconTex = new THREE.CanvasTexture(iconCanvas);
      const iconSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: iconTex, transparent: true }));
      iconSprite.position.set(0, 2.8, 0);
      iconSprite.scale.set(1.4, 1.4, 1.0);
      group.add(iconSprite);

      // Label Banner Sprite
      const labelCanvas = document.createElement('canvas');
      labelCanvas.width = 384;
      labelCanvas.height = 72;
      const lCtx = labelCanvas.getContext('2d')!;
      lCtx.fillStyle = 'rgba(16, 12, 9, 0.85)';
      lCtx.roundRect(4, 4, 376, 64, 6);
      lCtx.fill();
      lCtx.strokeStyle = '#d4af37';
      lCtx.lineWidth = 3;
      lCtx.stroke();

      lCtx.font = 'bold 24px "Cinzel", "Times New Roman", serif';
      lCtx.textAlign = 'center';
      lCtx.textBaseline = 'middle';
      lCtx.fillStyle = '#ebdcb9';
      lCtx.fillText(poi.name.toUpperCase(), 192, 36);

      const labelTex = new THREE.CanvasTexture(labelCanvas);
      const labelSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: labelTex, transparent: true }));
      labelSprite.position.set(0, 3.8, 0);
      labelSprite.scale.set(3.2, 0.6, 1.0);
      group.add(labelSprite);

      group.position.set(worldX, 0, worldZ);
      this.scene.add(group);

      this.poiMarkers.push({
        poi,
        root: group,
        ring,
        iconSprite,
        labelSprite
      });
    });
  }

  /**
   * Synchronizes 3D collision bounding boxes 1:1 with VALENTINE_OBSTACLES in @rdo-rpg/shared
   */
  public generateBoundingBoxes() {
    this.obstacleBoxes = [];
    const scale = ValentineBuilder.SCALE;

    for (const obs of VALENTINE_OBSTACLES) {
      const minX = obs.x * scale;
      const minZ = obs.y * scale;
      const maxX = minX + obs.w * scale;
      const maxZ = minZ + obs.h * scale;
      const maxH = obs.height || 6.0;

      const box = new THREE.Box3(
        new THREE.Vector3(minX, 0, minZ),
        new THREE.Vector3(maxX, maxH, maxZ)
      );
      this.obstacleBoxes.push(box);
    }
  }

  /**
   * Per-frame animation for POI rings, markers, and reflective water puddles
   */
  public update(time: number) {
    this.poiMarkers.forEach((m) => {
      const scale = 1.0 + Math.sin(time * 2.5) * 0.08;
      m.ring.scale.set(scale, scale, 1);
      m.iconSprite.position.y = 2.8 + Math.sin(time * 3.0) * 0.12;
      m.labelSprite.position.y = 3.8 + Math.sin(time * 3.0) * 0.12;
    });

    // Slight shimmer on mud puddles
    this.puddles.forEach((p, idx) => {
      p.rotation.z = Math.sin(time * 0.8 + idx) * 0.005;
    });
  }
}
