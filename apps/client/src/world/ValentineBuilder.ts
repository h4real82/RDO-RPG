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

export class ValentineBuilder {
  public static readonly SCALE = 0.1; // 10 px = 1 meter in 3D
  private scene: THREE.Scene;
  public obstacleBoxes: THREE.Box3[] = [];
  public poiMarkers: POIMarker3D[] = [];
  public waterMesh: THREE.Mesh | null = null;
  public groundMesh!: THREE.Mesh;

  // Cached PBR Materials
  private groundMat!: THREE.MeshStandardMaterial;
  private woodDarkMat!: THREE.MeshStandardMaterial;
  private woodHoneyMat!: THREE.MeshStandardMaterial;
  private boardwalkMat!: THREE.MeshStandardMaterial;
  private roofMat!: THREE.MeshStandardMaterial;
  private stoneMat!: THREE.MeshStandardMaterial;
  private ironMat!: THREE.MeshStandardMaterial;
  private glassMat!: THREE.MeshStandardMaterial;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.initMaterials();
  }

  private initMaterials() {
    const groundTex = TextureGenerator.getGroundTextures();
    this.groundMat = new THREE.MeshStandardMaterial({
      map: groundTex.diffuse,
      normalMap: groundTex.normal,
      roughnessMap: groundTex.roughness,
      roughness: 0.85,
      metalness: 0.05
    });

    const woodDark = TextureGenerator.getWoodPlankTextures('dark_cedar');
    this.woodDarkMat = new THREE.MeshStandardMaterial({
      map: woodDark.diffuse,
      normalMap: woodDark.normal,
      roughnessMap: woodDark.roughness,
      roughness: 0.75,
      metalness: 0.02
    });

    const woodHoney = TextureGenerator.getWoodPlankTextures('honey_pine');
    this.woodHoneyMat = new THREE.MeshStandardMaterial({
      map: woodHoney.diffuse,
      normalMap: woodHoney.normal,
      roughnessMap: woodHoney.roughness,
      roughness: 0.70,
      metalness: 0.02
    });

    const boardwalk = TextureGenerator.getWoodPlankTextures('boardwalk');
    this.boardwalkMat = new THREE.MeshStandardMaterial({
      map: boardwalk.diffuse,
      normalMap: boardwalk.normal,
      roughnessMap: boardwalk.roughness,
      roughness: 0.80,
      metalness: 0.02
    });

    const roofTex = TextureGenerator.getRoofTextures();
    this.roofMat = new THREE.MeshStandardMaterial({
      map: roofTex.diffuse,
      normalMap: roofTex.normal,
      roughnessMap: roofTex.roughness,
      roughness: 0.65,
      metalness: 0.1
    });

    this.stoneMat = new THREE.MeshStandardMaterial({
      color: 0x5a534c,
      roughness: 0.9,
      metalness: 0.05
    });

    this.ironMat = new THREE.MeshStandardMaterial({
      color: 0x222224,
      roughness: 0.45,
      metalness: 0.85
    });

    this.glassMat = new THREE.MeshStandardMaterial({
      color: 0x4a6572,
      roughness: 0.1,
      metalness: 0.8,
      transparent: true,
      opacity: 0.65
    });
  }

  public buildValentineWorld() {
    this.buildTerrain();
    this.buildBoardwalks();
    this.buildBuildings();
    this.buildCorralAndFences();
    this.buildPropsAndStreetFurniture();
    this.buildWaterTrough();
    this.buildPOIMarkers();
    this.generateBoundingBoxes();
  }

  /**
   * 3D Dirt/Mud Terrain with Main Street center depression
   */
  private buildTerrain() {
    const width = 144;
    const depth = 84;
    const geo = new THREE.PlaneGeometry(width, depth, 72, 42);
    geo.rotateX(-Math.PI / 2);

    // Subtle elevation micro-variation and road ruts
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const z = pos.getZ(i);
      const x = pos.getX(i);
      // Main Street is between Z = 42 and Z = 56
      let y = 0;
      if (z > 42 && z < 56) {
        // slight street dip
        y = -0.12 + Math.sin(x * 0.4) * 0.04;
      } else {
        // slightly elevated roadside prairies
        y = 0.05 + Math.sin(x * 0.15) * 0.06;
      }
      pos.setY(i, y);
    }
    geo.computeVertexNormals();

    this.groundMesh = new THREE.Mesh(geo, this.groundMat);
    this.groundMesh.position.set(70, 0, 40);
    this.groundMesh.receiveShadow = true;
    this.scene.add(this.groundMesh);
  }

  /**
   * Elevated wooden boardwalks along Main Street
   */
  private buildBoardwalks() {
    const s = ValentineBuilder.SCALE;
    const boardwalks = [
      // North sidewalk (in front of Saloon, Store, Sheriff, Bank)
      { x: 260 * s, z: 416 * s, w: 760 * s, d: 24 * s, h: 0.35 },
      // South sidewalk (in front of South Houses)
      { x: 120 * s, z: 590 * s, w: 1240 * s, d: 24 * s, h: 0.35 }
    ];

    boardwalks.forEach((bw) => {
      const geo = new THREE.BoxGeometry(bw.w, bw.h, bw.d);
      const mesh = new THREE.Mesh(geo, this.boardwalkMat);
      mesh.position.set(bw.x + bw.w / 2, bw.h / 2, bw.z + bw.d / 2);
      mesh.receiveShadow = true;
      mesh.castShadow = true;
      this.scene.add(mesh);

      // Wooden boardwalk steps onto dirt street
      const stepGeo = new THREE.BoxGeometry(bw.w, bw.h * 0.5, 0.4);
      const step = new THREE.Mesh(stepGeo, this.boardwalkMat);
      step.position.set(bw.x + bw.w / 2, bw.h * 0.25, bw.z + bw.d + 0.2);
      step.receiveShadow = true;
      this.scene.add(step);
    });
  }

  /**
   * Constructs all western 3D buildings
   */
  private buildBuildings() {
    const s = ValentineBuilder.SCALE;

    // 1. Smithfield's Saloon
    this.buildSaloon(288 * s, 272 * s, 192 * s, 144 * s, 7.8);

    // 2. Valentine General Store
    this.buildGeneralStore(544 * s, 304 * s, 128 * s, 112 * s, 6.8);

    // 3. Sheriff's Office & Jail
    this.buildSheriffOffice(720 * s, 304 * s, 112 * s, 112 * s, 6.2);

    // 4. Valentine Bank
    this.buildBank(880 * s, 304 * s, 128 * s, 112 * s, 6.5);

    // 5. Barber & Gunsmith
    this.buildCommercialShop(1056 * s, 336 * s, 64 * s, 84 * s, 5.2, 'BARBER SHOP', 'SHAVE & HAIRCUT', '#7a2020');
    this.buildCommercialShop(1200 * s, 336 * s, 128 * s, 86 * s, 5.6, 'VALENTINE GUNSMITH', 'RIFLES · PISTOLS · AMMO', '#262420');

    // 6. Valentine Livery & Auction Stable
    this.buildLiveryStable(512 * s, 64 * s, 224 * s, 152 * s, 8.5);

    // 7. North Outbuildings
    this.buildFrontierCabin(130 * s, 96 * s, 140 * s, 124 * s, 5.8);
    this.buildFrontierCabin(832 * s, 96 * s, 112 * s, 112 * s, 5.2);
    this.buildFrontierCabin(1072 * s, 80 * s, 160 * s, 140 * s, 6.2, true); // Blacksmith with open forge

    // 8. South Row Residences
    const southHouses = [
      { x: 128 * s, z: 610 * s, w: 144 * s, d: 108 * s },
      { x: 352 * s, z: 610 * s, w: 144 * s, d: 108 * s },
      { x: 576 * s, z: 610 * s, w: 128 * s, d: 108 * s },
      { x: 768 * s, z: 610 * s, w: 128 * s, d: 108 * s },
      { x: 944 * s, z: 610 * s, w: 112 * s, d: 108 * s },
      { x: 1104 * s, z: 610 * s, w: 112 * s, d: 108 * s },
      { x: 1264 * s, z: 610 * s, w: 80 * s, d: 108 * s }
    ];

    southHouses.forEach((h, idx) => {
      this.buildFrontierCabin(h.x, h.z, h.w, h.d, 5.5, false, idx % 2 === 0);
    });
  }

  /**
   * Smithfield's Saloon (2-story, balcony, swing doors, sign, lanterns)
   */
  private buildSaloon(x: number, z: number, w: number, d: number, h: number) {
    const group = new THREE.Group();

    // Main hall box
    const bodyGeo = new THREE.BoxGeometry(w, h, d);
    const body = new THREE.Mesh(bodyGeo, this.woodDarkMat);
    body.position.set(x + w / 2, h / 2, z + d / 2);
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    // Pitched Roof
    const roofH = 2.2;
    const roofGeo = new THREE.ConeGeometry(w * 0.72, roofH, 4);
    roofGeo.rotateY(Math.PI / 4);
    const roof = new THREE.Mesh(roofGeo, this.roofMat);
    roof.position.set(x + w / 2, h + roofH / 2, z + d / 2);
    roof.scale.set(1.4, 1, d / (w * 0.72) * 1.3);
    roof.castShadow = true;
    group.add(roof);

    // 2nd floor balcony over boardwalk
    const balcDepth = 2.4;
    const balcGeo = new THREE.BoxGeometry(w + 0.4, 0.25, balcDepth);
    const balcony = new THREE.Mesh(balcGeo, this.boardwalkMat);
    balcony.position.set(x + w / 2, 3.8, z + d + balcDepth / 2);
    balcony.castShadow = true;
    balcony.receiveShadow = true;
    group.add(balcony);

    // Balcony railing
    const railGeo = new THREE.BoxGeometry(w + 0.4, 0.9, 0.1);
    const railing = new THREE.Mesh(railGeo, this.woodHoneyMat);
    railing.position.set(x + w / 2, 4.3, z + d + balcDepth);
    railing.castShadow = true;
    group.add(railing);

    // Support posts (holding balcony)
    const postCount = 6;
    for (let i = 0; i < postCount; i++) {
      const px = x + (i / (postCount - 1)) * w;
      const postGeo = new THREE.BoxGeometry(0.25, 3.8, 0.25);
      const post = new THREE.Mesh(postGeo, this.woodHoneyMat);
      post.position.set(px, 1.9, z + d + balcDepth - 0.15);
      post.castShadow = true;
      group.add(post);
    }

    // Swinging batwing doors
    const doorFrameGeo = new THREE.BoxGeometry(2.4, 2.8, 0.2);
    const doorFrame = new THREE.Mesh(doorFrameGeo, this.woodHoneyMat);
    doorFrame.position.set(x + w / 2, 1.4, z + d + 0.05);
    group.add(doorFrame);

    const doorGeo = new THREE.BoxGeometry(0.9, 1.6, 0.08);
    const doorL = new THREE.Mesh(doorGeo, this.woodDarkMat);
    doorL.position.set(x + w / 2 - 0.5, 1.5, z + d + 0.12);
    doorL.rotation.y = 0.2;
    group.add(doorL);

    const doorR = new THREE.Mesh(doorGeo, this.woodDarkMat);
    doorR.position.set(x + w / 2 + 0.5, 1.5, z + d + 0.12);
    doorR.rotation.y = -0.2;
    group.add(doorR);

    // Saloon signboard
    const signTex = TextureGenerator.createSignboardTexture(
      "SMITHFIELD'S SALOON",
      'COLD BEER · KENTUCKY BOURBON · STEW',
      '#1c130d',
      '#f5e6cc',
      true
    );
    const signMat = new THREE.MeshStandardMaterial({ map: signTex, roughness: 0.4 });
    const signGeo = new THREE.BoxGeometry(8.0, 1.8, 0.15);
    const sign = new THREE.Mesh(signGeo, signMat);
    sign.position.set(x + w / 2, 5.4, z + d + balcDepth + 0.08);
    sign.castShadow = true;
    group.add(sign);

    // Hanging warm lanterns
    this.addHangingLantern(group, x + 3.0, 3.2, z + d + balcDepth);
    this.addHangingLantern(group, x + w - 3.0, 3.2, z + d + balcDepth);

    this.scene.add(group);
  }

  /**
   * Valentine General Store (False front facade, awning, crates)
   */
  private buildGeneralStore(x: number, z: number, w: number, d: number, h: number) {
    const group = new THREE.Group();

    // Main box
    const bodyGeo = new THREE.BoxGeometry(w, h, d);
    const body = new THREE.Mesh(bodyGeo, this.woodHoneyMat);
    body.position.set(x + w / 2, h / 2, z + d / 2);
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    // Boomtown false-front pediment (taller facade)
    const facadeGeo = new THREE.BoxGeometry(w + 0.2, 1.8, 0.3);
    const facade = new THREE.Mesh(facadeGeo, this.woodHoneyMat);
    facade.position.set(x + w / 2, h + 0.9, z + d);
    facade.castShadow = true;
    group.add(facade);

    // Store awning overhang
    const awningGeo = new THREE.BoxGeometry(w, 0.15, 2.2);
    const awning = new THREE.Mesh(awningGeo, this.roofMat);
    awning.position.set(x + w / 2, 3.6, z + d + 1.1);
    awning.rotation.x = 0.12;
    awning.castShadow = true;
    group.add(awning);

    // Store Sign
    const signTex = TextureGenerator.createSignboardTexture(
      'VALENTINE GENERAL STORE',
      'GROCERIES · TONICS · AMMUNITION',
      '#2b1e14',
      '#e5ded2',
      true
    );
    const signMat = new THREE.MeshStandardMaterial({ map: signTex, roughness: 0.4 });
    const signGeo = new THREE.BoxGeometry(7.0, 1.4, 0.12);
    const sign = new THREE.Mesh(signGeo, signMat);
    sign.position.set(x + w / 2, h + 0.9, z + d + 0.2);
    sign.castShadow = true;
    group.add(sign);

    // Display Bay Windows
    const winGeo = new THREE.BoxGeometry(2.4, 1.8, 0.2);
    const winL = new THREE.Mesh(winGeo, this.glassMat);
    winL.position.set(x + 2.5, 2.0, z + d + 0.05);
    group.add(winL);

    const winR = new THREE.Mesh(winGeo, this.glassMat);
    winR.position.set(x + w - 2.5, 2.0, z + d + 0.05);
    group.add(winR);

    // Crates and sacks outside
    this.addCratesStack(group, x + 1.2, 0.4, z + d + 1.0);
    this.addHangingLantern(group, x + w / 2, 3.3, z + d + 1.8);

    this.scene.add(group);
  }

  /**
   * Sheriff's Office (Log cabin construction, barred windows, star sign)
   */
  private buildSheriffOffice(x: number, z: number, w: number, d: number, h: number) {
    const group = new THREE.Group();

    // Body
    const bodyGeo = new THREE.BoxGeometry(w, h, d);
    const body = new THREE.Mesh(bodyGeo, this.woodDarkMat);
    body.position.set(x + w / 2, h / 2, z + d / 2);
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    // Pitched Roof
    const roofH = 1.8;
    const roofGeo = new THREE.ConeGeometry(w * 0.72, roofH, 4);
    roofGeo.rotateY(Math.PI / 4);
    const roof = new THREE.Mesh(roofGeo, this.roofMat);
    roof.position.set(x + w / 2, h + roofH / 2, z + d / 2);
    roof.scale.set(1.4, 1, d / (w * 0.72) * 1.2);
    roof.castShadow = true;
    group.add(roof);

    // Porch overhang
    const porchGeo = new THREE.BoxGeometry(w, 0.15, 2.0);
    const porch = new THREE.Mesh(porchGeo, this.roofMat);
    porch.position.set(x + w / 2, 3.4, z + d + 1.0);
    porch.rotation.x = 0.08;
    porch.castShadow = true;
    group.add(porch);

    // Two wooden porch posts
    const postGeo = new THREE.BoxGeometry(0.2, 3.4, 0.2);
    const postL = new THREE.Mesh(postGeo, this.woodHoneyMat);
    postL.position.set(x + 0.8, 1.7, z + d + 1.8);
    postL.castShadow = true;
    group.add(postL);

    const postR = new THREE.Mesh(postGeo, this.woodHoneyMat);
    postR.position.set(x + w - 0.8, 1.7, z + d + 1.8);
    postR.castShadow = true;
    group.add(postR);

    // Jail window with iron bars
    const jailWin = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.4, 0.1), this.glassMat);
    jailWin.position.set(x + w - 2.5, 2.2, z + d + 0.05);
    group.add(jailWin);

    // Vertical Iron Bars
    for (let b = 0; b < 4; b++) {
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.4), this.ironMat);
      bar.position.set(x + w - 3.1 + b * 0.4, 2.2, z + d + 0.15);
      bar.castShadow = true;
      group.add(bar);
    }

    // Sheriff Sign with Gold Star
    const signTex = TextureGenerator.createSignboardTexture(
      "★ SHERIFF'S OFFICE ★",
      'TOWN OF VALENTINE · WANTED POSTERS',
      '#1a1612',
      '#ebdcb9',
      true
    );
    const signMat = new THREE.MeshStandardMaterial({ map: signTex, roughness: 0.4 });
    const signGeo = new THREE.BoxGeometry(6.4, 1.3, 0.12);
    const sign = new THREE.Mesh(signGeo, signMat);
    sign.position.set(x + w / 2, 4.3, z + d + 0.15);
    sign.castShadow = true;
    group.add(sign);

    // Lantern
    this.addHangingLantern(group, x + w / 2, 3.1, z + d + 1.8);

    this.scene.add(group);
  }

  /**
   * Valentine Bank
   */
  private buildBank(x: number, z: number, w: number, d: number, h: number) {
    const group = new THREE.Group();

    const bodyGeo = new THREE.BoxGeometry(w, h, d);
    const body = new THREE.Mesh(bodyGeo, this.woodHoneyMat);
    body.position.set(x + w / 2, h / 2, z + d / 2);
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    // Pilasters / Columns
    for (let c = 0; c < 4; c++) {
      const colGeo = new THREE.BoxGeometry(0.45, h, 0.45);
      const col = new THREE.Mesh(colGeo, this.stoneMat);
      col.position.set(x + 1.0 + (c / 3) * (w - 2.0), h / 2, z + d + 0.2);
      col.castShadow = true;
      group.add(col);
    }

    // Bank Sign
    const signTex = TextureGenerator.createSignboardTexture(
      'BANK OF VALENTINE',
      'SAFE DEPOSITS · LOANS · GOLD EXCHANGE',
      '#151c24',
      '#d4af37',
      true
    );
    const signMat = new THREE.MeshStandardMaterial({ map: signTex, roughness: 0.35 });
    const sign = new THREE.Mesh(new THREE.BoxGeometry(7.2, 1.4, 0.12), signMat);
    sign.position.set(x + w / 2, h - 0.8, z + d + 0.45);
    sign.castShadow = true;
    group.add(sign);

    this.scene.add(group);
  }

  /**
   * Valentine Livery & Auction Stable (Large Gambrel Barn)
   */
  private buildLiveryStable(x: number, z: number, w: number, d: number, h: number) {
    const group = new THREE.Group();

    // Red-brown barn siding
    const barnMat = new THREE.MeshStandardMaterial({
      color: 0x6e2820,
      roughness: 0.8,
      metalness: 0.05
    });

    // Lower barn box
    const bodyGeo = new THREE.BoxGeometry(w, h * 0.6, d);
    const body = new THREE.Mesh(bodyGeo, barnMat);
    body.position.set(x + w / 2, (h * 0.6) / 2, z + d / 2);
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    // Gambrel roof
    const roofGeo = new THREE.ConeGeometry(w * 0.65, h * 0.45, 4);
    roofGeo.rotateY(Math.PI / 4);
    const roof = new THREE.Mesh(roofGeo, this.roofMat);
    roof.position.set(x + w / 2, h * 0.6 + (h * 0.45) / 2, z + d / 2);
    roof.scale.set(1.5, 1, d / (w * 0.65) * 1.15);
    roof.castShadow = true;
    group.add(roof);

    // Hayloft hoist beam protruding from top
    const beamGeo = new THREE.BoxGeometry(0.3, 0.3, 3.0);
    const beam = new THREE.Mesh(beamGeo, this.woodHoneyMat);
    beam.position.set(x + w / 2, h * 0.9, z + d + 1.0);
    beam.castShadow = true;
    group.add(beam);

    // Wide barn double doors (open)
    const doorFrame = new THREE.Mesh(new THREE.BoxGeometry(4.8, 4.0, 0.2), this.woodHoneyMat);
    doorFrame.position.set(x + w / 2, 2.0, z + d + 0.05);
    group.add(doorFrame);

    // Sign
    const signTex = TextureGenerator.createSignboardTexture(
      'VALENTINE LIVERY & STABLES',
      'AUCTION · HORSE BOARDING · SADDLERY',
      '#241510',
      '#ebdcb9',
      true
    );
    const signMat = new THREE.MeshStandardMaterial({ map: signTex, roughness: 0.4 });
    const sign = new THREE.Mesh(new THREE.BoxGeometry(9.0, 1.6, 0.12), signMat);
    sign.position.set(x + w / 2, h * 0.6 + 1.2, z + d + 0.2);
    sign.castShadow = true;
    group.add(sign);

    this.scene.add(group);
  }

  /**
   * Generic frontier timber cabin / residence
   */
  private buildFrontierCabin(
    x: number,
    z: number,
    w: number,
    d: number,
    h: number,
    isForge: boolean = false,
    hasChimney: boolean = true
  ) {
    const group = new THREE.Group();

    const mat = isForge ? this.woodDarkMat : this.woodHoneyMat;
    const bodyGeo = new THREE.BoxGeometry(w, h, d);
    const body = new THREE.Mesh(bodyGeo, mat);
    body.position.set(x + w / 2, h / 2, z + d / 2);
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    // Pitched roof
    const roofGeo = new THREE.ConeGeometry(w * 0.72, 1.8, 4);
    roofGeo.rotateY(Math.PI / 4);
    const roof = new THREE.Mesh(roofGeo, this.roofMat);
    roof.position.set(x + w / 2, h + 0.9, z + d / 2);
    roof.scale.set(1.4, 1, d / (w * 0.72) * 1.2);
    roof.castShadow = true;
    group.add(roof);

    // Stone Chimney
    if (hasChimney) {
      const chimGeo = new THREE.BoxGeometry(0.8, h + 1.6, 0.8);
      const chim = new THREE.Mesh(chimGeo, this.stoneMat);
      chim.position.set(x + w - 0.8, (h + 1.6) / 2, z + d * 0.5);
      chim.castShadow = true;
      group.add(chim);
    }

    this.scene.add(group);
  }

  /**
   * Small Commercial Shop (Barber, Gunsmith)
   */
  private buildCommercialShop(
    x: number,
    z: number,
    w: number,
    d: number,
    h: number,
    title: string,
    sub: string,
    signBg: string
  ) {
    const group = new THREE.Group();

    const bodyGeo = new THREE.BoxGeometry(w, h, d);
    const body = new THREE.Mesh(bodyGeo, this.woodDarkMat);
    body.position.set(x + w / 2, h / 2, z + d / 2);
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    const signTex = TextureGenerator.createSignboardTexture(title, sub, signBg, '#ebdcb9', true);
    const signMat = new THREE.MeshStandardMaterial({ map: signTex, roughness: 0.4 });
    const signGeo = new THREE.BoxGeometry(w * 0.9, 1.3, 0.12);
    const sign = new THREE.Mesh(signGeo, signMat);
    sign.position.set(x + w / 2, h - 0.8, z + d + 0.1);
    sign.castShadow = true;
    group.add(sign);

    this.scene.add(group);
  }

  /**
   * Corral split-rail wooden fences
   */
  private buildCorralAndFences() {
    const s = ValentineBuilder.SCALE;
    const group = new THREE.Group();

    // Fence lines
    const fences = [
      // Auction Corral around Livery Stable
      { x1: 420 * s, z1: 110 * s, x2: 512 * s, z2: 110 * s },
      { x1: 420 * s, z1: 110 * s, x2: 420 * s, z2: 226 * s },
      { x1: 420 * s, z1: 226 * s, x2: 500 * s, z2: 226 * s }
    ];

    fences.forEach((f) => {
      const len = Math.hypot(f.x2 - f.x1, f.z2 - f.z1);
      const angle = Math.atan2(f.z2 - f.z1, f.x2 - f.x1);
      const midX = (f.x1 + f.x2) / 2;
      const midZ = (f.z1 + f.z2) / 2;

      // Two horizontal split rails
      for (let r = 0; r < 2; r++) {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(len, 0.12, 0.08), this.woodHoneyMat);
        rail.position.set(midX, 0.5 + r * 0.5, midZ);
        rail.rotation.y = -angle;
        rail.castShadow = true;
        group.add(rail);
      }

      // Vertical posts every 2.5 meters
      const postCount = Math.max(2, Math.floor(len / 2.5) + 1);
      for (let p = 0; p < postCount; p++) {
        const t = p / (postCount - 1);
        const px = f.x1 + (f.x2 - f.x1) * t;
        const pz = f.z1 + (f.z2 - f.z1) * t;

        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.4), this.woodDarkMat);
        post.position.set(px, 0.7, pz);
        post.castShadow = true;
        group.add(post);
      }
    });

    this.scene.add(group);
  }

  /**
   * Street furniture: Hitching posts, barrels, telegraph poles
   */
  private buildPropsAndStreetFurniture() {
    const s = ValentineBuilder.SCALE;
    const group = new THREE.Group();

    // Hitching posts along Main Street
    const hitchingPosts = [
      { x: 320 * s, z: 432 * s, len: 4.8 },
      { x: 580 * s, z: 432 * s, len: 4.8 },
      { x: 750 * s, z: 432 * s, len: 4.8 }
    ];

    hitchingPosts.forEach((hp) => {
      // Horizontal rail
      const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, hp.len), this.woodHoneyMat);
      rail.rotation.z = Math.PI / 2;
      rail.position.set(hp.x + hp.len / 2, 0.95, hp.z);
      rail.castShadow = true;
      group.add(rail);

      // Support posts
      const p1 = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 1.05), this.woodDarkMat);
      p1.position.set(hp.x + 0.2, 0.52, hp.z);
      p1.castShadow = true;
      group.add(p1);

      const p2 = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 1.05), this.woodDarkMat);
      p2.position.set(hp.x + hp.len - 0.2, 0.52, hp.z);
      p2.castShadow = true;
      group.add(p2);
    });

    // Barrels
    const barrelLocations = [
      { x: 28.2, z: 42.0 },
      { x: 28.8, z: 42.2 },
      { x: 53.8, z: 42.0 },
      { x: 71.2, z: 42.0 },
      { x: 87.2, z: 42.0 }
    ];

    const barrelGeo = new THREE.CylinderGeometry(0.38, 0.42, 1.0, 10);
    barrelLocations.forEach((b) => {
      const barrel = new THREE.Mesh(barrelGeo, this.woodDarkMat);
      barrel.position.set(b.x, 0.5, b.z);
      barrel.castShadow = true;
      group.add(barrel);
    });

    // Telegraph / Lantern poles along Main Street
    for (let tx = 20; tx < 135; tx += 28) {
      const poleGeo = new THREE.CylinderGeometry(0.12, 0.16, 7.5, 8);
      const pole = new THREE.Mesh(poleGeo, this.woodDarkMat);
      pole.position.set(tx, 3.75, 43.0);
      pole.castShadow = true;
      group.add(pole);

      // Crossbeam
      const crossGeo = new THREE.BoxGeometry(2.0, 0.15, 0.15);
      const cross = new THREE.Mesh(crossGeo, this.woodHoneyMat);
      cross.position.set(tx, 7.0, 43.0);
      cross.castShadow = true;
      group.add(cross);
    }

    this.scene.add(group);
  }

  /**
   * Water trough at Livery Stable
   */
  private buildWaterTrough() {
    const s = ValentineBuilder.SCALE;
    const x = 480 * s;
    const z = 220 * s;
    const w = 2.8;
    const d = 1.4;
    const h = 0.8;

    const group = new THREE.Group();

    // Wooden basin box
    const troughGeo = new THREE.BoxGeometry(w, h, d);
    const trough = new THREE.Mesh(troughGeo, this.woodDarkMat);
    trough.position.set(x + w / 2, h / 2, z + d / 2);
    trough.castShadow = true;
    trough.receiveShadow = true;
    group.add(trough);

    // Reflective Water Surface
    const waterGeo = new THREE.PlaneGeometry(w - 0.2, d - 0.2);
    waterGeo.rotateX(-Math.PI / 2);
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x1d4e68,
      roughness: 0.1,
      metalness: 0.85,
      transparent: true,
      opacity: 0.85
    });

    this.waterMesh = new THREE.Mesh(waterGeo, waterMat);
    this.waterMesh.position.set(x + w / 2, h - 0.05, z + d / 2);
    group.add(this.waterMesh);

    this.scene.add(group);
  }

  /**
   * Hanging warm porch lantern with soft PointLight
   */
  private addHangingLantern(parent: THREE.Group, x: number, y: number, z: number) {
    const lanternGroup = new THREE.Group();
    lanternGroup.position.set(x, y, z);

    // Iron frame
    const frameGeo = new THREE.CylinderGeometry(0.12, 0.16, 0.45, 6);
    const frame = new THREE.Mesh(frameGeo, this.ironMat);
    frame.castShadow = true;
    lanternGroup.add(frame);

    // Glowing flame bulb
    const flameGeo = new THREE.SphereGeometry(0.08, 8, 8);
    const flameMat = new THREE.MeshBasicMaterial({ color: 0xffaa44 });
    const flame = new THREE.Mesh(flameGeo, flameMat);
    lanternGroup.add(flame);

    // Soft warm point light
    const light = new THREE.PointLight(0xff9933, 1.2, 8.0, 2.0);
    light.position.set(0, 0, 0);
    lanternGroup.add(light);

    parent.add(lanternGroup);
  }

  /**
   * Helper to add a cluster of supply crates
   */
  private addCratesStack(parent: THREE.Group, x: number, y: number, z: number) {
    const crateMat = this.woodHoneyMat;
    const c1 = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.8), crateMat);
    c1.position.set(x, y + 0.4, z);
    c1.castShadow = true;
    parent.add(c1);

    const c2 = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 0.7), crateMat);
    c2.position.set(x + 0.7, y + 0.35, z + 0.1);
    c2.rotation.y = 0.2;
    c2.castShadow = true;
    parent.add(c2);

    const c3 = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 0.6), crateMat);
    c3.position.set(x + 0.3, y + 1.1, z + 0.05);
    c3.rotation.y = -0.15;
    c3.castShadow = true;
    parent.add(c3);
  }

  /**
   * Interactive 3D POI Markers (Rings on the ground with floating billboard icons)
   */
  private buildPOIMarkers() {
    const s = ValentineBuilder.SCALE;

    pois.forEach((poi) => {
      const root = new THREE.Group();
      root.position.set(poi.x * s, 0.08, poi.y * s);

      // Gold ground circle
      const ringGeo = new THREE.RingGeometry(1.6, 1.9, 32);
      ringGeo.rotateX(-Math.PI / 2);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0xd4af37,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.75
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      root.add(ring);

      // Floating billboard icon & label
      const iconCanvas = document.createElement('canvas');
      iconCanvas.width = 128;
      iconCanvas.height = 128;
      const ctx = iconCanvas.getContext('2d')!;
      ctx.font = '68px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(poi.icon, 64, 64);

      const iconTex = new THREE.CanvasTexture(iconCanvas);
      const iconSpriteMat = new THREE.SpriteMaterial({ map: iconTex, transparent: true });
      const iconSprite = new THREE.Sprite(iconSpriteMat);
      iconSprite.position.set(0, 2.2, 0);
      iconSprite.scale.set(1.4, 1.4, 1);
      root.add(iconSprite);

      // Text label sprite
      const labelCanvas = document.createElement('canvas');
      labelCanvas.width = 256;
      labelCanvas.height = 64;
      const lCtx = labelCanvas.getContext('2d')!;
      lCtx.fillStyle = 'rgba(18, 14, 11, 0.85)';
      lCtx.roundRect(4, 4, 248, 56, 8);
      lCtx.fill();
      lCtx.strokeStyle = '#d4af37';
      lCtx.lineWidth = 2;
      lCtx.roundRect(4, 4, 248, 56, 8);
      lCtx.stroke();

      lCtx.font = 'bold 22px "Cinzel", serif';
      lCtx.fillStyle = '#ebdcb9';
      lCtx.textAlign = 'center';
      lCtx.textBaseline = 'middle';
      lCtx.fillText(poi.name, 128, 32);

      const labelTex = new THREE.CanvasTexture(labelCanvas);
      const labelSpriteMat = new THREE.SpriteMaterial({ map: labelTex, transparent: true });
      const labelSprite = new THREE.Sprite(labelSpriteMat);
      labelSprite.position.set(0, 3.2, 0);
      labelSprite.scale.set(3.2, 0.8, 1);
      root.add(labelSprite);

      this.scene.add(root);

      this.poiMarkers.push({
        poi,
        root,
        ring,
        iconSprite,
        labelSprite
      });
    });
  }

  /**
   * Generates exact 3D AABB Bounding Boxes for player collision detection
   */
  private generateBoundingBoxes() {
    const s = ValentineBuilder.SCALE;
    this.obstacleBoxes = VALENTINE_OBSTACLES.map((obs) => {
      const minX = obs.x * s;
      const minZ = obs.y * s;
      const maxX = (obs.x + obs.w) * s;
      const maxZ = (obs.y + obs.h) * s;
      const maxY = obs.height || 6.0;

      return new THREE.Box3(
        new THREE.Vector3(minX, 0, minZ),
        new THREE.Vector3(maxX, maxY, maxZ)
      );
    });
  }

  public update(time: number) {
    // Pulse POI marker rings
    const pulse = 1.0 + Math.sin(time * 3.5) * 0.12;
    this.poiMarkers.forEach((pm) => {
      pm.ring.scale.set(pulse, 1, pulse);
      pm.iconSprite.position.y = 2.2 + Math.sin(time * 2.5 + pm.poi.x) * 0.15;
      pm.labelSprite.position.y = 3.2 + Math.sin(time * 2.5 + pm.poi.x) * 0.15;
    });

    // Shimmer water in trough
    if (this.waterMesh) {
      const wMat = this.waterMesh.material as THREE.MeshStandardMaterial;
      wMat.roughness = 0.08 + Math.sin(time * 3) * 0.04;
    }
  }
}
