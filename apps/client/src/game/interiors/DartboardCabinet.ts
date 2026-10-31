import {
  BoxGeometry,
  CanvasTexture,
  CircleGeometry,
  CylinderGeometry,
  DoubleSide,
  Group,
  Mesh,
  MeshStandardMaterial,
  RingGeometry,
  SRGBColorSpace,
  TorusGeometry
} from 'three';

export interface WallTargetDef {
  id: string;
  position: { x: number; y: number; z: number };
  radius: number;
  yaw: number;
}

function makeChalkboardTexture(score: string): CanvasTexture | undefined {
  if (typeof document === 'undefined') return undefined;
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 256;
  const ctx = canvas.getContext?.('2d');
  if (!ctx) return undefined;

  ctx.fillStyle = '#1e2420';
  ctx.fillRect(0, 0, 128, 256);

  // Subtle chalkboard dust
  ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
  for (let i = 0; i < 40; i++) {
    ctx.fillRect(Math.random() * 128, Math.random() * 256, 12, 4);
  }

  ctx.strokeStyle = 'rgba(240, 240, 235, 0.75)';
  ctx.lineWidth = 2;
  ctx.font = 'bold 20px Georgia, serif';
  ctx.fillStyle = 'rgba(240, 240, 235, 0.9)';
  ctx.textAlign = 'center';
  ctx.fillText('VALENTINE', 64, 32);
  ctx.beginPath();
  ctx.moveTo(16, 42);
  ctx.lineTo(112, 42);
  ctx.stroke();

  ctx.font = '16px monospace';
  ctx.fillText('20  |  19', 64, 70);
  ctx.fillText('18  |  17', 64, 98);
  ctx.fillText('16  |  15', 64, 126);
  ctx.fillText('BULL | ' + score, 64, 156);

  // Chalk tally marks
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(30, 190); ctx.lineTo(30, 220);
  ctx.moveTo(40, 190); ctx.lineTo(40, 220);
  ctx.moveTo(50, 190); ctx.lineTo(50, 220);
  ctx.moveTo(25, 215); ctx.lineTo(55, 195);
  ctx.stroke();

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

export function createDartboardCabinet(target: WallTargetDef): Group {
  const root = new Group();
  root.name = target.id;
  root.position.set(target.position.x, target.position.y, target.position.z);
  root.rotation.y = target.yaw;

  const r = target.radius;
  const darkWood = new MeshStandardMaterial({ color: '#3a271c', roughness: 0.8 });
  darkWood.userData.interiorRole = 'furnitureWood';
  const trimWood = new MeshStandardMaterial({ color: '#5a3d2c', roughness: 0.75 });
  trimWood.userData.interiorRole = 'furnitureWood';
  const iron = new MeshStandardMaterial({ color: '#2b2b29', metalness: 0.7, roughness: 0.45 });
  const brass = new MeshStandardMaterial({ color: '#c8a35e', metalness: 0.7, roughness: 0.35 });

  // 1. Back panel of cabinet
  const backW = r * 2.3;
  const backH = r * 2.45;
  const backBox = new Mesh(new BoxGeometry(backW, backH, 0.05), darkWood);
  backBox.name = 'dart-cabinet-back';
  backBox.position.z = -0.025;
  root.add(backBox);

  // Cabinet outer frame rim
  const topRim = new Mesh(new BoxGeometry(backW + 0.06, 0.06, 0.08), trimWood);
  topRim.position.set(0, backH / 2 + 0.03, 0);
  const botRim = new Mesh(new BoxGeometry(backW + 0.06, 0.06, 0.08), trimWood);
  botRim.position.set(0, -backH / 2 - 0.03, 0);
  root.add(topRim, botRim);

  // 2. Hinged open doors (left and right)
  const doorW = backW * 0.48;
  const doorH = backH * 0.94;
  const leftDoor = new Group();
  leftDoor.name = 'dart-cabinet-door-left';
  leftDoor.position.set(-backW / 2 + 0.01, 0, 0);
  leftDoor.rotation.y = 0.65; // open outward
  const leftDoorMesh = new Mesh(new BoxGeometry(doorW, doorH, 0.03), darkWood);
  leftDoorMesh.position.x = -doorW / 2;
  leftDoor.add(leftDoorMesh);

  // Chalkboard on left door
  const chalkTexL = makeChalkboardTexture('301');
  const chalkMatL = new MeshStandardMaterial({
    map: chalkTexL ?? null,
    color: chalkTexL ? '#ffffff' : '#1e2420',
    roughness: 0.95
  });
  const leftBoard = new Mesh(new BoxGeometry(doorW * 0.85, doorH * 0.86, 0.005), chalkMatL);
  leftBoard.position.set(-doorW / 2, 0, 0.018);
  leftDoor.add(leftBoard);
  root.add(leftDoor);

  const rightDoor = new Group();
  rightDoor.name = 'dart-cabinet-door-right';
  rightDoor.position.set(backW / 2 - 0.01, 0, 0);
  rightDoor.rotation.y = -0.65; // open outward
  const rightDoorMesh = new Mesh(new BoxGeometry(doorW, doorH, 0.03), darkWood);
  rightDoorMesh.position.x = doorW / 2;
  rightDoor.add(rightDoorMesh);

  // Chalkboard on right door
  const chalkTexR = makeChalkboardTexture('501');
  const chalkMatR = new MeshStandardMaterial({
    map: chalkTexR ?? null,
    color: chalkTexR ? '#ffffff' : '#1e2420',
    roughness: 0.95
  });
  const rightBoard = new Mesh(new BoxGeometry(doorW * 0.85, doorH * 0.86, 0.005), chalkMatR);
  rightBoard.position.set(doorW / 2, 0, 0.018);
  rightDoor.add(rightBoard);
  root.add(rightDoor);

  // Hinges
  for (const y of [-backH * 0.35, backH * 0.35]) {
    const hL = new Mesh(new BoxGeometry(0.02, 0.06, 0.03), iron);
    hL.position.set(-backW / 2, y, 0.01);
    const hR = new Mesh(new BoxGeometry(0.02, 0.06, 0.03), iron);
    hR.position.set(backW / 2, y, 0.01);
    root.add(hL, hR);
  }

  // 3. Realistic Sisal Dartboard
  const boardGroup = new Group();
  boardGroup.name = 'dartboard-face';
  boardGroup.position.z = 0.02;

  // Outer black ring with numbers
  const numberRing = new Mesh(
    new RingGeometry(r * 0.82, r, 32),
    new MeshStandardMaterial({ color: '#1a1816', side: DoubleSide, roughness: 0.9 })
  );
  boardGroup.add(numberRing);

  // Outer scoring bed
  const outerBed = new Mesh(
    new RingGeometry(r * 0.52, r * 0.82, 32),
    new MeshStandardMaterial({ color: '#dfcca9', side: DoubleSide, roughness: 0.95 })
  );
  outerBed.position.z = 0.001;
  boardGroup.add(outerBed);

  // Double ring (red/green segments)
  const doubleRing = new Mesh(
    new RingGeometry(r * 0.76, r * 0.82, 32),
    new MeshStandardMaterial({ color: '#a22e20', side: DoubleSide, roughness: 0.85 })
  );
  doubleRing.position.z = 0.002;
  boardGroup.add(doubleRing);

  // Inner scoring bed
  const innerBed = new Mesh(
    new RingGeometry(r * 0.16, r * 0.52, 32),
    new MeshStandardMaterial({ color: '#2a2723', side: DoubleSide, roughness: 0.95 })
  );
  innerBed.position.z = 0.0015;
  boardGroup.add(innerBed);

  // Triple ring (green/red)
  const tripleRing = new Mesh(
    new RingGeometry(r * 0.46, r * 0.52, 32),
    new MeshStandardMaterial({ color: '#2b5e39', side: DoubleSide, roughness: 0.85 })
  );
  tripleRing.position.z = 0.0025;
  boardGroup.add(tripleRing);

  // Outer Bullseye (green)
  const outerBull = new Mesh(
    new CircleGeometry(r * 0.14, 24),
    new MeshStandardMaterial({ color: '#2b5e39', side: DoubleSide, roughness: 0.8 })
  );
  outerBull.position.z = 0.003;
  boardGroup.add(outerBull);

  // Inner Bullseye (red)
  const innerBull = new Mesh(
    new CircleGeometry(r * 0.065, 24),
    new MeshStandardMaterial({ color: '#a22e20', side: DoubleSide, roughness: 0.8 })
  );
  innerBull.position.z = 0.004;
  boardGroup.add(innerBull);

  // Wire Spider Ring
  const spiderWire = new Mesh(new TorusGeometry(r * 0.82, 0.004, 6, 32), iron);
  spiderWire.position.z = 0.005;
  boardGroup.add(spiderWire);

  // 4. Stuck Darts
  function addDart(dx: number, dy: number, angleX: number, angleY: number, flightColor: string) {
    const dart = new Group();
    dart.name = 'stuck-dart';
    dart.position.set(dx, dy, 0.005);
    dart.rotation.set(angleX, angleY, 0);

    // Needle
    const needle = new Mesh(new CylinderGeometry(0.003, 0.003, 0.05, 6), iron);
    needle.rotation.x = Math.PI / 2;
    needle.position.z = 0.025;
    dart.add(needle);

    // Brass barrel
    const barrel = new Mesh(new CylinderGeometry(0.009, 0.007, 0.06, 8), brass);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.z = 0.07;
    dart.add(barrel);

    // Shaft & Flight
    const shaft = new Mesh(new CylinderGeometry(0.004, 0.004, 0.07, 6), iron);
    shaft.rotation.x = Math.PI / 2;
    shaft.position.z = 0.125;
    dart.add(shaft);

    const flightMat = new MeshStandardMaterial({ color: flightColor, side: DoubleSide, roughness: 0.7 });
    const flight1 = new Mesh(new BoxGeometry(0.035, 0.002, 0.045), flightMat);
    flight1.position.z = 0.165;
    const flight2 = new Mesh(new BoxGeometry(0.002, 0.035, 0.045), flightMat);
    flight2.position.z = 0.165;
    dart.add(flight1, flight2);

    boardGroup.add(dart);
  }

  // 3 darts in authentic scoring positions:
  addDart(r * 0.02, r * 0.49, 0.12, -0.08, '#a22e20'); // Triple 20!
  addDart(-r * 0.28, r * 0.22, -0.15, 0.1, '#dfcca9');
  addDart(r * 0.01, -r * 0.02, 0.05, 0.04, '#a22e20');  // Near Bullseye!

  root.add(boardGroup);
  return root;
}
