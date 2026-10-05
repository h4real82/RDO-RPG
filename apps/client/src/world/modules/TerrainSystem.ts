import * as THREE from 'three';
import valentineData from '../data/valentineLayout.json';
import { TextureGenerator } from '../TextureGenerator';

export interface ValentineLayoutData {
  roadSpline: number[][];
  railroadSpline?: number[][];
  buildings: {
    id: string;
    name: string;
    pos: number[];
    size: number[];
    rotY: number;
  }[];
}

export class TerrainSystem {
  private scene: THREE.Scene;
  public groundMesh!: THREE.Mesh;
  private mudStreetMat!: THREE.MeshStandardMaterial;
  private boardwalkMat!: THREE.MeshStandardMaterial;
  private grassMat!: THREE.MeshStandardMaterial;
  public roadMeshes: THREE.Mesh[] = [];

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.initMaterials();
  }

  private initMaterials() {
    const mudTex = TextureGenerator.getMuddyStreetTextures();
    this.mudStreetMat = new THREE.MeshStandardMaterial({
      map: mudTex.diffuse,
      normalMap: mudTex.normal,
      roughnessMap: mudTex.roughness,
      color: 0x332215, // Dark frontier mud with visible churned wagon ruts
      roughness: 0.88, // Dark rough mud
      metalness: 0.08, // Wet specular sheen in deep ruts
      polygonOffset: true,
      polygonOffsetFactor: -1, // Ensure road renders above ground without z-fighting
      polygonOffsetUnits: -1
    });

    const boardwalkTex = TextureGenerator.getAgedWoodTextures();
    this.boardwalkMat = new THREE.MeshStandardMaterial({
      map: boardwalkTex.diffuse,
      normalMap: boardwalkTex.normal,
      roughnessMap: boardwalkTex.roughness,
      color: 0x6e5e50, // Weathered timber planks cleanly separated from street mud
      roughness: 0.82,
      metalness: 0.02
    });

    this.grassMat = new THREE.MeshStandardMaterial({
      color: 0x4a4f38, // Muted green/brown prairie mountain terrain
      roughness: 0.9,
      metalness: 0.02
    });
  }

  /**
   * Deterministic terrain height:
   * Level (0.0m) for town center and station.
   * Rises up to 4.0m on the church hill in the northwest.
   */
  public getTerrainHeight(x: number, z: number): number {
    if (z >= -13.0 || x > 50.0) {
      return 0.0;
    }
    const t = Math.min(Math.max((-13.0 - z) / 13.5, 0), 1);
    return t * 4.0;
  }

  public buildTerrain() {
    const width = 280;
    const depth = 280;
    const geo = new THREE.PlaneGeometry(width, depth, 140, 140);
    geo.rotateX(-Math.PI / 2);

    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      pos.setY(i, this.getTerrainHeight(x, z));
    }
    geo.computeVertexNormals();

    this.groundMesh = new THREE.Mesh(geo, this.grassMat);
    this.groundMesh.receiveShadow = true;
    this.scene.add(this.groundMesh);

    this.buildRoadNetwork();
  }

  /**
   * Builds road mesh ribbon exactly along roadSpline from valentineLayout.json (width 7.0)
   */
  private buildRoadNetwork() {
    const splinePoints = (valentineData as ValentineLayoutData).roadSpline.map(
      ([x, z]) => new THREE.Vector3(x, this.getTerrainHeight(x, z), z)
    );

    const curve = new THREE.CatmullRomCurve3(splinePoints, false, 'catmullrom', 0.5);
    const segments = 150;
    const width = 7.0; // Width 7.0 as required
    const geometry = new THREE.BufferGeometry();
    const positions: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const point = curve.getPointAt(t);
      const tangent = curve.getTangentAt(t).normalize();
      const normal = new THREE.Vector3(0, 1, 0);
      const binormal = new THREE.Vector3().crossVectors(tangent, normal).normalize();

      // Left vertex
      const left = new THREE.Vector3().copy(point).add(binormal.clone().multiplyScalar(width / 2));
      left.y = this.getTerrainHeight(left.x, left.z) + 0.03;
      positions.push(left.x, left.y, left.z);
      uvs.push(0, t * 24);

      // Right vertex
      const right = new THREE.Vector3().copy(point).add(binormal.clone().multiplyScalar(-width / 2));
      right.y = this.getTerrainHeight(right.x, right.z) + 0.03;
      positions.push(right.x, right.y, right.z);
      uvs.push(1, t * 24);
    }

    for (let i = 0; i < segments; i++) {
      const a = i * 2;
      const b = i * 2 + 1;
      const c = (i + 1) * 2;
      const d = (i + 1) * 2 + 1;

      indices.push(a, c, b);
      indices.push(b, c, d);
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    const roadMesh = new THREE.Mesh(geometry, this.mudStreetMat);
    roadMesh.receiveShadow = true;
    this.scene.add(roadMesh);
    this.roadMeshes.push(roadMesh);
  }

  public getBoardwalkMat() {
    return this.boardwalkMat;
  }

  public getMudMat() {
    return this.mudStreetMat;
  }
}
