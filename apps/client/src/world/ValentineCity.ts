import * as THREE from 'three';
import valentineData from './data/valentineLayout.json';
import { TextureGenerator } from './TextureGenerator';
import { WoodMaterials } from './materials/WoodMaterials';

export interface LayoutBuilding {
  id: string;
  name: string;
  pos: [number, number];
  size: [number, number, number];
  rotY: number;
}

export interface BuildingInstance {
  id: string;
  name: string;
  group: THREE.Group;
  posX: number;
  posZ: number;
  width: number;
  depth: number;
  height: number;
  roofMaterials: THREE.MeshStandardMaterial[];
  currentOpacity: number;
}

export class ValentineCity {
  public static readonly SCALE = 0.1;
  private scene: THREE.Scene;
  public groundMesh!: THREE.Mesh;
  public obstacleBoxes: THREE.Box3[] = [];
  public buildings: BuildingInstance[] = [];
  public roadMeshes: THREE.Mesh[] = [];

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  /**
   * Deterministic terrain height:
   * Level (0.0m) for town center, livestock yards and station.
   * Rises up to 4.0m on the church hill in the northwest.
   */
  public getGroundHeight(x: number, z: number): number {
    if (z >= -13.0 || x > 50.0) {
      return 0.0;
    }
    const t = Math.min(Math.max((-13.0 - z) / 13.5, 0), 1);
    return t * 4.0;
  }

  public getTerrainHeight(x: number, z: number): number {
    return this.getGroundHeight(x, z);
  }

  /**
   * Build complete Valentine World with upgraded architectural details,
   * realistic material differentiation, railroad network, and environment props.
   */
  public buildValentineWorld(): void {
    this.buildTerrainAndRoadRibbon();
    this.buildBoardwalks();
    this.buildRailroadAndStationTrack();
    this.buildAllDynamicBuildings();
    this.buildLivestockAndPensZone();
    this.buildCemetery();
    this.buildEnvironmentProps();

    // Ensure all world matrices are computed for physics colliders
    this.scene.updateMatrixWorld(true);
  }

  /**
   * 1. Ground Landscape (Arid Grass & Sandy Gravel) & Main Street (Wet Mud with Wagon Ruts)
   */
  private buildTerrainAndRoadRibbon(): void {
    // Ground Terrain Mesh - Arid Prairie Grass and Sandy Buff Soil
    const width = 280;
    const depth = 280;
    const groundGeo = new THREE.PlaneGeometry(width, depth, 140, 140);
    groundGeo.rotateX(-Math.PI / 2);

    const pos = groundGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      pos.setY(i, this.getGroundHeight(x, z));
    }
    groundGeo.computeVertexNormals();

    const groundTex = TextureGenerator.getGroundTextures();
    const groundMat = new THREE.MeshStandardMaterial({
      map: groundTex.diffuse,
      normalMap: groundTex.normal,
      roughnessMap: groundTex.roughness,
      color: 0x68644e, // Dried prairie grass & sandy gravel
      roughness: 0.9,
      metalness: 0.02
    });

    this.groundMesh = new THREE.Mesh(groundGeo, groundMat);
    this.groundMesh.castShadow = false;
    this.groundMesh.receiveShadow = true;
    this.groundMesh.name = 'GroundTerrain';
    this.scene.add(this.groundMesh);

    // Road Ribbon Mesh along roadSpline from valentineLayout.json with entrance extension
    const rawSpline: [number, number][] = [
      [112.0, 68.0],
      [98.0, 56.0],
      ...(valentineData.roadSpline as [number, number][])
    ];

    const splinePoints = rawSpline.map(
      ([x, z]) => new THREE.Vector3(x, this.getGroundHeight(x, z), z)
    );

    const curve = new THREE.CatmullRomCurve3(splinePoints, false, 'catmullrom', 0.5);
    const segments = 180;
    const roadWidth = 7.4;

    const roadGeo = new THREE.BufferGeometry();
    const positions: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const point = curve.getPointAt(t);
      const tangent = curve.getTangentAt(t).normalize();
      const normal = new THREE.Vector3(0, 1, 0);
      const binormal = new THREE.Vector3().crossVectors(tangent, normal).normalize();

      // Left vertex (slightly dipped for muddy wagon ruts)
      const left = new THREE.Vector3().copy(point).add(binormal.clone().multiplyScalar(roadWidth / 2));
      left.y = this.getGroundHeight(left.x, left.z) + 0.04;
      positions.push(left.x, left.y, left.z);
      uvs.push(0, t * 28);

      // Right vertex
      const right = new THREE.Vector3().copy(point).add(binormal.clone().multiplyScalar(-roadWidth / 2));
      right.y = this.getGroundHeight(right.x, right.z) + 0.04;
      positions.push(right.x, right.y, right.z);
      uvs.push(1, t * 28);
    }

    for (let i = 0; i < segments; i++) {
      const a = i * 2;
      const b = i * 2 + 1;
      const c = (i + 1) * 2;
      const d = (i + 1) * 2 + 1;

      indices.push(a, c, b);
      indices.push(b, c, d);
    }

    roadGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    roadGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    roadGeo.setIndex(indices);
    roadGeo.computeVertexNormals();

    const mudTex = TextureGenerator.getMuddyStreetTextures();
    // Deep dark muddy brown with specular wet-sheen for Valentine's iconic muddy main street
    const roadMat = new THREE.MeshStandardMaterial({
      map: mudTex.diffuse,
      normalMap: mudTex.normal,
      roughnessMap: mudTex.roughness,
      color: 0x2e1e12, // Deep dark mud tone standing out strikingly against prairie grass
      roughness: 0.65, // Wet churned mud sheen
      metalness: 0.10, // Specular highlights catching the golden sunlight
      polygonOffset: true,
      polygonOffsetFactor: -3,
      polygonOffsetUnits: -3
    });

    const roadMesh = new THREE.Mesh(roadGeo, roadMat);
    roadMesh.castShadow = false;
    roadMesh.receiveShadow = true;
    roadMesh.name = 'MainStreetRibbon';
    this.scene.add(roadMesh);
    this.roadMeshes.push(roadMesh);
  }

  /**
   * 2. Weathered Wood Boardwalks (Gehwege):
   * - Echtes Altholz-Material (aged weathered timber with grain, nails, and cracks)
   * - Elevated boardwalk structure along North and South sides of Main Street
   * - Stufen am Straßenrand (multi-tier wooden steps connecting the elevated boardwalk to the street curb)
   */
  private buildBoardwalks(): void {
    const boardwalkGroup = new THREE.Group();
    boardwalkGroup.name = 'ValentineBoardwalks';

    const agedWoodTex = TextureGenerator.getAgedWoodTextures();
    const plankMatA = new THREE.MeshStandardMaterial({
      map: agedWoodTex.diffuse,
      normalMap: agedWoodTex.normal,
      roughnessMap: agedWoodTex.roughness,
      color: 0x82705e, // Lifted weathered grey-brown aged wood
      roughness: 0.84,
      metalness: 0.02
    });
    const plankMatB = new THREE.MeshStandardMaterial({
      map: agedWoodTex.diffuse,
      normalMap: agedWoodTex.normal,
      roughnessMap: agedWoodTex.roughness,
      color: 0x736352, // Lifted warm aged plank tone
      roughness: 0.86,
      metalness: 0.02
    });
    const curbMat = new THREE.MeshStandardMaterial({
      map: agedWoodTex.diffuse,
      normalMap: agedWoodTex.normal,
      roughnessMap: agedWoodTex.roughness,
      color: 0x5e4f42, // Lifted timber beam curb
      roughness: 0.90
    });

    const bHeight = 0.28; // Elevated boardwalk height above street
    const plankWidth = 1.15;
    const boardwalkDepth = 2.4;

    // A. North Boardwalk (along Saloon, Store, Gunsmith: X from 31 to 57, Z ~ -15.0)
    for (let x = 31.0; x <= 57.0; x += plankWidth + 0.04) {
      const z = -15.0;
      const y = this.getGroundHeight(x, z);
      const plankGeo = new THREE.BoxGeometry(plankWidth, 0.12, boardwalkDepth);
      const mat = (Math.floor(x * 1.5) % 2 === 0) ? plankMatA : plankMatB;
      const plank = new THREE.Mesh(plankGeo, mat);
      plank.position.set(x, y + bHeight, z);
      plank.castShadow = true;
      plank.receiveShadow = true;
      boardwalkGroup.add(plank);
    }
    // North boardwalk street curb beam
    const curbNorthGeo = new THREE.BoxGeometry(26.5, bHeight, 0.2);
    const curbNorth = new THREE.Mesh(curbNorthGeo, curbMat);
    curbNorth.position.set(44.0, bHeight / 2, -15.0 + boardwalkDepth / 2 - 0.1);
    curbNorth.castShadow = true;
    curbNorth.receiveShadow = true;
    boardwalkGroup.add(curbNorth);

    // B. South Boardwalk (along Sheriff, Doctor, Hotel: X from 37 to 62, Z ~ -8.4)
    for (let x = 37.0; x <= 62.0; x += plankWidth + 0.04) {
      const z = -8.4;
      const y = this.getGroundHeight(x, z);
      const plankGeo = new THREE.BoxGeometry(plankWidth, 0.12, boardwalkDepth);
      const mat = (Math.floor(x * 1.5) % 2 === 0) ? plankMatB : plankMatA;
      const plank = new THREE.Mesh(plankGeo, mat);
      plank.position.set(x, y + bHeight, z);
      plank.castShadow = true;
      plank.receiveShadow = true;
      boardwalkGroup.add(plank);
    }
    // South boardwalk street curb beam
    const curbSouthGeo = new THREE.BoxGeometry(25.5, bHeight, 0.2);
    const curbSouth = new THREE.Mesh(curbSouthGeo, curbMat);
    curbSouth.position.set(49.5, bHeight / 2, -8.4 - boardwalkDepth / 2 + 0.1);
    curbSouth.castShadow = true;
    curbSouth.receiveShadow = true;
    boardwalkGroup.add(curbSouth);

    // C. STUFEN AM STRASSENRAND (Street Steps):
    // Multi-tier wooden steps connecting the elevated boardwalk to the street curb
    const stepLocations = [
      // North side: facing street (steps lead southward in local Z)
      { x: 35.0, z: -15.0 + boardwalkDepth / 2, dirZ: 1 },  // In front of Smithfield's Saloon
      { x: 40.5, z: -15.0 + boardwalkDepth / 2, dirZ: 1 },  // In front of General Store
      { x: 48.5, z: -15.0 + boardwalkDepth / 2, dirZ: 1 },  // In front of Gunsmith
      { x: 31.2, z: -15.0 + boardwalkDepth / 2, dirZ: 1 },  // West transition
      { x: 56.5, z: -15.0 + boardwalkDepth / 2, dirZ: 1 },  // East transition
      // South side: facing street (steps lead northward in local Z)
      { x: 41.5, z: -8.4 - boardwalkDepth / 2, dirZ: -1 },  // In front of Sheriff's Office
      { x: 50.5, z: -8.4 - boardwalkDepth / 2, dirZ: -1 },  // In front of Doctor's Clinic
      { x: 37.5, z: -8.4 - boardwalkDepth / 2, dirZ: -1 },  // West transition
      { x: 61.2, z: -8.4 - boardwalkDepth / 2, dirZ: -1 }   // East transition
    ];

    const stepWidth = 1.9;
    const stepRun = 0.34;

    for (const sLoc of stepLocations) {
      const sy = this.getGroundHeight(sLoc.x, sLoc.z);

      // Upper step
      const step1Geo = new THREE.BoxGeometry(stepWidth, 0.09, stepRun);
      const step1 = new THREE.Mesh(step1Geo, plankMatA);
      step1.position.set(
        sLoc.x,
        sy + bHeight * 0.66,
        sLoc.z + sLoc.dirZ * (stepRun / 2)
      );
      step1.castShadow = true;
      step1.receiveShadow = true;
      boardwalkGroup.add(step1);

      // Lower step
      const step2Geo = new THREE.BoxGeometry(stepWidth, 0.09, stepRun);
      const step2 = new THREE.Mesh(step2Geo, plankMatB);
      step2.position.set(
        sLoc.x,
        sy + bHeight * 0.33,
        sLoc.z + sLoc.dirZ * (stepRun * 1.45)
      );
      step2.castShadow = true;
      step2.receiveShadow = true;
      boardwalkGroup.add(step2);

      // Wooden side stringers (Wangen)
      for (const sideX of [-stepWidth / 2 + 0.05, stepWidth / 2 - 0.05]) {
        const stringerGeo = new THREE.BoxGeometry(0.1, bHeight, stepRun * 2.0);
        const stringer = new THREE.Mesh(stringerGeo, curbMat);
        stringer.position.set(
          sLoc.x + sideX,
          sy + bHeight / 2,
          sLoc.z + sLoc.dirZ * (stepRun)
        );
        stringer.castShadow = true;
        boardwalkGroup.add(stringer);
      }
    }

    this.scene.add(boardwalkGroup);
  }

  /**
   * 3. GLEIS-SYSTEM (AM BAHNHOF SÜDOST):
   * - Erzeuge zwei parallele Schienenstränge (BoxGeometry, Y=0.1, Metall-Material: metalness 0.85, roughness 0.3) entlang der Bahnhofs-Spline.
   * - Platziere quer liegende Holzschwellen im Abstand von 0.8 Einheiten.
   * - Schotterbett (Ballast-Mesh) unter den Schienen mit dunklem Kiesmaterial.
   */
  private buildRailroadAndStationTrack(): void {
    const trackGroup = new THREE.Group();
    trackGroup.name = 'ValentineRailroad';

    // Spline coordinates along southern perimeter from Station to Southwest
    const rawSpline = (valentineData as any).railroadSpline as [number, number][] || [
      [130.0, 64.0],
      [114.0, 65.0],
      [101.0, 65.0],
      [94.0, 59.0],
      [87.0, 56.2],
      [75.0, 54.0],
      [58.0, 54.0],
      [40.0, 55.0],
      [22.0, 63.0],
      [5.0, 66.0],
      [-14.0, 73.0],
      [-35.0, 80.0]
    ];

    const splinePoints = rawSpline.map(
      ([x, z]) => new THREE.Vector3(x, this.getGroundHeight(x, z), z)
    );
    const trackSpline = new THREE.CatmullRomCurve3(splinePoints, false, 'catmullrom', 0.5);
    const trackLen = trackSpline.getLength();

    // 1. SCHOTTERBETT (Ballast-Mesh unter den Schienen mit dunklem Kiesmaterial)
    const ballastTex = TextureGenerator.getBallastTextures();
    const ballastMat = new THREE.MeshStandardMaterial({
      map: ballastTex.diffuse,
      normalMap: ballastTex.normal,
      roughnessMap: ballastTex.roughness,
      color: 0x36332f, // Dark volcanic ballast gravel
      roughness: 0.95,
      metalness: 0.05
    });

    const ballastSegments = 200;
    const ballastTopW = 2.8;
    const ballastBaseW = 4.2;
    const ballastH = 0.12;

    const ballastGeo = new THREE.BufferGeometry();
    const bPositions: number[] = [];
    const bUvs: number[] = [];
    const bIndices: number[] = [];

    for (let i = 0; i <= ballastSegments; i++) {
      const t = i / ballastSegments;
      const pt = trackSpline.getPointAt(t);
      const tan = trackSpline.getTangentAt(t).normalize();
      const perp = new THREE.Vector3(-tan.z, 0, tan.x).normalize();

      const yBase = this.getGroundHeight(pt.x, pt.z) + 0.01;
      const yTop = yBase + ballastH;

      // 4 points in cross section: leftBase, leftTop, rightTop, rightBase
      const pLB = pt.clone().add(perp.clone().multiplyScalar(ballastBaseW / 2));
      pLB.y = yBase;
      const pLT = pt.clone().add(perp.clone().multiplyScalar(ballastTopW / 2));
      pLT.y = yTop;
      const pRT = pt.clone().add(perp.clone().multiplyScalar(-ballastTopW / 2));
      pRT.y = yTop;
      const pRB = pt.clone().add(perp.clone().multiplyScalar(-ballastBaseW / 2));
      pRB.y = yBase;

      bPositions.push(pLB.x, pLB.y, pLB.z);
      bPositions.push(pLT.x, pLT.y, pLT.z);
      bPositions.push(pRT.x, pRT.y, pRT.z);
      bPositions.push(pRB.x, pRB.y, pRB.z);

      const v = t * 18;
      bUvs.push(0.0, v, 0.35, v, 0.65, v, 1.0, v);
    }

    for (let i = 0; i < ballastSegments; i++) {
      const rowA = i * 4;
      const rowB = (i + 1) * 4;
      for (let quad = 0; quad < 3; quad++) {
        const a = rowA + quad;
        const b = rowA + quad + 1;
        const c = rowB + quad;
        const d = rowB + quad + 1;
        bIndices.push(a, c, b);
        bIndices.push(b, c, d);
      }
    }

    ballastGeo.setAttribute('position', new THREE.Float32BufferAttribute(bPositions, 3));
    ballastGeo.setAttribute('uv', new THREE.Float32BufferAttribute(bUvs, 2));
    ballastGeo.setIndex(bIndices);
    ballastGeo.computeVertexNormals();

    const ballastMesh = new THREE.Mesh(ballastGeo, ballastMat);
    ballastMesh.receiveShadow = true;
    ballastMesh.name = 'RailroadBallastBed';
    trackGroup.add(ballastMesh);

    // 2. HOLZSCHWELLEN (Quer liegende Holzschwellen im Abstand von 0.8 Einheiten)
    const tieSpacing = 0.8; // Fest vorgegebener 0.8 Einheiten Abstand
    const numTies = Math.floor(trackLen / tieSpacing);

    const tieMat = new THREE.MeshStandardMaterial({
      color: 0x241c15, // Dark creosoted timber
      roughness: 0.88,
      metalness: 0.02
    });
    const tieGeo = new THREE.BoxGeometry(2.4, 0.08, 0.24);

    for (let i = 0; i <= numTies; i++) {
      const dist = i * tieSpacing;
      const t = Math.min(dist / trackLen, 1.0);
      const tiePos = trackSpline.getPointAt(t);
      const tan = trackSpline.getTangentAt(t).normalize();
      const angle = Math.atan2(tan.x, tan.z);

      const tieMesh = new THREE.Mesh(tieGeo, tieMat);
      tieMesh.position.set(tiePos.x, tiePos.y + 0.05, tiePos.z);
      tieMesh.rotation.y = angle;
      tieMesh.castShadow = true;
      tieMesh.receiveShadow = true;
      trackGroup.add(tieMesh);
    }

    // 3. ZWEI PARALLELE SCHIENENSTRÄNGE:
    // BoxGeometry, Y=0.1, Metall-Material: metalness 0.90, roughness 0.25 (glänzend)
    const railMat = new THREE.MeshStandardMaterial({
      color: 0x9fa8b0, // Bright gleaming western steel
      metalness: 0.90, // strictly metallic glänzend
      roughness: 0.25  // strictly smooth polished head
    });

    const gauge = 1.435; // Standard gauge track width
    const railSegments = 180;

    for (let i = 0; i < railSegments; i++) {
      const t1 = i / railSegments;
      const t2 = (i + 1) / railSegments;

      const p1 = trackSpline.getPointAt(t1);
      const p2 = trackSpline.getPointAt(t2);
      const segVec = new THREE.Vector3().subVectors(p2, p1);
      const segLen = segVec.length();
      const segTan = segVec.clone().normalize();
      const segAngle = Math.atan2(segTan.x, segTan.z);
      const perp = new THREE.Vector3(-segTan.z, 0, segTan.x).normalize();

      const segMid = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
      const segGeo = new THREE.BoxGeometry(0.08, 0.10, segLen + 0.02);

      // Left Rail (Y=0.1)
      const pLeft = segMid.clone().add(perp.clone().multiplyScalar(gauge / 2));
      const leftRail = new THREE.Mesh(segGeo, railMat);
      leftRail.position.set(pLeft.x, pLeft.y + 0.10, pLeft.z);
      leftRail.rotation.y = segAngle;
      leftRail.castShadow = true;
      trackGroup.add(leftRail);

      // Right Rail (Y=0.1)
      const pRight = segMid.clone().add(perp.clone().multiplyScalar(-gauge / 2));
      const rightRail = new THREE.Mesh(segGeo, railMat);
      rightRail.position.set(pRight.x, pRight.y + 0.10, pRight.z);
      rightRail.rotation.y = segAngle;
      rightRail.castShadow = true;
      trackGroup.add(rightRail);
    }

    // 4. Erhöhte Holz-Ladeplattform am Bahnhofsgebäude mit Rampe
    const platformGroup = new THREE.Group();
    platformGroup.name = 'StationLoadingPlatform';
    const platMat = new THREE.MeshStandardMaterial({
      color: 0x625244,
      roughness: 0.78
    });
    const platWoodPiers = new THREE.MeshStandardMaterial({
      color: 0x3d3024,
      roughness: 0.85
    });

    const platLen = 14.0;
    const platW = 3.2;
    const platH = 0.75;

    const platDeckGeo = new THREE.BoxGeometry(platW, 0.12, platLen);
    const platDeck = new THREE.Mesh(platDeckGeo, platMat);
    platDeck.position.set(0, platH, 0);
    platDeck.castShadow = true;
    platDeck.receiveShadow = true;
    platformGroup.add(platDeck);

    for (let pz = -platLen / 2 + 1.0; pz <= platLen / 2 - 1.0; pz += 3.0) {
      for (const px of [-platW / 2 + 0.3, platW / 2 - 0.3]) {
        const pier = new THREE.Mesh(new THREE.BoxGeometry(0.2, platH, 0.2), platWoodPiers);
        pier.position.set(px, platH / 2, pz);
        pier.castShadow = true;
        platformGroup.add(pier);
      }
    }

    const rampLen = 4.0;
    const rampGeo = new THREE.BoxGeometry(platW, 0.1, rampLen);
    const ramp = new THREE.Mesh(rampGeo, platMat);
    const rampAngle = Math.atan2(platH, rampLen);
    ramp.position.set(0, platH / 2, platLen / 2 + (rampLen / 2) * Math.cos(rampAngle));
    ramp.rotation.x = -rampAngle;
    ramp.castShadow = true;
    ramp.receiveShadow = true;
    platformGroup.add(ramp);

    platformGroup.position.set(87.0, 0, 50.2);
    platformGroup.rotation.y = 0.22;
    trackGroup.add(platformGroup);

    // 5. Railroad Water Tower on tall timber stilts for steam locomotives
    const wtGroup = new THREE.Group();
    wtGroup.name = 'RailroadWaterTower';
    const wtStiltMat = new THREE.MeshStandardMaterial({ color: 0x483726, roughness: 0.85 });
    const wtWoodMat = new THREE.MeshStandardMaterial({ color: 0x5a4533, roughness: 0.8 });
    const wtRoofMat = new THREE.MeshStandardMaterial({ color: 0x33281e, roughness: 0.75 });
    const wtBandMat = new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.8, roughness: 0.4 });

    const stiltH = 6.0;
    const tankR = 2.4;
    const tankH = 3.4;

    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, stiltH, 6), wtStiltMat);
      leg.position.set(Math.cos(a) * 1.8, stiltH / 2, Math.sin(a) * 1.8);
      leg.castShadow = true;
      wtGroup.add(leg);
    }

    const supDeck = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.16, 4.2), wtStiltMat);
    supDeck.position.set(0, stiltH, 0);
    supDeck.castShadow = true;
    wtGroup.add(supDeck);

    const tank = new THREE.Mesh(new THREE.CylinderGeometry(tankR, tankR, tankH, 20), wtWoodMat);
    tank.position.set(0, stiltH + tankH / 2, 0);
    tank.castShadow = true;
    wtGroup.add(tank);

    for (const bh of [-1.0, 0, 1.0]) {
      const band = new THREE.Mesh(new THREE.TorusGeometry(tankR + 0.02, 0.025, 8, 24), wtBandMat);
      band.position.set(0, stiltH + tankH / 2 + bh, 0);
      band.rotation.x = Math.PI / 2;
      wtGroup.add(band);
    }

    const roof = new THREE.Mesh(new THREE.ConeGeometry(tankR + 0.35, 1.6, 20), wtRoofMat);
    roof.position.set(0, stiltH + tankH + 0.8, 0);
    roof.castShadow = true;
    wtGroup.add(roof);

    const spout = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 2.8, 8), wtBandMat);
    spout.position.set(tankR * 0.8, stiltH + tankH * 0.4, 0);
    spout.rotation.z = -Math.PI / 3;
    wtGroup.add(spout);

    wtGroup.position.set(98.0, 0, 58.0);
    trackGroup.add(wtGroup);

    this.scene.add(trackGroup);
  }

  /**
   * 4. Dynamically place all buildings from valentineLayout.json with:
   * - 0.2 high visible stone foundation (Grau-/Naturstein-Look)
   * - Distinct architectural features per type (Saloon, Stable, Church, Station, Store, Sheriff)
   */
  private buildAllDynamicBuildings(): void {
    const buildingsList = valentineData.buildings as LayoutBuilding[];

    for (const b of buildingsList) {
      this.createDynamicBuilding(b);
    }
  }

  private createDynamicBuilding(data: LayoutBuilding): void {
    const { id, name, pos, size, rotY } = data;
    const [w, d, h] = size;
    const posX = pos[0];
    const posZ = pos[1];

    // 1. HARTER PURGE DER FALSCHEN HÄUSER:
    // Lösche bedingungslos alle generischen Gebäude-Meshes im südlichen Bahnhofs- und Viehbereich.
    // Dort stehen ausschließlich offene Tierkoppeln / Gatter und Schienen!
    if (id.startsWith('bldg_') && posZ > 15.0) {
      console.warn(`[ValentineCity] Hard Purge: Discarding generic building ${id} (${name}) at [${posX}, ${posZ}] in southern livestock & rail zone.`);
      return;
    }

    // 2. STRASSEN- & BAHNHOF-FREIRAUM:
    // Prüfe die Bounding-Boxes: Wenn eine Schiene eine Haus-Box schneidet, hat die Schiene Vorrang und das Gebäude wird verworfen.
    if (id !== 'station') {
      const railPoints = (valentineData.railroadSpline as [number, number][]).map(
        ([rx, rz]) => new THREE.Vector2(rx, rz)
      );
      const bldgRadius = Math.hypot(w, d) / 2;
      const minRailDist = bldgRadius + 3.0; // 3m Sicherheitsabstand zum Gleisbett

      for (let i = 0; i < railPoints.length - 1; i++) {
        const p1 = railPoints[i];
        const p2 = railPoints[i + 1];
        const seg = new THREE.Vector2().subVectors(p2, p1);
        const wVec = new THREE.Vector2(posX - p1.x, posZ - p1.y);
        const c1 = wVec.dot(seg);
        const c2 = seg.dot(seg);
        let dist = Infinity;
        if (c1 <= 0) {
          dist = wVec.length();
        } else if (c2 <= c1) {
          dist = new THREE.Vector2(posX - p2.x, posZ - p2.y).length();
        } else {
          const b = c1 / c2;
          const pb = new THREE.Vector2().addVectors(p1, seg.clone().multiplyScalar(b));
          dist = new THREE.Vector2(posX - pb.x, posZ - pb.y).length();
        }

        if (dist < minRailDist) {
          console.warn(`[ValentineCity] Rail clearance priority: Discarded ${id} (${name}) at [${posX}, ${posZ}] - cuts rail track corridor (dist: ${dist.toFixed(1)}m, min: ${minRailDist.toFixed(1)}m).`);
          return;
        }
      }

      // Check against road corridor (keep main street completely free)
      const roadPoints = (valentineData.roadSpline as [number, number][]).map(
        ([rx, rz]) => new THREE.Vector2(rx, rz)
      );
      const minRoadDist = (7.0 / 2) + Math.min(w, d) / 2 - 0.4;
      for (let i = 0; i < roadPoints.length - 1; i++) {
        const p1 = roadPoints[i];
        const p2 = roadPoints[i + 1];
        const seg = new THREE.Vector2().subVectors(p2, p1);
        const wVec = new THREE.Vector2(posX - p1.x, posZ - p1.y);
        const c1 = wVec.dot(seg);
        const c2 = seg.dot(seg);
        let dist = Infinity;
        if (c1 <= 0) {
          dist = wVec.length();
        } else if (c2 <= c1) {
          dist = new THREE.Vector2(posX - p2.x, posZ - p2.y).length();
        } else {
          const b = c1 / c2;
          const pb = new THREE.Vector2().addVectors(p1, seg.clone().multiplyScalar(b));
          dist = new THREE.Vector2(posX - pb.x, posZ - pb.y).length();
        }

        if (dist < minRoadDist) {
          console.warn(`[ValentineCity] Road clearance conflict: Discarded ${id} (${name}) at [${posX}, ${posZ}] - encroaches on main street (dist: ${dist.toFixed(1)}m, min: ${minRoadDist.toFixed(1)}m).`);
          return;
        }
      }
    }

    const groundY = this.getGroundHeight(posX, posZ);

    const bGroup = new THREE.Group();
    bGroup.name = name;
    bGroup.position.set(posX, groundY, posZ);
    bGroup.rotation.y = rotY;

    const wallThickness = 0.25;
    const roofMaterials: THREE.MeshStandardMaterial[] = [];

    // Distinct Palettes & PBR Materials per building type
    let wallColor = 0x5a4230;
    let roofColor = 0x3d281a;
    let trimColor = 0x6e523c;
    let wallPbrTex: { diffuse: THREE.Texture; normal: THREE.Texture; roughness: THREE.Texture } | null = null;
    let roofPbrTex: { diffuse: THREE.Texture; normal: THREE.Texture; roughness: THREE.Texture } | null = null;

    if (id === 'big_barn' || id === 'stable' || id === 'livestock_auction') {
      wallPbrTex = TextureGenerator.getBarnRedWoodTextures();
      wallColor = 0x5a3e2a; // Weathered dark timber barn wood
      roofColor = 0x2e221c;
      trimColor = 0x6e4e36;
    } else if (id === 'church') {
      wallPbrTex = TextureGenerator.getClapboardTextures('aged_white');
      roofPbrTex = TextureGenerator.getRoofTextures();
      wallColor = 0xdfdbd2; // Painted white chapel weatherboards
      roofColor = 0x383530; // Dark grey slate shingles
      trimColor = 0xb5b0a6;
    } else if (id === 'saloon') {
      wallPbrTex = TextureGenerator.getWoodPlankTextures('dark_cedar');
      wallColor = 0x5e3c25; // Rich two-story saloon timber
      roofColor = 0x332014;
      trimColor = 0x8a5b3a; // Warm cedar balustrades & trim
    } else if (id === 'store') {
      wallPbrTex = TextureGenerator.getWoodPlankTextures('honey_pine');
      wallColor = 0x7a6e55; // Weathered muted ochre/buff clapboard
      roofColor = 0x362d22;
      trimColor = 0x96876c;
    } else if (id === 'doctor') {
      wallPbrTex = TextureGenerator.getClapboardTextures('aged_white');
      wallColor = 0x9c9688; // Aged cream medical practice
      roofColor = 0x3a3028;
      trimColor = 0xb2aca0;
    } else if (id === 'sheriff') {
      wallPbrTex = TextureGenerator.getWoodPlankTextures('dark_cedar');
      wallColor = 0x544739; // Weathered pine jailhouse
      roofColor = 0x2e241c;
      trimColor = 0x6e5d4c;
    } else if (id === 'hotel') {
      wallPbrTex = TextureGenerator.getWoodPlankTextures('dark_cedar');
      wallColor = 0x6a5845; // Saints Hotel two-story boarding timber
      roofColor = 0x35281e;
      trimColor = 0x826e58;
    } else if (id === 'station') {
      wallPbrTex = TextureGenerator.getWoodPlankTextures('dark_cedar');
      wallColor = 0x524032; // Railroad depot weathered timber
      roofColor = 0x2b221a;
      trimColor = 0x695443;
    }

    const floorMat = new THREE.MeshStandardMaterial({ color: 0x6e5239, roughness: 0.85 });
    
    // UV-Wiederholrate an die Objektgröße angepasst: 1 Planke pro 0.3 Meter (Wände: repeat.set(w / 2.0, h / 1.0))
    const wallRepeatX = Math.max(1, Math.round(w / 2.0));
    const wallRepeatY = Math.max(1, Math.round(h / 1.0));

    // Procedural HTML5-canvas Wood Material with diffuse, dark plank seams, knots, and bumpMap (0.85 roughness)
    let wallMat: THREE.MeshStandardMaterial;
    if (id === 'church' || id === 'doctor') {
      const { diffuseTexture, bumpTexture } = WoodMaterials.generateWoodPlankCanvases({
        baseColor: id === 'church' ? '#e2ded5' : '#a29c8e',
        seamColor: '#2b2620',
        grainColor: 'rgba(40, 36, 30, 0.35)',
        repeatX: wallRepeatX,
        repeatY: wallRepeatY
      });
      wallMat = new THREE.MeshStandardMaterial({
        map: diffuseTexture,
        bumpMap: bumpTexture,
        bumpScale: 0.12,
        roughness: 0.85,
        metalness: 0.04
      });
    } else if (id === 'stable') {
      const { diffuseTexture, bumpTexture } = WoodMaterials.generateWoodPlankCanvases({
        baseColor: '#6e261e',
        seamColor: '#260a07',
        grainColor: 'rgba(38, 12, 10, 0.4)',
        repeatX: wallRepeatX,
        repeatY: wallRepeatY
      });
      wallMat = new THREE.MeshStandardMaterial({
        map: diffuseTexture,
        bumpMap: bumpTexture,
        bumpScale: 0.14,
        roughness: 0.85,
        metalness: 0.05
      });
    } else if (id === 'store') {
      wallMat = WoodMaterials.getHoneyPineMaterial(wallRepeatX, wallRepeatY);
    } else {
      wallMat = WoodMaterials.getDarkCedarMaterial(wallRepeatX, wallRepeatY);
    }
    const trimMat = new THREE.MeshStandardMaterial({ color: trimColor, roughness: 0.7 });
    const roofMat = new THREE.MeshStandardMaterial({
      color: roofColor,
      map: roofPbrTex ? roofPbrTex.diffuse : undefined,
      normalMap: roofPbrTex ? roofPbrTex.normal : undefined,
      roughnessMap: roofPbrTex ? roofPbrTex.roughness : undefined,
      roughness: 0.85,
      transparent: true,
      opacity: 1.0
    });
    roofMaterials.push(roofMat);

    // 1. VISIBLE STONE FOUNDATION (0.2 high natural stone plinth catches ground slope)
    const stoneFoundationMat = new THREE.MeshStandardMaterial({
      color: 0x75726d, // Rough natural stone/limestone
      roughness: 0.92,
      metalness: 0.05
    });
    const foundationGeo = new THREE.BoxGeometry(w + 0.16, 0.22, d + 0.16);
    const foundation = new THREE.Mesh(foundationGeo, stoneFoundationMat);
    foundation.position.set(0, 0.11, 0);
    foundation.castShadow = true;
    foundation.receiveShadow = true;
    bGroup.add(foundation);

    // 2. FLOOR PLANKING
    const floorGeo = new THREE.BoxGeometry(w, 0.1, d);
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.position.set(0, 0.24, 0);
    floor.receiveShadow = true;
    bGroup.add(floor);

    // 3. BACK WALL (local Z = -d / 2)
    const backWallGeo = new THREE.BoxGeometry(w, h, wallThickness);
    const backWall = new THREE.Mesh(backWallGeo, wallMat);
    backWall.position.set(0, 0.2 + h / 2, -d / 2 + wallThickness / 2);
    backWall.castShadow = true;
    backWall.receiveShadow = true;
    bGroup.add(backWall);

    // 4. SIDE WALLS (local X = -w/2 and +w/2)
    const sideLen = d - wallThickness * 2;
    const sideGeo = new THREE.BoxGeometry(wallThickness, h, sideLen);

    const leftWall = new THREE.Mesh(sideGeo, wallMat);
    leftWall.position.set(-w / 2 + wallThickness / 2, 0.2 + h / 2, 0);
    leftWall.castShadow = true;
    leftWall.receiveShadow = true;
    bGroup.add(leftWall);

    const rightWall = new THREE.Mesh(sideGeo, wallMat);
    rightWall.position.set(w / 2 - wallThickness / 2, 0.2 + h / 2, 0);
    rightWall.castShadow = true;
    rightWall.receiveShadow = true;
    bGroup.add(rightWall);

    // Vertical corner timber posts [0.25, h, 0.25] slightly protruding at all four corners
    const cornerGeo = new THREE.BoxGeometry(0.25, h, 0.25);
    const cornerPositions = [
      { cx: -w / 2, cz: d / 2 },
      { cx: w / 2, cz: d / 2 },
      { cx: -w / 2, cz: -d / 2 },
      { cx: w / 2, cz: -d / 2 }
    ];
    for (const cp of cornerPositions) {
      const cPost = new THREE.Mesh(cornerGeo, wallMat);
      cPost.position.set(cp.cx, 0.2 + h / 2, cp.cz);
      cPost.castShadow = true;
      cPost.receiveShadow = true;
      bGroup.add(cPost);
    }

    // 5. FRONT WALL WITH DOOR OPENING (local Z = +d/2, facing road)
    const doorW = (id === 'stable') ? Math.min(4.0, w * 0.48) : Math.min(1.8, w * 0.35);
    const doorH = (id === 'stable') ? Math.min(3.6, h * 0.55) : Math.min(2.6, h * 0.52);
    const segW = (w - doorW) / 2;

    const frontLeftGeo = new THREE.BoxGeometry(segW, h, wallThickness);
    const frontLeft = new THREE.Mesh(frontLeftGeo, wallMat);
    frontLeft.position.set(-w / 2 + segW / 2, 0.2 + h / 2, d / 2 - wallThickness / 2);
    frontLeft.castShadow = true;
    frontLeft.receiveShadow = true;
    bGroup.add(frontLeft);

    const frontRightGeo = new THREE.BoxGeometry(segW, h, wallThickness);
    const frontRight = new THREE.Mesh(frontRightGeo, wallMat);
    frontRight.position.set(w / 2 - segW / 2, 0.2 + h / 2, d / 2 - wallThickness / 2);
    frontRight.castShadow = true;
    frontRight.receiveShadow = true;
    bGroup.add(frontRight);

    // Lintel above door
    const lintelH = h - doorH;
    const lintelGeo = new THREE.BoxGeometry(doorW, lintelH, wallThickness);
    const lintel = new THREE.Mesh(lintelGeo, wallMat);
    lintel.position.set(0, 0.2 + doorH + lintelH / 2, d / 2 - wallThickness / 2);
    lintel.castShadow = true;
    bGroup.add(lintel);

    // 6. ARCHITECTURAL SPECIAL DETAILS PER BUILDING TYPE

    // --- SMITHFIELD'S SALOON (ZWEIGESCHOSSIG, VERANDA-VORDACH MIT GELÄNDER OBEN, SCHILD-GEOMETRIE) ---
    if (id === 'saloon') {
      const porchDepth = 2.4;
      const firstFloorH = 3.4;

      // a) Ground Floor: Swinging Batwing Doors
      const batwingMat = new THREE.MeshStandardMaterial({ color: 0x6a4025, roughness: 0.72 });
      const batwingW = doorW * 0.44;
      const batwingH = 1.15;
      const batwingY = 0.2 + 0.75 + batwingH / 2;

      const doorLeft = new THREE.Mesh(new THREE.BoxGeometry(batwingW, batwingH, 0.05), batwingMat);
      doorLeft.position.set(-doorW / 4, batwingY, d / 2 - wallThickness / 2);
      bGroup.add(doorLeft);

      const doorRight = new THREE.Mesh(new THREE.BoxGeometry(batwingW, batwingH, 0.05), batwingMat);
      doorRight.position.set(doorW / 4, batwingY, d / 2 - wallThickness / 2);
      bGroup.add(doorRight);

      // b) Ground Floor: Warm Glowing Tavern Windows on either side
      const glowTex = TextureGenerator.getWindowGlowTexture();
      const windowMat = new THREE.MeshStandardMaterial({
        map: glowTex,
        roughness: 0.3,
        emissive: 0x4a2a10,
        emissiveIntensity: 0.4
      });
      const windowFrameMat = trimMat;

      for (const wx of [-w / 2 + segW / 2, w / 2 - segW / 2]) {
        const winGlass = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.8, 0.05), windowMat);
        winGlass.position.set(wx, 0.2 + 1.8, d / 2 + 0.01);
        bGroup.add(winGlass);

        const winFrame = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.0, 0.08), windowFrameMat);
        winFrame.position.set(wx, 0.2 + 1.8, d / 2);
        bGroup.add(winFrame);
      }

      // c) Middle Frieze / Cornice band (divides ground floor & second floor)
      const corniceGeo = new THREE.BoxGeometry(w + 0.3, 0.18, wallThickness + 0.15);
      const cornice = new THREE.Mesh(corniceGeo, trimMat);
      cornice.position.set(0, 0.2 + firstFloorH, d / 2);
      cornice.castShadow = true;
      bGroup.add(cornice);

      // d) Second Story: Upper Balcony Doorway & Windows
      const upperDoor = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.2, 0.06), trimMat);
      upperDoor.position.set(0, 0.2 + firstFloorH + 1.15, d / 2 - wallThickness / 2 + 0.02);
      bGroup.add(upperDoor);

      for (const wx of [-w / 2 + segW / 2, w / 2 - segW / 2]) {
        const uWin = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.6, 0.06), trimMat);
        uWin.position.set(wx, 0.2 + firstFloorH + 1.4, d / 2 + 0.01);
        bGroup.add(uWin);
      }

      // e) Covered Veranda Porch with sturdy Turned Timber Pillars (Ground floor)
      const numPosts = 5;
      for (let i = 0; i < numPosts; i++) {
        const px = -w / 2 + 0.4 + (i / (numPosts - 1)) * (w - 0.8);
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.2, firstFloorH, 0.2), trimMat);
        post.position.set(px, 0.2 + firstFloorH / 2, d / 2 + porchDepth);
        post.castShadow = true;
        bGroup.add(post);

        // Capital brackets
        const cap = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.1, 0.3), trimMat);
        cap.position.set(px, 0.2 + firstFloorH - 0.05, d / 2 + porchDepth);
        bGroup.add(cap);
      }

      // f) First Floor Balcony Deck (Holzplanken-Boden)
      const balconyDeck = new THREE.Mesh(
        new THREE.BoxGeometry(w + 0.25, 0.14, porchDepth + 0.15),
        floorMat
      );
      balconyDeck.position.set(0, 0.2 + firstFloorH, d / 2 + porchDepth / 2);
      balconyDeck.castShadow = true;
      balconyDeck.receiveShadow = true;
      bGroup.add(balconyDeck);

      // g) GELÄNDER OBEN (Balustrade Handrail, Base Rail & vertical turned balusters)
      const handrailGeo = new THREE.BoxGeometry(w + 0.25, 0.09, 0.09);
      const handrail = new THREE.Mesh(handrailGeo, trimMat);
      handrail.position.set(0, 0.2 + firstFloorH + 0.95, d / 2 + porchDepth);
      handrail.castShadow = true;
      bGroup.add(handrail);

      const baseRailGeo = new THREE.BoxGeometry(w + 0.25, 0.06, 0.06);
      const baseRail = new THREE.Mesh(baseRailGeo, trimMat);
      baseRail.position.set(0, 0.2 + firstFloorH + 0.15, d / 2 + porchDepth);
      bGroup.add(baseRail);

      // Side rails (left & right)
      const sideRailGeo = new THREE.BoxGeometry(0.09, 0.09, porchDepth);
      const sideRailL = new THREE.Mesh(sideRailGeo, trimMat);
      sideRailL.position.set(-w / 2 - 0.08, 0.2 + firstFloorH + 0.95, d / 2 + porchDepth / 2);
      bGroup.add(sideRailL);
      const sideRailR = new THREE.Mesh(sideRailGeo, trimMat);
      sideRailR.position.set(w / 2 + 0.08, 0.2 + firstFloorH + 0.95, d / 2 + porchDepth / 2);
      bGroup.add(sideRailR);

      // Vertical turned balusters (Geländerstäbe) along the front
      for (let bx = -w / 2 + 0.35; bx <= w / 2 - 0.35; bx += 0.38) {
        const baluster = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.75, 0.06), trimMat);
        baluster.position.set(bx, 0.2 + firstFloorH + 0.55, d / 2 + porchDepth);
        bGroup.add(baluster);
      }
      // Balusters on sides
      for (let bz = d / 2 + 0.4; bz <= d / 2 + porchDepth - 0.3; bz += 0.45) {
        const bL = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.75, 0.06), trimMat);
        bL.position.set(-w / 2 - 0.08, 0.2 + firstFloorH + 0.55, bz);
        bGroup.add(bL);
        const bR = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.75, 0.06), trimMat);
        bR.position.set(w / 2 + 0.08, 0.2 + firstFloorH + 0.55, bz);
        bGroup.add(bR);
      }

      // h) Veranda-Vordach (Upper Porch Awning Roof sheltering the balcony)
      const upperPostH = h - firstFloorH;
      for (let i = 0; i < numPosts; i++) {
        const px = -w / 2 + 0.4 + (i / (numPosts - 1)) * (w - 0.8);
        const uPost = new THREE.Mesh(new THREE.BoxGeometry(0.16, upperPostH, 0.16), trimMat);
        uPost.position.set(px, 0.2 + firstFloorH + upperPostH / 2, d / 2 + porchDepth);
        bGroup.add(uPost);
      }

      const upperRoofGeo = new THREE.BoxGeometry(w + 0.3, 0.10, porchDepth + 0.25);
      const upperRoof = new THREE.Mesh(upperRoofGeo, roofMat);
      upperRoof.position.set(0, 0.2 + h - 0.1, d / 2 + porchDepth / 2);
      upperRoof.castShadow = true;
      roofMaterials.push(upperRoof.material as THREE.MeshStandardMaterial);
      bGroup.add(upperRoof);

      // i) SCHILD-GEOMETRIE ÜBER DEM EINGANG (SMITHFIELD'S SALOON)
      // High-detail 3D sign structure with western signboard canvas texture
      const signTex = TextureGenerator.getSaloonSignTexture();
      const signW = Math.min(w * 0.75, 6.8);
      const signH = 1.35;
      const signMat = new THREE.MeshStandardMaterial({
        map: signTex,
        roughness: 0.65,
        metalness: 0.1
      });
      const signPlate = new THREE.Mesh(new THREE.BoxGeometry(signW, signH, 0.12), signMat);
      signPlate.position.set(0, 0.2 + firstFloorH + 1.25, d / 2 + porchDepth + 0.08);
      signPlate.castShadow = true;
      bGroup.add(signPlate);

      // Gold ornate molding frame & mounting brackets
      const frameMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.7, roughness: 0.3 });
      const topFrame = new THREE.Mesh(new THREE.BoxGeometry(signW + 0.16, 0.08, 0.16), frameMat);
      topFrame.position.set(0, 0.2 + firstFloorH + 1.25 + signH / 2, d / 2 + porchDepth + 0.08);
      bGroup.add(topFrame);

      const botFrame = new THREE.Mesh(new THREE.BoxGeometry(signW + 0.16, 0.08, 0.16), frameMat);
      botFrame.position.set(0, 0.2 + firstFloorH + 1.25 - signH / 2, d / 2 + porchDepth + 0.08);
      bGroup.add(botFrame);

      // Wrought-iron mounting chains/hangers
      const ironMat = new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.85, roughness: 0.3 });
      for (const cx of [-signW * 0.4, signW * 0.4]) {
        const hanger = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.8, 6), ironMat);
        hanger.position.set(cx, 0.2 + firstFloorH + 1.25 + signH / 2 + 0.4, d / 2 + porchDepth + 0.08);
        bGroup.add(hanger);
      }

    // --- LIVERY STABLE (RÖTLICHER SCHEUNEN-HOLZTON, GROSSES GIEBEL-TOR) ---
    } else if (id === 'stable') {
      const gateMat = wallMat;
      const xBraceMat = trimMat;
      const ironMat = new THREE.MeshStandardMaterial({ color: 0x1f1f1f, metalness: 0.85, roughness: 0.3 });

      // a) GROSSES GIEBEL-TOR (Massive Double Wagon Barn Doors)
      const halfW = doorW * 0.48;
      const leftDoor = new THREE.Mesh(new THREE.BoxGeometry(halfW, doorH, 0.08), gateMat);
      leftDoor.position.set(-doorW / 4, 0.2 + doorH / 2, d / 2 - wallThickness / 2);
      leftDoor.castShadow = true;
      bGroup.add(leftDoor);

      const rightDoor = new THREE.Mesh(new THREE.BoxGeometry(halfW, doorH, 0.08), gateMat);
      rightDoor.position.set(doorW / 4, 0.2 + doorH / 2, d / 2 - wallThickness / 2);
      rightDoor.castShadow = true;
      bGroup.add(rightDoor);

      // Diagonal X-Brace timber overlays on both gate leaves
      const braceLen = Math.hypot(halfW * 0.9, doorH * 0.45);
      const braceAngle = Math.atan2(doorH * 0.45, halfW * 0.9);

      for (const dirX of [-1, 1]) {
        const cx = dirX * (doorW / 4);
        for (const dirY of [-1, 1]) {
          const cy = 0.2 + (doorH / 2) + dirY * (doorH * 0.22);
          const b1 = new THREE.Mesh(new THREE.BoxGeometry(braceLen, 0.14, 0.06), xBraceMat);
          b1.position.set(cx, cy, d / 2 - wallThickness / 2 + 0.05);
          b1.rotation.z = braceAngle;
          bGroup.add(b1);

          const b2 = new THREE.Mesh(new THREE.BoxGeometry(braceLen, 0.14, 0.06), xBraceMat);
          b2.position.set(cx, cy, d / 2 - wallThickness / 2 + 0.05);
          b2.rotation.z = -braceAngle;
          bGroup.add(b2);
        }

        // Horizontal Iron Strap Hinges with Rivets
        for (const hy of [0.2 + doorH * 0.2, 0.2 + doorH * 0.8]) {
          const strap = new THREE.Mesh(new THREE.BoxGeometry(halfW * 0.8, 0.08, 0.04), ironMat);
          strap.position.set(cx, hy, d / 2 - wallThickness / 2 + 0.06);
          bGroup.add(strap);
        }
      }

      // Heavy Iron Drop Latch in the center
      const latch = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.12, 0.06), ironMat);
      latch.position.set(0, 0.2 + doorH * 0.5, d / 2 - wallThickness / 2 + 0.07);
      bGroup.add(latch);

      // b) Hayloft Upper Loading Door & Hoist Crane Beam
      const hayloftDoor = new THREE.Mesh(new THREE.BoxGeometry(1.8, 2.0, 0.08), gateMat);
      hayloftDoor.position.set(0, 0.2 + h - 1.2, d / 2);
      hayloftDoor.castShadow = true;
      bGroup.add(hayloftDoor);

      // Timber crane beam extending 1.8m outward from apex
      const craneBeam = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.24, 2.8), trimMat);
      craneBeam.position.set(0, 0.2 + h + 0.35, d / 2 + 1.0);
      craneBeam.castShadow = true;
      bGroup.add(craneBeam);

      // Pulley wheel & rope
      const pulley = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.03, 8, 16), ironMat);
      pulley.position.set(0, 0.2 + h + 0.15, d / 2 + 2.0);
      bGroup.add(pulley);

      const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 2.4, 6), trimMat);
      rope.position.set(0, 0.2 + h - 1.05, d / 2 + 2.0);
      bGroup.add(rope);

      // Horse water trough outside Livery Stable
      const troughMat = new THREE.MeshStandardMaterial({ color: 0x4a3a2d, roughness: 0.85 });
      const waterMat = new THREE.MeshStandardMaterial({ color: 0x3d5a52, roughness: 0.15, metalness: 0.1 });
      const trough = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.6, 0.8), troughMat);
      trough.position.set(-w / 2 - 0.8, 0.3, d / 2 - 1.2);
      trough.castShadow = true;
      bGroup.add(trough);

      const water = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.1, 0.65), waterMat);
      water.position.set(-w / 2 - 0.8, 0.52, d / 2 - 1.2);
      bGroup.add(water);

    // --- VALENTINE BIG AUCTION BARN (DARK WEATHERED TIMBER, SADDLE ROOF, ATTACHED HORSE CORRALS) ---
    } else if (id === 'big_barn') {
      const timberMat = new THREE.MeshStandardMaterial({
        color: 0x483321,
        roughness: 0.88
      });

      // a) Big sliding barn double doors with X-cross bracing on front facade
      const doorW = 3.6;
      const doorH = 4.2;
      const barnDoorL = new THREE.Mesh(new THREE.BoxGeometry(doorW / 2 - 0.05, doorH, 0.12), timberMat);
      barnDoorL.position.set(-doorW / 4, doorH / 2, d / 2 + 0.06);
      bGroup.add(barnDoorL);

      const barnDoorR = new THREE.Mesh(new THREE.BoxGeometry(doorW / 2 - 0.05, doorH, 0.12), timberMat);
      barnDoorR.position.set(doorW / 4, doorH / 2, d / 2 + 0.06);
      bGroup.add(barnDoorR);

      // X-brace planks on barn doors
      const braceMat = new THREE.MeshStandardMaterial({ color: 0x362516, roughness: 0.9 });
      for (const dx of [-doorW / 4, doorW / 4]) {
        const brace1 = new THREE.Mesh(new THREE.BoxGeometry(0.12, Math.hypot(doorW / 2, doorH * 0.45), 0.14), braceMat);
        brace1.position.set(dx, doorH * 0.25, d / 2 + 0.1);
        brace1.rotation.z = Math.atan2(doorH * 0.45, doorW / 2);
        bGroup.add(brace1);

        const brace2 = new THREE.Mesh(new THREE.BoxGeometry(0.12, Math.hypot(doorW / 2, doorH * 0.45), 0.14), braceMat);
        brace2.position.set(dx, doorH * 0.25, d / 2 + 0.1);
        brace2.rotation.z = -Math.atan2(doorH * 0.45, doorW / 2);
        bGroup.add(brace2);
      }

      // b) Upper Hayloft Door & Projecting Hoist Timber with Pulley
      const hayDoor = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.0, 0.1), timberMat);
      hayDoor.position.set(0, h * 0.75, d / 2 + 0.06);
      bGroup.add(hayDoor);

      const hoistBeam = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 1.8), timberMat);
      hoistBeam.position.set(0, h * 0.95, d / 2 + 0.9);
      bGroup.add(hoistBeam);

      // Iron Pulley Wheel
      const pulleyMat = new THREE.MeshStandardMaterial({ color: 0x1f1f1f, metalness: 0.8, roughness: 0.4 });
      const pulley = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.08, 12), pulleyMat);
      pulley.rotation.z = Math.PI / 2;
      pulley.position.set(0, h * 0.95 - 0.2, d / 2 + 1.2);
      bGroup.add(pulley);

      // c) Attached Horse Corrals (Open wooden fence paddocks on west and south)
      const fencePostMat = WoodMaterials.getWeatheredGreyMaterial(1, 1);
      const fenceRailMat = WoodMaterials.getWeatheredGreyMaterial(2, 1);
      const postGeo = new THREE.BoxGeometry(0.16, 1.5, 0.16);

      // Paddock perimeter on west side of the barn
      const paddockW = 10.0;
      const paddockD = 12.0;
      const startX = -w / 2;
      const postCountX = Math.round(paddockW / 2.4);
      const postCountZ = Math.round(paddockD / 2.4);

      // West fence run
      for (let i = 0; i <= postCountZ; i++) {
        const pz = -d / 2 + (i / postCountZ) * paddockD;
        const post = new THREE.Mesh(postGeo, fencePostMat);
        post.position.set(startX - paddockW, 0.75, pz);
        post.castShadow = true;
        bGroup.add(post);

        if (i < postCountZ) {
          const midZ = -d / 2 + ((i + 0.5) / postCountZ) * paddockD;
          for (const ry of [0.4, 0.85, 1.3]) {
            const rail = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.09, paddockD / postCountZ), fenceRailMat);
            rail.position.set(startX - paddockW, ry, midZ);
            rail.castShadow = true;
            bGroup.add(rail);
          }
        }
      }

      // South fence run (with open entrance gap)
      for (let i = 0; i <= postCountX; i++) {
        const px = startX - paddockW + (i / postCountX) * paddockW;
        if (i === Math.floor(postCountX / 2)) continue; // Gate gap

        const post = new THREE.Mesh(postGeo, fencePostMat);
        post.position.set(px, 0.75, -d / 2 + paddockD);
        post.castShadow = true;
        bGroup.add(post);

        if (i < postCountX && i !== Math.floor(postCountX / 2)) {
          const midX = startX - paddockW + ((i + 0.5) / postCountX) * paddockW;
          for (const ry of [0.4, 0.85, 1.3]) {
            const rail = new THREE.Mesh(new THREE.BoxGeometry(paddockW / postCountX, 0.09, 0.05), fenceRailMat);
            rail.position.set(midX, ry, -d / 2 + paddockD);
            rail.castShadow = true;
            bGroup.add(rail);
          }
        }
      }

      // Wooden water trough inside the corral
      const trough = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.6, 0.8), fencePostMat);
      trough.position.set(startX - paddockW * 0.5, 0.3, -d / 2 + 3.0);
      trough.castShadow = true;
      bGroup.add(trough);

      // Water inside trough
      const water = new THREE.Mesh(
        new THREE.BoxGeometry(2.0, 0.1, 0.65),
        new THREE.MeshStandardMaterial({ color: 0x224455, roughness: 0.1, metalness: 0.8 })
      );
      water.position.set(startX - paddockW * 0.5, 0.52, -d / 2 + 3.0);
      bGroup.add(water);

    // --- STANDARD FRONTIER STORES (Store, Gunsmith, Doctor, Sheriff) ---
    } else {
      // 3. VERANDEN & DETAILS:
      // Gebäude mit Vordach (Saloon, Store, Sheriff) erhalten:
      // * Erhöhte Holz-Plattform als Eingangsstufe
      // * Zwei massive Holzpfosten, die das Vordach tragen
      // * Einen horizontalen Anbindebalken (Hitching Post) davor
      const porchDepth = 2.0;
      const porchFloorH = 0.22;
      const porchH = Math.min(h * 0.58, 3.2);

      // Erhöhte Holz-Plattform
      const porchFloorGeo = new THREE.BoxGeometry(w + 0.1, porchFloorH, porchDepth);
      const porchFloor = new THREE.Mesh(porchFloorGeo, floorMat);
      porchFloor.position.set(0, 0.2 + porchFloorH / 2, d / 2 + porchDepth / 2);
      porchFloor.receiveShadow = true;
      bGroup.add(porchFloor);

      // Eingangsstufe (Step connecting boardwalk/ground to porch)
      const stepGeo = new THREE.BoxGeometry(Math.min(w * 0.6, 2.4), porchFloorH * 0.5, 0.35);
      const entryStep = new THREE.Mesh(stepGeo, floorMat);
      entryStep.position.set(0, 0.2 + porchFloorH * 0.25, d / 2 + porchDepth + 0.17);
      entryStep.receiveShadow = true;
      bGroup.add(entryStep);

      // Zwei massive Holzpfosten [0.2, porchH, 0.2]
      const postGeo = new THREE.BoxGeometry(0.2, porchH, 0.2);
      const post1 = new THREE.Mesh(postGeo, trimMat);
      post1.position.set(-w / 2 + 0.35, 0.2 + porchH / 2, d / 2 + porchDepth - 0.12);
      post1.castShadow = true;
      bGroup.add(post1);

      const post2 = new THREE.Mesh(postGeo, trimMat);
      post2.position.set(w / 2 - 0.35, 0.2 + porchH / 2, d / 2 + porchDepth - 0.12);
      post2.castShadow = true;
      bGroup.add(post2);

      // Vordach mit gestufter Kante
      const porchRoofGeo = new THREE.BoxGeometry(w + 0.2, 0.08, porchDepth + 0.2);
      const porchRoofMat = roofMat.clone();
      roofMaterials.push(porchRoofMat);
      const porchRoof = new THREE.Mesh(porchRoofGeo, porchRoofMat);
      porchRoof.position.set(0, 0.2 + porchH, d / 2 + porchDepth / 2);
      porchRoof.rotation.x = -0.06;
      porchRoof.castShadow = true;
      bGroup.add(porchRoof);

      // Horizontaler Anbindebalken (Hitching Post) davor
      const hBarW = Math.min(w * 0.65, 3.0);
      const hGroup = new THREE.Group();
      const hPostGeo = new THREE.BoxGeometry(0.12, 1.0, 0.12);
      const hpL = new THREE.Mesh(hPostGeo, trimMat);
      hpL.position.set(-hBarW / 2 + 0.1, 0.5, 0);
      hpL.castShadow = true;
      hGroup.add(hpL);

      const hpR = new THREE.Mesh(hPostGeo, trimMat);
      hpR.position.set(hBarW / 2 - 0.1, 0.5, 0);
      hpR.castShadow = true;
      hGroup.add(hpR);

      const hBar = new THREE.Mesh(new THREE.BoxGeometry(hBarW, 0.1, 0.1), trimMat);
      hBar.position.set(0, 0.9, 0);
      hBar.castShadow = true;
      hGroup.add(hBar);

      hGroup.position.set(0, 0, d / 2 + porchDepth + 0.75);
      bGroup.add(hGroup);

      // Warm glowing windows on facade
      const glowTex = TextureGenerator.getWindowGlowTexture();
      const winMat = new THREE.MeshStandardMaterial({
        map: glowTex,
        roughness: 0.35,
        emissive: 0x5a3416,
        emissiveIntensity: 0.55
      });
      for (const wx of [-w / 2 + segW / 2, w / 2 - segW / 2]) {
        const winGlass = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.5, 0.05), winMat);
        winGlass.position.set(wx, 0.2 + 1.6, d / 2 + 0.01);
        bGroup.add(winGlass);

        const winFrame = new THREE.Mesh(new THREE.BoxGeometry(1.35, 1.65, 0.07), trimMat);
        winFrame.position.set(wx, 0.2 + 1.6, d / 2);
        bGroup.add(winFrame);
      }

      // Authentic 1899 Western Signboard above entrance
      let signTitle = '';
      let signSub = '';
      if (id === 'store') {
        signTitle = 'GENERAL STORE';
        signSub = 'VALENTINE PROVISIONS & DRY GOODS';
      } else if (id === 'gunsmith') {
        signTitle = 'VALENTINE GUNSMITH';
        signSub = 'WINCHESTER & COLT · AMMUNITION';
      } else if (id === 'doctor') {
        signTitle = 'DOCTOR & APOTHECARY';
        signSub = 'SURGERY & MEDICINE';
      } else if (id === 'sheriff') {
        signTitle = "SHERIFF'S OFFICE";
        signSub = 'COUNTY OF VALENTINE';
      } else if (id.startsWith('bldg_')) {
        const frontierNames = [
          { t: 'BOARDING HOUSE', s: 'ROOMS & MEALS' },
          { t: 'BLACKSMITH', s: 'FARRIER & FORGE' },
          { t: 'FEED & SEED', s: 'GRAIN & FLOUR' },
          { t: 'SADDLERY', s: 'HARNESS & BOOTS' }
        ];
        const idx = Math.abs(id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)) % frontierNames.length;
        signTitle = frontierNames[idx].t;
        signSub = frontierNames[idx].s;
      }

      if (signTitle) {
        const sTex = TextureGenerator.createSignboardTexture(signTitle, signSub, '#241a12', '#ebdcb9', true);
        const sW = Math.min(w * 0.72, 4.6);
        const sH = 0.95;
        const sMat = new THREE.MeshStandardMaterial({ map: sTex, roughness: 0.6 });
        const sMesh = new THREE.Mesh(new THREE.BoxGeometry(sW, sH, 0.08), sMat);
        sMesh.position.set(0, 0.2 + porchH + 0.52, d / 2 + porchDepth * 0.5 + 0.05);
        sMesh.castShadow = true;
        bGroup.add(sMesh);
      }
    }

    // 7. GIEBELDACH (Gable Roof: sichtbare Firstbalken, gestufte Dachkanten, Überhang <= 0.5 Einheiten)
    const ridgeH = (id === 'stable') ? Math.min(2.4, w * 0.28) : Math.min(1.8, w * 0.25);
    const overhangX = 0.5; // Strictly 0.5 (max 0.5 guard compliant)
    const overhangZ = 0.5; // Strictly 0.5 (max 0.5 guard compliant)

    const halfW = w / 2 + overhangX;
    const slopeLen = Math.hypot(halfW, ridgeH);
    const slopeAngle = Math.atan2(ridgeH, halfW);

    const slopeGeo = new THREE.BoxGeometry(slopeLen, 0.12, d + overhangZ * 2);
    const trimSlopeGeo = new THREE.BoxGeometry(slopeLen * 0.98, 0.06, d + overhangZ * 2 + 0.04);

    // Left slope & stepped edge
    const leftSlope = new THREE.Mesh(slopeGeo, roofMat);
    leftSlope.position.set(-halfW / 2, 0.2 + h + ridgeH / 2, 0);
    leftSlope.rotation.z = slopeAngle;
    leftSlope.castShadow = true;
    leftSlope.receiveShadow = true;
    bGroup.add(leftSlope);

    const leftTrim = new THREE.Mesh(trimSlopeGeo, roofMat);
    leftTrim.position.set(-halfW / 2, 0.2 + h + ridgeH / 2 + 0.05, 0);
    leftTrim.rotation.z = slopeAngle;
    leftTrim.castShadow = true;
    bGroup.add(leftTrim);

    // Right slope & stepped edge
    const rightSlope = new THREE.Mesh(slopeGeo, roofMat);
    rightSlope.position.set(halfW / 2, 0.2 + h + ridgeH / 2, 0);
    rightSlope.rotation.z = -slopeAngle;
    rightSlope.castShadow = true;
    rightSlope.receiveShadow = true;
    bGroup.add(rightSlope);

    const rightTrim = new THREE.Mesh(trimSlopeGeo, roofMat);
    rightTrim.position.set(halfW / 2, 0.2 + h + ridgeH / 2 + 0.05, 0);
    rightTrim.rotation.z = -slopeAngle;
    rightTrim.castShadow = true;
    bGroup.add(rightTrim);

    // Sichtbarer Firstbalken (Ridge Beam)
    const ridgeBeamGeo = new THREE.BoxGeometry(0.2, 0.2, d + overhangZ * 2 + 0.1);
    const ridgeBeam = new THREE.Mesh(ridgeBeamGeo, trimMat);
    ridgeBeam.position.set(0, 0.2 + h + ridgeH + 0.06, 0);
    ridgeBeam.castShadow = true;
    bGroup.add(ridgeBeam);

    // Triangular Gable Closures
    const gableShape = new THREE.Shape();
    gableShape.moveTo(-w / 2, 0);
    gableShape.lineTo(w / 2, 0);
    gableShape.lineTo(0, ridgeH);
    gableShape.closePath();

    const gableGeo = new THREE.ExtrudeGeometry(gableShape, { depth: wallThickness, bevelEnabled: false });
    gableGeo.center();

    const frontGable = new THREE.Mesh(gableGeo, wallMat);
    frontGable.position.set(0, 0.2 + h + ridgeH / 2, d / 2 - wallThickness / 2);
    frontGable.castShadow = true;
    bGroup.add(frontGable);

    const backGable = new THREE.Mesh(gableGeo, wallMat);
    backGable.position.set(0, 0.2 + h + ridgeH / 2, -d / 2 + wallThickness / 2);
    backGable.castShadow = true;
    bGroup.add(backGable);

    this.scene.add(bGroup);

    // 8. COLLIDERS (Solid walls and foundation, doorway left open)
    bGroup.updateMatrixWorld(true);
    this.obstacleBoxes.push(new THREE.Box3().setFromObject(backWall));
    this.obstacleBoxes.push(new THREE.Box3().setFromObject(leftWall));
    this.obstacleBoxes.push(new THREE.Box3().setFromObject(rightWall));
    this.obstacleBoxes.push(new THREE.Box3().setFromObject(frontLeft));
    this.obstacleBoxes.push(new THREE.Box3().setFromObject(frontRight));

    this.buildings.push({
      id,
      name,
      group: bGroup,
      posX,
      posZ,
      width: w,
      depth: d,
      height: h,
      roofMaterials,
      currentOpacity: 1.0
    });
  }

  /**
   * 5. FRIEDHOF (Cemetery on grassy hill near Church)
   * Alter, ungleichmäßiger Holzzaun, verwitterte Steingrabsteine und Holzkreuze.
   */
  private buildCemetery(): void {
    const cemGroup = new THREE.Group();
    cemGroup.name = 'ValentineCemetery';

    // Located adjacent to church on the northwestern hill
    const cx = 28.0;
    const cz = -10.0;
    const cy = this.getGroundHeight(cx, cz);
    cemGroup.position.set(cx, cy, cz);

    const fenceW = 11.0;
    const fenceD = 13.0;

    // 1. LEICHTER GRASHÜGEL (Gentle grassy hill mound supporting the cemetery)
    const hillGeo = new THREE.CylinderGeometry(fenceW * 0.62, fenceW * 0.72, 0.45, 16);
    const hillMat = new THREE.MeshStandardMaterial({
      color: 0x565c3b, // Arid prairie grass hill turf
      roughness: 0.95
    });
    const hillMesh = new THREE.Mesh(hillGeo, hillMat);
    hillMesh.position.set(0, 0.22, 0);
    hillMesh.receiveShadow = true;
    cemGroup.add(hillMesh);

    // 2. ZAUN-EINFASSUNG (Rustic crooked split-rail perimeter fence with gate)
    const rusticFenceMat = new THREE.MeshStandardMaterial({
      color: 0x483a2d,
      roughness: 0.95
    });

    // Posts with organic tilt and uneven settling
    const fencePosts = [
      [-fenceW / 2, -fenceD / 2], [0, -fenceD / 2], [fenceW / 2, -fenceD / 2],
      [-fenceW / 2, fenceD / 2], [0, fenceD / 2], [fenceW / 2, fenceD / 2],
      [-fenceW / 2, -fenceD / 6], [-fenceW / 2, fenceD / 6],
      [fenceW / 2, -fenceD / 6], [fenceW / 2, fenceD / 6]
    ];

    fencePosts.forEach(([px, pz], idx) => {
      const pMesh = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.35, 0.14), rusticFenceMat);
      pMesh.position.set(px, 0.68, pz);
      pMesh.rotation.z = Math.sin(idx * 1.7) * 0.08;
      pMesh.rotation.x = Math.cos(idx * 2.1) * 0.08;
      pMesh.castShadow = true;
      cemGroup.add(pMesh);
    });

    // North & South perimeter rails
    const fenceRails: THREE.Mesh[] = [];
    for (const pz of [-fenceD / 2, fenceD / 2]) {
      const r1 = new THREE.Mesh(new THREE.BoxGeometry(fenceW, 0.08, 0.06), rusticFenceMat);
      r1.position.set(0, 0.52, pz);
      const r2 = new THREE.Mesh(new THREE.BoxGeometry(fenceW, 0.08, 0.06), rusticFenceMat);
      r2.position.set(0, 0.98, pz);
      cemGroup.add(r1, r2);
      fenceRails.push(r1);
    }
    // East side rails
    const rEast1 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, fenceD), rusticFenceMat);
    rEast1.position.set(fenceW / 2, 0.52, 0);
    const rEast2 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, fenceD), rusticFenceMat);
    rEast2.position.set(fenceW / 2, 0.98, 0);
    cemGroup.add(rEast1, rEast2);
    fenceRails.push(rEast1);

    // West side rails (with entrance gate gap facing church)
    const halfSide = (fenceD - 2.4) / 2;
    for (const sz of [-fenceD / 2 + halfSide / 2, fenceD / 2 - halfSide / 2]) {
      const rW1 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, halfSide), rusticFenceMat);
      rW1.position.set(-fenceW / 2, 0.52, sz);
      const rW2 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, halfSide), rusticFenceMat);
      rW2.position.set(-fenceW / 2, 0.98, sz);
      cemGroup.add(rW1, rW2);
      fenceRails.push(rW1);
    }

    // Wooden gate leaf swung slightly open
    const gateLeaf = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.9, 1.8), rusticFenceMat);
    gateLeaf.position.set(-fenceW / 2 + 0.3, 0.65, 0.2);
    gateLeaf.rotation.y = 0.45; // Partially open gate
    cemGroup.add(gateLeaf);

    // 3. UNGLEICHMÄSSIGE GRABSTEINE (Irregular weathered headstones & rustic timber crosses)
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x76736e, roughness: 0.92 });
    const woodCrossMat = new THREE.MeshStandardMaterial({ color: 0x4d3b2b, roughness: 0.88 });

    const graveConfigs = [
      { x: -3.2, z: -3.8, type: 'stone', tiltZ: 0.12, tiltX: 0.05 },
      { x: -1.2, z: -3.6, type: 'cross', tiltZ: -0.09, tiltX: 0.08 },
      { x: 0.8, z: -3.9, type: 'stone_round', tiltZ: 0.05, tiltX: -0.06 },
      { x: 2.8, z: -3.7, type: 'stone', tiltZ: -0.14, tiltX: 0.04 },
      { x: -3.0, z: -0.6, type: 'stone_round', tiltZ: -0.08, tiltX: 0.10 },
      { x: -1.0, z: -0.8, type: 'cross', tiltZ: 0.11, tiltX: -0.04 },
      { x: 1.1, z: -0.5, type: 'stone', tiltZ: 0.06, tiltX: 0.07 },
      { x: 3.1, z: -0.7, type: 'cross', tiltZ: -0.10, tiltX: -0.08 },
      { x: -2.9, z: 2.6, type: 'stone_round', tiltZ: 0.07, tiltX: 0.06 },
      { x: -0.9, z: 2.8, type: 'stone', tiltZ: -0.05, tiltX: 0.11 },
      { x: 1.0, z: 2.5, type: 'cross', tiltZ: 0.13, tiltX: -0.05 },
      { x: 3.0, z: 2.7, type: 'stone_round', tiltZ: -0.09, tiltX: 0.04 }
    ];

    graveConfigs.forEach((cfg) => {
      const g = new THREE.Group();
      g.position.set(cfg.x, 0.22, cfg.z);

      // Grassy earthen burial mound
      const moundMat = new THREE.MeshStandardMaterial({ color: 0x483d2e, roughness: 0.95 });
      const mound = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.10, 1.7), moundMat);
      mound.position.set(0, 0.05, 0.45);
      g.add(mound);

      if (cfg.type === 'cross') {
        const cPost = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.15, 0.08), woodCrossMat);
        cPost.position.set(0, 0.58, -0.3);
        cPost.castShadow = true;
        const cArm = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.08, 0.08), woodCrossMat);
        cArm.position.set(0, 0.88, -0.3);
        cArm.castShadow = true;
        g.add(cPost, cArm);
      } else if (cfg.type === 'stone_round') {
        const slab = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.75, 0.14), stoneMat);
        slab.position.set(0, 0.375, -0.3);
        slab.castShadow = true;
        const arch = new THREE.Mesh(
          new THREE.CylinderGeometry(0.275, 0.275, 0.14, 16, 1, false, 0, Math.PI),
          stoneMat
        );
        arch.position.set(0, 0.75, -0.3);
        arch.rotation.z = Math.PI / 2;
        arch.castShadow = true;
        g.add(slab, arch);
      } else {
        const slab = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.85, 0.14), stoneMat);
        slab.position.set(0, 0.425, -0.3);
        slab.castShadow = true;
        g.add(slab);
      }

      g.rotation.z = cfg.tiltZ;
      g.rotation.x = cfg.tiltX;
      cemGroup.add(g);
    });

    this.scene.add(cemGroup);

    // Register cemetery perimeter fences into obstacle boxes
    cemGroup.updateMatrixWorld(true);
    for (const rail of fenceRails) {
      this.obstacleBoxes.push(new THREE.Box3().setFromObject(rail));
    }
  }

  /**
   * 6. UMGEBUNGSDETAILS & PROPS:
   * - Anbindebalken (Hitching Posts) vor Saloon und Store mit Tether Rings & Seilen
   * - Holzfässer mit schwarzen Eisenreifen vor Saloon und Store
   * - Telegrafenmasten, Kistenstapel und Pferdetränken
   */
  private buildEnvironmentProps(): void {
    const propsGroup = new THREE.Group();
    propsGroup.name = 'ValentineEnvironmentProps';

    const woodDark = new THREE.MeshStandardMaterial({ color: 0x4a3726, roughness: 0.82 });
    const crateMat = new THREE.MeshStandardMaterial({ color: 0x826442, roughness: 0.75 });
    const ironMat = new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.85, roughness: 0.3 });
    const barrelWoodMat = new THREE.MeshStandardMaterial({ color: 0x5c442e, roughness: 0.78 });

    // Helper to create high-detail wooden barrel with black iron hoops
    const createBandedBarrel = (): THREE.Group => {
      const bGroup = new THREE.Group();
      const barrelBody = new THREE.Mesh(
        new THREE.CylinderGeometry(0.38, 0.34, 0.9, 14),
        barrelWoodMat
      );
      barrelBody.position.set(0, 0.45, 0);
      barrelBody.castShadow = true;
      bGroup.add(barrelBody);

      // Iron hoops (top, upper middle, lower middle, bottom)
      for (const hy of [0.15, 0.35, 0.55, 0.75]) {
        const r = hy === 0.15 || hy === 0.75 ? 0.35 : 0.39;
        const hoop = new THREE.Mesh(new THREE.TorusGeometry(r, 0.015, 6, 16), ironMat);
        hoop.position.set(0, hy, 0);
        hoop.rotation.x = Math.PI / 2;
        bGroup.add(hoop);
      }
      return bGroup;
    };

    // a) ANBINDEBALKEN (Hitching Posts vor Saloon und Store)
    const hitchingLocations = [
      { x: 34.2, z: -13.6 }, // Saloon West
      { x: 37.2, z: -13.6 }, // Saloon East
      { x: 40.8, z: -13.6 }, // General Store West
      { x: 43.6, z: -13.6 }, // General Store East
      { x: 41.5, z: -9.5 }   // Sheriff's Office
    ];

    for (const loc of hitchingLocations) {
      const hGroup = new THREE.Group();
      const hy = this.getGroundHeight(loc.x, loc.z);
      hGroup.position.set(loc.x, hy, loc.z);

      const railLen = 2.4;
      const hPost1 = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.0, 0.12), woodDark);
      hPost1.position.set(-railLen / 2 + 0.1, 0.5, 0);
      hPost1.castShadow = true;
      hGroup.add(hPost1);

      const hPost2 = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.0, 0.12), woodDark);
      hPost2.position.set(railLen / 2 - 0.1, 0.5, 0);
      hPost2.castShadow = true;
      hGroup.add(hPost2);

      const crossBar = new THREE.Mesh(new THREE.BoxGeometry(railLen, 0.1, 0.1), woodDark);
      crossBar.position.set(0, 0.9, 0);
      crossBar.castShadow = true;
      hGroup.add(crossBar);

      // Forged Iron Tether Rings (Anbinderinge)
      const ringGeo = new THREE.TorusGeometry(0.06, 0.015, 8, 12);
      const ring1 = new THREE.Mesh(ringGeo, ironMat);
      ring1.position.set(-0.5, 0.9, 0.06);
      const ring2 = new THREE.Mesh(ringGeo, ironMat);
      ring2.position.set(0.5, 0.9, 0.06);
      hGroup.add(ring1, ring2);

      // Hanging hitch ropes
      const ropeMat = new THREE.MeshStandardMaterial({ color: 0x8a7252, roughness: 0.9 });
      for (const rx of [-0.5, 0.5]) {
        const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.45, 6), ropeMat);
        rope.position.set(rx, 0.65, 0.08);
        hGroup.add(rope);
      }

      propsGroup.add(hGroup);
    }

    // b) FÄSSER (Holzfässer vor Saloon und Store)
    const barrelLocations = [
      // Vor Smithfield's Saloon (Whiskey Barrels)
      { x: 33.2, z: -14.6 },
      { x: 33.8, z: -14.8 },
      { x: 38.6, z: -14.6 },
      // Vor Valentine General Store (Pickle & Merchandise Barrels)
      { x: 42.6, z: -14.6 },
      { x: 43.3, z: -14.7 },
      { x: 44.0, z: -14.5 },
      // Station Platform
      { x: 91.0, z: 47.5 },
      { x: 91.7, z: 47.9 },
      // Livery Stable
      { x: 33.2, z: -4.5 }
    ];

    for (const bLoc of barrelLocations) {
      const by = this.getGroundHeight(bLoc.x, bLoc.z);
      const barrel = createBandedBarrel();
      barrel.position.set(bLoc.x, by, bLoc.z);
      propsGroup.add(barrel);
    }

    // c) Crate Stacks outside General Store and Station
    const crateGeo = new THREE.BoxGeometry(0.7, 0.7, 0.7);
    const cratePositions = [
      { x: 44.8, z: -14.6, yOffset: 0 },
      { x: 45.5, z: -14.6, yOffset: 0 },
      { x: 45.1, z: -14.6, yOffset: 0.7 }, // Stacked
      { x: 90.5, z: 50.0, yOffset: 0.75 }, // On station platform
      { x: 91.2, z: 50.0, yOffset: 0.75 }
    ];

    for (const cp of cratePositions) {
      const cy = this.getGroundHeight(cp.x, cp.z);
      const crate = new THREE.Mesh(crateGeo, crateMat);
      crate.position.set(cp.x, cy + cp.yOffset + 0.35, cp.z);
      crate.castShadow = true;
      propsGroup.add(crate);
    }

    // d) Telegrafenmasten (Telegraph Poles) along Main Street and Railroad
    const poleLocations = [
      { x: 30.5, z: -9.5 },
      { x: 42.0, z: -10.0 },
      { x: 54.0, z: -10.5 },
      { x: 65.0, z: -8.0 },
      { x: 74.0, z: 12.0 },
      { x: 80.0, z: 26.0 },
      { x: 89.0, z: 41.0 },
      { x: 99.0, z: 56.0 }
    ];

    const poleGeo = new THREE.CylinderGeometry(0.12, 0.16, 7.5, 8);
    const crossarmGeo = new THREE.BoxGeometry(1.6, 0.12, 0.12);
    const insulatorGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.12, 6);
    const ceramicMat = new THREE.MeshStandardMaterial({ color: 0x228877, roughness: 0.2, metalness: 0.1 });

    for (const pl of poleLocations) {
      const py = this.getGroundHeight(pl.x, pl.z);
      const pole = new THREE.Mesh(poleGeo, woodDark);
      pole.position.set(pl.x, py + 3.75, pl.z);
      pole.castShadow = true;
      propsGroup.add(pole);

      const crossarm = new THREE.Mesh(crossarmGeo, woodDark);
      crossarm.position.set(pl.x, py + 7.0, pl.z);
      propsGroup.add(crossarm);

      // Ceramic insulators
      for (const ix of [-0.6, -0.2, 0.2, 0.6]) {
        const ins = new THREE.Mesh(insulatorGeo, ceramicMat);
        ins.position.set(pl.x + ix, py + 7.12, pl.z);
        propsGroup.add(ins);
      }
    }

    // e) Telegrafendrähte (Sagging Catenary Wires connecting the poles)
    const wireMat = new THREE.LineBasicMaterial({ color: 0x181512, linewidth: 1.2 });
    for (let i = 0; i < poleLocations.length - 1; i++) {
      const p1 = poleLocations[i];
      const p2 = poleLocations[i + 1];
      const py1 = this.getGroundHeight(p1.x, p1.z);
      const py2 = this.getGroundHeight(p2.x, p2.z);
      const midX = (p1.x + p2.x) / 2;
      const midZ = (p1.z + p2.z) / 2;
      const midY = (py1 + py2) / 2 + 7.12 - 0.45; // 0.45m catenary sag

      for (const ix of [-0.6, -0.2, 0.2, 0.6]) {
        const curve = new THREE.CatmullRomCurve3([
          new THREE.Vector3(p1.x + ix, py1 + 7.12, p1.z),
          new THREE.Vector3(midX + ix, midY, midZ),
          new THREE.Vector3(p2.x + ix, py2 + 7.12, p2.z)
        ]);
        const wirePoints = curve.getPoints(16);
        const wireGeo = new THREE.BufferGeometry().setFromPoints(wirePoints);
        const wire = new THREE.Line(wireGeo, wireMat);
        propsGroup.add(wire);
      }
    }

    // f) Instanziierte Grasbüschel (THREE.InstancedMesh) entlang der Straßenränder
    const grassBladeCount = 550;
    const bladeGeo = new THREE.BufferGeometry();
    const bladeVerts = new Float32Array([
      -0.35, 0.0, 0.0,   0.35, 0.0, 0.0,   0.28, 0.55, 0.0,
      -0.35, 0.0, 0.0,   0.28, 0.55, 0.0, -0.28, 0.55, 0.0,
      -0.18, 0.0, -0.30, 0.18, 0.0,  0.30, 0.14, 0.55, 0.24,
      -0.18, 0.0, -0.30, 0.14, 0.55, 0.24, -0.14, 0.55, -0.24,
      -0.18, 0.0,  0.30, 0.18, 0.0, -0.30, 0.14, 0.55, -0.24,
      -0.18, 0.0,  0.30, 0.14, 0.55, -0.24, -0.14, 0.55,  0.24
    ]);
    bladeGeo.setAttribute('position', new THREE.BufferAttribute(bladeVerts, 3));
    bladeGeo.computeVertexNormals();

    const grassMat = new THREE.MeshStandardMaterial({
      color: 0x8a7f4e,
      roughness: 0.95,
      metalness: 0.0,
      side: THREE.DoubleSide
    });

    const grassInstanced = new THREE.InstancedMesh(bladeGeo, grassMat, grassBladeCount);
    grassInstanced.castShadow = false;
    grassInstanced.receiveShadow = true;

    const dummy = new THREE.Object3D();
    let grassIdx = 0;

    const roadSpline = valentineData.roadSpline as [number, number][];
    for (let i = 0; i < roadSpline.length - 1 && grassIdx < grassBladeCount; i++) {
      const p1 = roadSpline[i];
      const p2 = roadSpline[i + 1];
      const countPerSeg = 35;
      for (let s = 0; s < countPerSeg && grassIdx < grassBladeCount; s++) {
        const t = s / countPerSeg;
        const rx = p1[0] + (p2[0] - p1[0]) * t;
        const rz = p1[1] + (p2[1] - p1[1]) * t;
        const side = (s % 2 === 0 ? 1 : -1);
        const offsetDist = 4.2 + (s % 5) * 0.9;
        const gx = rx + side * offsetDist;
        const gz = rz + (Math.sin(s * 7) * 1.5);
        const gy = this.getGroundHeight(gx, gz);

        dummy.position.set(gx, gy, gz);
        dummy.scale.set(0.7 + (s % 4) * 0.2, 0.7 + (s % 3) * 0.3, 0.7 + (s % 4) * 0.2);
        dummy.rotation.y = (s * 1.7) % (Math.PI * 2);
        dummy.updateMatrix();
        grassInstanced.setMatrixAt(grassIdx++, dummy.matrix);
      }
    }
    while (grassIdx < grassBladeCount) {
      const gx = 5.0 + (grassIdx % 15) * 3.5;
      const gz = 35.0 + (grassIdx % 10) * 3.0;
      const gy = this.getGroundHeight(gx, gz);
      dummy.position.set(gx, gy, gz);
      dummy.scale.set(0.8, 0.8, 0.8);
      dummy.rotation.y = grassIdx * 0.5;
      dummy.updateMatrix();
      grassInstanced.setMatrixAt(grassIdx++, dummy.matrix);
    }
    grassInstanced.instanceMatrix.needsUpdate = true;
    propsGroup.add(grassInstanced);

    // g) Instanziierte Kiesel & Steine (THREE.InstancedMesh)
    const stoneCount = 180;
    const stoneGeo = new THREE.DodecahedronGeometry(0.18, 0);
    const stoneMat = new THREE.MeshStandardMaterial({
      color: 0x6e6559,
      roughness: 0.92,
      metalness: 0.04
    });
    const stoneInstanced = new THREE.InstancedMesh(stoneGeo, stoneMat, stoneCount);
    stoneInstanced.castShadow = true;
    stoneInstanced.receiveShadow = true;

    for (let i = 0; i < stoneCount; i++) {
      const seg = roadSpline[i % (roadSpline.length - 1)];
      const side = (i % 2 === 0 ? 1 : -1);
      const sx = seg[0] + side * (3.8 + (i % 4) * 0.8);
      const sz = seg[1] + (Math.cos(i * 3.1) * 2.0);
      const sy = this.getGroundHeight(sx, sz) + 0.08;

      dummy.position.set(sx, sy, sz);
      dummy.scale.set(0.6 + (i % 5) * 0.25, 0.4 + (i % 3) * 0.2, 0.6 + (i % 4) * 0.25);
      dummy.rotation.set((i * 0.3) % Math.PI, (i * 0.7) % Math.PI, 0);
      dummy.updateMatrix();
      stoneInstanced.setMatrixAt(i, dummy.matrix);
    }
    stoneInstanced.instanceMatrix.needsUpdate = true;
    propsGroup.add(stoneInstanced);

    // h) Hölzerne Wagenräder angelehnt an Wände & Zäune
    const wheelLocations = [
      { x: 32.8, z: -14.2, rotY: 0.2, rotZ: 0.15 },
      { x: 41.5, z: -14.2, rotY: -0.15, rotZ: 0.12 },
      { x: 67.2, z: -7.5, rotY: 0.4, rotZ: 0.14 },
      { x: 19.5, z: -9.8, rotY: 1.5, rotZ: 0.15 }
    ];
    const wheelRimGeo = new THREE.TorusGeometry(0.65, 0.04, 8, 24);
    const wheelHubGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.18, 12);
    const spokeGeo = new THREE.CylinderGeometry(0.02, 0.02, 1.25, 6);
    const wheelWoodMat = WoodMaterials.getWeatheredGreyMaterial(1, 1);

    for (const wLoc of wheelLocations) {
      const wy = this.getGroundHeight(wLoc.x, wLoc.z);
      const wheelGroup = new THREE.Group();
      wheelGroup.position.set(wLoc.x, wy + 0.65, wLoc.z);
      wheelGroup.rotation.y = wLoc.rotY;
      wheelGroup.rotation.z = wLoc.rotZ;

      const rim = new THREE.Mesh(wheelRimGeo, wheelWoodMat);
      rim.castShadow = true;
      wheelGroup.add(rim);

      const hub = new THREE.Mesh(wheelHubGeo, ironMat);
      hub.rotation.x = Math.PI / 2;
      hub.castShadow = true;
      wheelGroup.add(hub);

      for (let s = 0; s < 8; s++) {
        const spoke = new THREE.Mesh(spokeGeo, wheelWoodMat);
        spoke.rotation.z = (s / 8) * Math.PI;
        spoke.castShadow = true;
        wheelGroup.add(spoke);
      }
      propsGroup.add(wheelGroup);
    }

    this.scene.add(propsGroup);
  }

  /**
   * 7. LIVESTOCK, ANIMAL PENS & PADDOCK ZONE (SÜDWESTEN):
   * - Zwei große eingezäunte Tiergatter (14x10m) mit rustikalen Holzzäunen (Pfosten + 3 Querbalken)
   * - Innenfläche: modriger Schlamm mit Futter- und Wassertrögen (Troughs)
   * - Pferdekoppeln / Unterstände: offene Holzunterstände (nur Pfosten + Pultdach, keine Wände)
   * - Hühnerbereich: kleines Gatter mit einfacher Holzkiste/Stall und Rampe
   * - Davor: freie, begrünte Fläche / Grasland statt nacktem Schlamm
   */
  private buildLivestockAndPensZone(): void {
    const pensGroup = new THREE.Group();
    pensGroup.name = 'ValentineLivestockZone';

    const woodFenceMat = new THREE.MeshStandardMaterial({ color: 0x4a3726, roughness: 0.85 });
    const woodFenceRailMat = new THREE.MeshStandardMaterial({ color: 0x5a4430, roughness: 0.82 });
    const troughWoodMat = new THREE.MeshStandardMaterial({ color: 0x3d2d1e, roughness: 0.88 });
    const hayMat = new THREE.MeshStandardMaterial({ color: 0xb5994e, roughness: 0.92 });
    const waterMat = new THREE.MeshStandardMaterial({ color: 0x3d5c52, roughness: 0.15, metalness: 0.1 });
    const mudMat = new THREE.MeshStandardMaterial({
      color: 0x38281a,
      roughness: 0.96,
      normalMap: TextureGenerator.getMuddyStreetTextures().normal
    });
    const grassPrairieMat = new THREE.MeshStandardMaterial({
      color: 0x5e6d3e,
      roughness: 0.88,
      map: TextureGenerator.getGroundTextures().diffuse
    });
    const coopWoodMat = new THREE.MeshStandardMaterial({ color: 0x6e5539, roughness: 0.85 });
    const coopRoofMat = new THREE.MeshStandardMaterial({ color: 0x382d22, roughness: 0.75 });

    // 1. BEGRÜNTE VORFLÄCHE / GRASLAND (Z ≈ 6..25, X ≈ 8..48)
    const pastureGeo = new THREE.PlaneGeometry(42.0, 20.0, 24, 16);
    pastureGeo.rotateX(-Math.PI / 2);
    const pPos = pastureGeo.attributes.position;
    for (let i = 0; i < pPos.count; i++) {
      const px = pPos.getX(i) + 28.0;
      const pz = pPos.getZ(i) + 15.0;
      pPos.setY(i, this.getGroundHeight(px, pz) + 0.02);
    }
    pastureGeo.computeVertexNormals();

    const pastureMesh = new THREE.Mesh(pastureGeo, grassPrairieMat);
    pastureMesh.position.set(28.0, 0, 15.0);
    pastureMesh.castShadow = false;
    pastureMesh.receiveShadow = true;
    pensGroup.add(pastureMesh);

    // Helper for building heavy timber ranch fence sides with 3 rails and posts
    const createFenceSection = (
      x1: number, z1: number,
      x2: number, z2: number,
      hasGate: boolean = false,
      gateGapStart: number = 0.35,
      gateGapEnd: number = 0.65
    ) => {
      const dx = x2 - x1;
      const dz = z2 - z1;
      const len = Math.hypot(dx, dz);
      const angle = Math.atan2(dx, dz);
      const postSpacing = 2.2;
      const numPosts = Math.max(2, Math.round(len / postSpacing));

      // Posts
      for (let i = 0; i <= numPosts; i++) {
        const t = i / numPosts;
        if (hasGate && t > gateGapStart && t < gateGapEnd) continue;

        const px = x1 + dx * t;
        const pz = z1 + dz * t;
        const py = this.getGroundHeight(px, pz);

        const postMesh = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.45, 0.18), woodFenceMat);
        postMesh.position.set(px, py + 0.72, pz);
        postMesh.castShadow = true;
        pensGroup.add(postMesh);
      }

      // Rails
      const railHeights = [0.35, 0.75, 1.15];
      if (!hasGate) {
        const midX = (x1 + x2) / 2;
        const midZ = (z1 + z2) / 2;
        const midY = this.getGroundHeight(midX, midZ);
        for (const ry of railHeights) {
          const rail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, len), woodFenceRailMat);
          rail.position.set(midX, midY + ry, midZ);
          rail.rotation.y = angle;
          rail.castShadow = true;
          pensGroup.add(rail);
        }
        // Register solid fence collider
        const colBox = new THREE.Box3().setFromCenterAndSize(
          new THREE.Vector3(midX, midY + 0.7, midZ),
          new THREE.Vector3(
            Math.max(0.3, Math.abs(dx)),
            1.4,
            Math.max(0.3, Math.abs(dz))
          )
        );
        this.obstacleBoxes.push(colBox);
      } else {
        // Split in two segments around the gate
        const segments = [
          { s1: 0, s2: gateGapStart },
          { s1: gateGapEnd, s2: 1.0 }
        ];
        for (const seg of segments) {
          const sx1 = x1 + dx * seg.s1;
          const sz1 = z1 + dz * seg.s1;
          const sx2 = x1 + dx * seg.s2;
          const sz2 = z1 + dz * seg.s2;
          const segLen = Math.hypot(sx2 - sx1, sz2 - sz1);
          const smidX = (sx1 + sx2) / 2;
          const smidZ = (sz1 + sz2) / 2;
          const smidY = this.getGroundHeight(smidX, smidZ);

          for (const ry of railHeights) {
            const rail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, segLen), woodFenceRailMat);
            rail.position.set(smidX, smidY + ry, smidZ);
            rail.rotation.y = angle;
            rail.castShadow = true;
            pensGroup.add(rail);
          }
          const colBox = new THREE.Box3().setFromCenterAndSize(
            new THREE.Vector3(smidX, smidY + 0.7, smidZ),
            new THREE.Vector3(
              Math.max(0.3, Math.abs(sx2 - sx1)),
              1.4,
              Math.max(0.3, Math.abs(sz2 - sz1))
            )
          );
          this.obstacleBoxes.push(colBox);
        }
      }
    };

    // Helper for building a heavy wooden livestock trough
    const createTrough = (x: number, z: number, rotY: number, hasHay: boolean) => {
      const ty = this.getGroundHeight(x, z);
      const tGroup = new THREE.Group();
      tGroup.position.set(x, ty + 0.22, z);
      tGroup.rotation.y = rotY;

      // Wooden body
      const body = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.44, 0.65), troughWoodMat);
      body.castShadow = true;
      tGroup.add(body);

      // Contents (hay or water)
      if (hasHay) {
        const hay = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.12, 0.5), hayMat);
        hay.position.y = 0.16;
        tGroup.add(hay);
      } else {
        const water = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.08, 0.5), waterMat);
        water.position.y = 0.14;
        tGroup.add(water);
      }
      pensGroup.add(tGroup);
    };

    // 2. GROSSE TIERGATTER & PFERCHE (Einfahrts-Landmarken links an der Straße)
    const penConfigs = [
      { name: 'CattlePenWest', cx: 23.0, cz: 33.0, w: 14.0, d: 10.0 },
      { name: 'SheepPenEast', cx: 39.0, cz: 33.0, w: 14.0, d: 10.0 },
      { name: 'RoadsideEntrancePen', cx: 56.0, cz: 22.0, w: 12.0, d: 11.0 }
    ];

    for (const pen of penConfigs) {
      const halfW = pen.w / 2;
      const halfD = pen.d / 2;
      const x1 = pen.cx - halfW;
      const x2 = pen.cx + halfW;
      const z1 = pen.cz - halfD; // North
      const z2 = pen.cz + halfD; // South

      // Mucky Churned Mud Interior
      const mGeo = new THREE.PlaneGeometry(pen.w - 0.2, pen.d - 0.2, 12, 10);
      mGeo.rotateX(-Math.PI / 2);
      const mPos = mGeo.attributes.position;
      for (let i = 0; i < mPos.count; i++) {
        const mx = mPos.getX(i) + pen.cx;
        const mz = mPos.getZ(i) + pen.cz;
        mPos.setY(i, this.getGroundHeight(mx, mz) + 0.03);
      }
      mGeo.computeVertexNormals();

      const mudMesh = new THREE.Mesh(mGeo, mudMat);
      mudMesh.position.set(pen.cx, 0, pen.cz);
      mudMesh.castShadow = false;
      mudMesh.receiveShadow = true;
      pensGroup.add(mudMesh);

      // 4 Fence boundaries:
      // North fence (with open gate at center)
      createFenceSection(x1, z1, x2, z1, true, 0.38, 0.62);
      // South fence
      createFenceSection(x1, z2, x2, z2, false);
      // West fence
      createFenceSection(x1, z1, x1, z2, false);
      // East fence
      createFenceSection(x2, z1, x2, z2, false);

      // Add 2 feeding & water troughs per pen
      createTrough(pen.cx - 3.2, pen.cz - 2.2, 0.15, true);
      createTrough(pen.cx + 3.2, pen.cz + 2.2, -0.1, false);
    }

    // 3. PFERDEKOPPELN / OFFENE HOLZUNTERSTÄNDE (Lean-To Shelters: nur Pfosten + Pultdach, keine Wände)
    const shelterConfigs = [
      { cx: 23.0, cz: 20.0, w: 9.5, d: 4.8 },
      { cx: 39.0, cz: 20.0, w: 9.5, d: 4.8 }
    ];

    for (const sh of shelterConfigs) {
      const sy = this.getGroundHeight(sh.cx, sh.cz);
      const sGroup = new THREE.Group();
      sGroup.position.set(sh.cx, sy, sh.cz);

      const frontH = 3.2;
      const backH = 2.4;
      const halfW = sh.w / 2;
      const halfD = sh.d / 2;

      // 6 Timber Posts [0.2, H, 0.2]
      const postLocations = [
        { x: -halfW + 0.3, z: halfD - 0.2, h: frontH },
        { x: 0, z: halfD - 0.2, h: frontH },
        { x: halfW - 0.3, z: halfD - 0.2, h: frontH },
        { x: -halfW + 0.3, z: -halfD + 0.2, h: backH },
        { x: 0, z: -halfD + 0.2, h: backH },
        { x: halfW - 0.3, z: -halfD + 0.2, h: backH }
      ];

      for (const pl of postLocations) {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.2, pl.h, 0.2), woodFenceMat);
        post.position.set(pl.x, pl.h / 2, pl.z);
        post.castShadow = true;
        sGroup.add(post);
      }

      // Horizontal Beams connecting the posts
      const fBeam = new THREE.Mesh(new THREE.BoxGeometry(sh.w, 0.15, 0.15), woodFenceMat);
      fBeam.position.set(0, frontH - 0.08, halfD - 0.2);
      sGroup.add(fBeam);

      const bBeam = new THREE.Mesh(new THREE.BoxGeometry(sh.w, 0.15, 0.15), woodFenceMat);
      bBeam.position.set(0, backH - 0.08, -halfD + 0.2);
      sGroup.add(bBeam);

      // Pultdach (Monopitch sloped roof - overhang <= 0.4m, max 0.5 guard compliant)
      const roofLen = Math.hypot(sh.d, frontH - backH);
      const roofAngle = Math.atan2(frontH - backH, sh.d);
      const shRoofMat = new THREE.MeshStandardMaterial({
        color: 0x3b2a1c,
        roughness: 0.85,
        transparent: true,
        opacity: 1.0
      });

      const roofMesh = new THREE.Mesh(
        new THREE.BoxGeometry(sh.w + 0.4, 0.08, roofLen + 0.4),
        shRoofMat
      );
      roofMesh.position.set(0, (frontH + backH) / 2 + 0.06, 0);
      roofMesh.rotation.x = roofAngle;
      roofMesh.castShadow = true;
      sGroup.add(roofMesh);

      // Hay bales inside shelter
      for (const bx of [-2.5, 0, 2.5]) {
        const bale = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.6, 0.7), hayMat);
        bale.position.set(bx, 0.3, -halfD + 1.1);
        bale.castShadow = true;
        sGroup.add(bale);
      }

      pensGroup.add(sGroup);

      // Register building for ThreeJS Guard roof occlusion transparency
      this.buildings.push({
        id: `shelter_${sh.cx}`,
        name: `Livestock Shelter ${sh.cx}`,
        group: sGroup,
        posX: sh.cx,
        posZ: sh.cz,
        width: sh.w,
        depth: sh.d,
        height: frontH,
        roofMaterials: [shRoofMat],
        currentOpacity: 1.0
      });
    }

    // 4. HÜHNERBEREICH (Kleines Gatter mit einfacher Holzkiste/Stall)
    const coopX = 9.0;
    const coopZ = 26.0;
    const coopY = this.getGroundHeight(coopX, coopZ);
    const coopGroup = new THREE.Group();
    coopGroup.position.set(coopX, coopY, coopZ);

    // Kleines Gatter (5.5m x 4.2m)
    createFenceSection(coopX - 2.6, coopZ - 2.0, coopX + 2.6, coopZ - 2.0, false);
    createFenceSection(coopX - 2.6, coopZ + 2.0, coopX + 2.6, coopZ + 2.0, true, 0.4, 0.6);
    createFenceSection(coopX - 2.6, coopZ - 2.0, coopX - 2.6, coopZ + 2.0, false);
    createFenceSection(coopX + 2.6, coopZ - 2.0, coopX + 2.6, coopZ + 2.0, false);

    // Holzkiste / Hühnerstall auf 4 kleinen Pflöcken
    const cStallW = 2.0;
    const cStallH = 1.4;
    const cStallD = 1.6;
    const stiltH = 0.35;

    for (const sx of [-cStallW / 2 + 0.15, cStallW / 2 - 0.15]) {
      for (const sz of [-cStallD / 2 + 0.15, cStallD / 2 - 0.15]) {
        const stilt = new THREE.Mesh(new THREE.BoxGeometry(0.12, stiltH, 0.12), woodFenceMat);
        stilt.position.set(sx - 0.6, stiltH / 2, sz);
        coopGroup.add(stilt);
      }
    }

    // Stall-Box
    const coopBox = new THREE.Mesh(new THREE.BoxGeometry(cStallW, cStallH, cStallD), coopWoodMat);
    coopBox.position.set(-0.6, stiltH + cStallH / 2, 0);
    coopBox.castShadow = true;
    coopGroup.add(coopBox);

    // Geneigtes Pultdach
    const coopRoof = new THREE.Mesh(new THREE.BoxGeometry(cStallW + 0.2, 0.06, cStallD + 0.25), coopRoofMat);
    coopRoof.position.set(-0.6, stiltH + cStallH + 0.08, 0);
    coopRoof.rotation.x = 0.15;
    coopRoof.castShadow = true;
    coopGroup.add(coopRoof);

    // Hühnerschlupfloch & schräge Holzrampe
    const rampMesh = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.04, 0.9), woodFenceMat);
    rampMesh.position.set(-0.6, stiltH * 0.5, cStallD / 2 + 0.35);
    rampMesh.rotation.x = 0.45;
    coopGroup.add(rampMesh);

    // Nistkästen an der Außenseite
    const nestBox = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.6, 1.2), coopWoodMat);
    nestBox.position.set(-0.6 - cStallW / 2 - 0.18, stiltH + 0.4, 0);
    nestBox.castShadow = true;
    coopGroup.add(nestBox);

    pensGroup.add(coopGroup);

    this.scene.add(pensGroup);
  }

  /**
   * ThreeJS Guard: Smooth translucent fading when player is inside building or occluded by roof/porch.
   */
  public update(playerPos: THREE.Vector3): void {
    for (const b of this.buildings) {
      const inX = Math.abs(playerPos.x - b.posX) < b.width / 2 + 1.2;
      const inZ = Math.abs(playerPos.z - b.posZ) < b.depth / 2 + 0.8;
      const targetOpacity = inX && inZ ? 0.15 : 1.0;

      b.currentOpacity += (targetOpacity - b.currentOpacity) * 0.15;

      for (const mat of b.roofMaterials) {
        mat.transparent = b.currentOpacity < 0.98;
        mat.opacity = b.currentOpacity;
        mat.depthWrite = b.currentOpacity > 0.5;
      }
    }
  }
}
