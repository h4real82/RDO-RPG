import {
  BoxGeometry,
  CanvasTexture,
  CylinderGeometry,
  DoubleSide,
  Group,
  LatheGeometry,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  RingGeometry,
  SphereGeometry,
  SRGBColorSpace,
  TorusGeometry,
  Vector2
} from 'three';
import { createReferenceFurniture } from './ReferenceFurniture';

export function makeWoodTexture(): CanvasTexture | undefined {
  if (typeof document === 'undefined') return undefined;
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 256;
  const ctx = canvas.getContext?.('2d');
  if (!ctx) return undefined;
  ctx.fillStyle = '#a49a86';
  ctx.fillRect(0, 0, 128, 256);
  for (let i = 0; i < 64; i++) {
    ctx.strokeStyle = `rgba(50,40,30,${0.03 + (i % 5) * 0.018})`;
    ctx.beginPath();
    ctx.moveTo(i * 2, 0);
    for (let y = 0; y <= 256; y += 16) {
      ctx.lineTo(i * 2 + Math.sin(i * 13 + y * 0.09) * 1.7, y);
    }
    ctx.stroke();
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

function makeTableBadge(label: string, symbol: string): CanvasTexture | undefined {
  if (typeof document === 'undefined') return undefined;
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext?.('2d');
  if (!ctx) return undefined;

  ctx.fillStyle = '#22150f';
  ctx.fillRect(0, 0, 256, 128);
  ctx.strokeStyle = '#c8a35e';
  ctx.lineWidth = 5;
  ctx.strokeRect(6, 6, 244, 116);
  ctx.strokeStyle = '#e8d4a2';
  ctx.lineWidth = 2;
  ctx.strokeRect(12, 12, 232, 104);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#c8a35e';
  ctx.font = 'bold 34px Georgia, serif';
  ctx.fillText(symbol, 128, 50);

  ctx.fillStyle = '#f4e8cb';
  ctx.font = 'bold 22px Georgia, serif';
  ctx.fillText(label, 128, 92);

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

/** Own authentic furniture silhouettes based on supplied P5 saloon references; no original asset claim. */
export function createSaloonFurniture(kind: string, width: number, depth: number, height?: number): Group {
  const reference = createReferenceFurniture(kind, width, depth, height);
  if (reference) return reference;

  const group = new Group();
  const wood = new MeshStandardMaterial({ color: '#a0734a', roughness: 0.74 });
  const trim = new MeshStandardMaterial({ color: '#be8f5d', roughness: 0.62 });
  const dark = new MeshStandardMaterial({ color: '#3e2d24', roughness: 0.88 });
  const brass = new MeshStandardMaterial({ color: '#c8a35e', metalness: 0.65, roughness: 0.35 });
  const ivory = new MeshStandardMaterial({ color: '#eee5d2', roughness: 0.6 });
  const fabric = new MeshStandardMaterial({ color: '#2d6a4f', roughness: 0.95 });
  const leather = new MeshStandardMaterial({ color: '#542226', roughness: 0.78 }); // Burgundy saloon leather
  const glass = new MeshStandardMaterial({ color: '#c8d9de', roughness: 0.15, transparent: true, opacity: 0.55 });
  const beerGold = new MeshStandardMaterial({ color: '#c48927', roughness: 0.3 });
  const beerFoam = new MeshStandardMaterial({ color: '#f7f4eb', roughness: 0.9 });

  for (const material of [wood, trim]) material.userData.interiorRole = 'wood';

  const box = (name: string, x: number, y: number, z: number, w: number, h: number, d: number, mat = wood) => {
    const mesh = new Mesh(new BoxGeometry(w, h, d), mat);
    mesh.name = name;
    mesh.position.set(x, y, z);
    group.add(mesh);
    return mesh;
  };

  const cylinder = (x: number, y: number, z: number, r: number, h: number, mat = wood) => {
    const mesh = new Mesh(new CylinderGeometry(r * 0.85, r, h, 12), mat);
    mesh.position.set(x, y, z);
    group.add(mesh);
    return mesh;
  };

  // Upholstered Western Saloon Chair with turned legs and leather seat
  function chair(x: number, z: number, yaw: number) {
    const chairGroup = new Group();
    chairGroup.name = 'saloon-chair';

    // Cushioned seat
    const seatBase = new Mesh(new BoxGeometry(0.52, 0.05, 0.52), wood);
    seatBase.name = 'chair-seat-base';
    seatBase.position.set(0, 0.44, 0);
    chairGroup.add(seatBase);

    const seatCushion = new Mesh(new BoxGeometry(0.5, 0.06, 0.5), leather);
    seatCushion.name = 'chair-seat';
    seatCushion.position.set(0, 0.48, 0);
    chairGroup.add(seatCushion);

    // Turned cylindrical legs with brass tips
    for (const px of [-0.2, 0.2]) {
      for (const pz of [-0.2, 0.2]) {
        const leg = new Mesh(new CylinderGeometry(0.022, 0.028, 0.44, 8), wood);
        leg.name = 'chair-leg';
        leg.position.set(px, 0.22, pz);
        chairGroup.add(leg);

        const tip = new Mesh(new CylinderGeometry(0.024, 0.026, 0.04, 8), brass);
        tip.position.set(px, 0.02, pz);
        chairGroup.add(tip);
      }
    }

    // Curved backrest posts & crest
    for (const px of [-0.22, 0.22]) {
      const post = new Mesh(new CylinderGeometry(0.024, 0.028, 0.72, 8), wood);
      post.name = 'chair-back';
      post.position.set(px, 0.82, -0.22);
      chairGroup.add(post);
    }

    const crest = new Mesh(new BoxGeometry(0.56, 0.11, 0.06), trim);
    crest.name = 'chair-back-crest';
    crest.position.set(0, 1.18, -0.22);
    chairGroup.add(crest);

    // Turned back spindles
    for (const px of [-0.12, 0, 0.12]) {
      const spindle = new Mesh(new CylinderGeometry(0.012, 0.015, 0.42, 6), wood);
      spindle.name = 'chair-back-spindle';
      spindle.position.set(px, 0.9, -0.22);
      chairGroup.add(spindle);
    }

    chairGroup.position.set(x, 0, z);
    chairGroup.rotation.y = yaw;
    group.add(chairGroup);
  }

  // Western Tabletop Standing Badge/Plaque
  function addStandingBadge(title: string, symbol: string, x: number, y: number, z: number, yaw = 0) {
    const badgeGroup = new Group();
    badgeGroup.name = `table-badge-${title.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
    badgeGroup.position.set(x, y, z);
    badgeGroup.rotation.y = yaw;

    // Small brass easel stand
    const stand = new Mesh(new BoxGeometry(0.24, 0.04, 0.1), brass);
    stand.position.y = 0.02;
    badgeGroup.add(stand);

    const texture = makeTableBadge(title, symbol);
    const badgeMat = new MeshStandardMaterial({
      map: texture ?? null,
      color: texture ? '#ffffff' : '#c8a35e',
      roughness: 0.4,
      metalness: 0.3
    });

    const plaque = new Mesh(new BoxGeometry(0.26, 0.14, 0.015), badgeMat);
    plaque.position.set(0, 0.1, 0);
    plaque.rotation.x = -0.15; // angled slightly up toward camera
    badgeGroup.add(plaque);

    group.add(badgeGroup);
  }

  // Foamy Beer Tankard
  function addBeerTankard(x: number, y: number, z: number) {
    const mug = new Group();
    mug.name = 'beer-tankard';
    mug.position.set(x, y, z);

    const body = new Mesh(new CylinderGeometry(0.05, 0.055, 0.14, 10), glass);
    body.position.y = 0.07;
    mug.add(body);

    const liquid = new Mesh(new CylinderGeometry(0.046, 0.05, 0.11, 8), beerGold);
    liquid.position.y = 0.06;
    mug.add(liquid);

    const foam = new Mesh(new CylinderGeometry(0.052, 0.048, 0.035, 10), beerFoam);
    foam.position.y = 0.135;
    mug.add(foam);

    const handle = new Mesh(new TorusGeometry(0.04, 0.01, 6, 12), glass);
    handle.position.set(0.055, 0.07, 0);
    mug.add(handle);

    group.add(mug);
  }

  if (kind === 'table' || kind === 'table-round' || kind === 'table-poker' || kind === 'table-blackjack' || kind === 'table-maexchen') {
    if (kind === 'table-round' || kind === 'table-poker') {
      // 1. Authentic Texas Hold'em Poker Table
      cylinder(0, 0.82, 0, width / 2, 0.11, trim);
      cylinder(0, 0.885, 0, width / 2 - 0.08, 0.02, fabric); // Green baize felt

      // Padded leather armrest rim around perimeter
      const rim = new Mesh(new TorusGeometry(width / 2 - 0.04, 0.035, 8, 24), leather);
      rim.rotation.x = Math.PI / 2;
      rim.position.y = 0.895;
      group.add(rim);

      // Dealt cards & chip stacks
      const ink = new MeshStandardMaterial({ color: '#8a242b', roughness: 1 });
      const blueChip = new MeshStandardMaterial({ color: '#1d3557', roughness: 0.6 });
      const whiteChip = new MeshStandardMaterial({ color: '#f1faee', roughness: 0.6 });
      const redChip = new MeshStandardMaterial({ color: '#e63946', roughness: 0.6 });

      // Cards dealt at 3 seats
      for (const side of [-1, 1]) {
        for (let i = 0; i < 2; i++) {
          const cx = side * 0.4 + (i - 0.5) * 0.18;
          const cz = side * 0.25;
          box('poker-decorative-card', cx, 0.904, cz, 0.15, 0.008, 0.22, ivory);
          for (const offset of [-0.06, 0, 0.06]) cylinder(cx, 0.91, cz + offset, 0.014, 0.003, ink);
        }
      }

      // Community cards in center
      for (let i = -1; i <= 1; i++) {
        box('community-card', i * 0.16, 0.904, 0, 0.14, 0.006, 0.2, ivory);
      }

      // Chip stacks around the pot
      for (let i = 0; i < 4; i++) {
        cylinder(-0.25 + i * 0.08, 0.92 + i * 0.015, -0.15, 0.045, 0.02, i % 2 ? redChip : whiteChip);
        cylinder(0.18 + i * 0.04, 0.92 + i * 0.015, -0.2, 0.045, 0.02, blueChip);
      }

      // Dealer button disc
      cylinder(0.25, 0.905, 0.15, 0.04, 0.01, ivory);

      // Distinct Western table badge
      addStandingBadge('POKER', '🃏', 0, 0.9, -width / 2 + 0.25, 0);

      // Turned pedestal table base
      cylinder(0, 0.42, 0, 0.16, 0.76, trim);
      for (const ang of [0, Math.PI / 2, Math.PI, (Math.PI * 3) / 2]) {
        const foot = new Mesh(new BoxGeometry(width * 0.38, 0.08, 0.08), trim);
        foot.position.set(Math.cos(ang) * width * 0.18, 0.06, Math.sin(ang) * width * 0.18);
        foot.rotation.y = -ang;
        group.add(foot);
      }

      chair(0, depth / 2 + 0.45, 0);
      chair(0, -depth / 2 - 0.45, Math.PI);
      chair(width / 2 + 0.45, 0, Math.PI / 2);
      chair(-width / 2 - 0.45, 0, -Math.PI / 2);

    } else if (kind === 'table-blackjack') {
      // 2. D-Shaped Blackjack Table (21)
      const tableTop = new Mesh(new BoxGeometry(width, 0.1, depth * 0.85), trim);
      tableTop.position.set(0, 0.82, 0);
      group.add(tableTop);

      const felt = new Mesh(new BoxGeometry(width - 0.1, 0.02, depth * 0.75), fabric);
      felt.position.set(0, 0.875, 0);
      group.add(felt);

      // Leather dealer rail
      const armrest = new Mesh(new BoxGeometry(width + 0.04, 0.045, 0.1), leather);
      armrest.position.set(0, 0.885, depth * 0.38);
      group.add(armrest);

      // 4 Betting spot rings on felt
      for (let i = -1.5; i <= 1.5; i += 1) {
        const bx = i * (width * 0.22);
        const bz = depth * 0.12;
        const spot = new Mesh(new RingGeometry(0.05, 0.065, 16), brass);
        spot.rotation.x = -Math.PI / 2;
        spot.position.set(bx, 0.887, bz);
        group.add(spot);

        // Chip stack on bet
        cylinder(bx, 0.905, bz, 0.035, 0.025, brass);
      }

      // Dealer card shoe box
      const cardShoe = new Mesh(new BoxGeometry(0.12, 0.08, 0.22), dark);
      cardShoe.position.set(-width * 0.32, 0.91, -depth * 0.15);
      cardShoe.rotation.y = 0.35;
      group.add(cardShoe);

      // Distinct Western table badge
      addStandingBadge('BLACKJACK', '♠️', 0, 0.88, -depth * 0.28, 0);

      // Sturdy turned table legs
      for (const x of [-width / 2 + 0.2, width / 2 - 0.2]) {
        for (const z of [-depth / 2 + 0.2, depth / 2 - 0.2]) {
          cylinder(x, 0.4, z, 0.07, 0.78, wood);
        }
      }

      chair(-width * 0.28, depth / 2 + 0.4, 0);
      chair(0, depth / 2 + 0.4, 0);
      chair(width * 0.28, depth / 2 + 0.4, 0);

    } else if (kind === 'table-maexchen') {
      // 3. Rustic Tavern Dice Table (Mäxchen / Liar's Dice)
      cylinder(0, 0.82, 0, width / 2, 0.1, wood);

      // Hexagonal wooden dice tray in center with green felt
      const trayWood = new Mesh(new CylinderGeometry(0.32, 0.34, 0.05, 6), trim);
      trayWood.position.set(0, 0.89, 0);
      group.add(trayWood);

      const trayFelt = new Mesh(new CylinderGeometry(0.28, 0.28, 0.015, 6), fabric);
      trayFelt.position.set(0, 0.92, 0);
      group.add(trayFelt);

      // Stitched leather dice shaker cup
      const diceCup = new Mesh(new CylinderGeometry(0.065, 0.08, 0.13, 10), leather);
      diceCup.position.set(-0.25, 0.935, 0.12);
      diceCup.rotation.z = -0.15;
      group.add(diceCup);

      // Pair of ivory dice in the tray showing Mäxchen (2 and 1)
      const die1 = new Mesh(new BoxGeometry(0.045, 0.045, 0.045), ivory);
      die1.position.set(-0.04, 0.95, 0.03);
      die1.rotation.y = 0.4;
      const die2 = new Mesh(new BoxGeometry(0.045, 0.045, 0.045), ivory);
      die2.position.set(0.05, 0.95, -0.02);
      die2.rotation.y = -0.25;
      group.add(die1, die2);

      // Pips (black dots on dice)
      const pipMat = new MeshStandardMaterial({ color: '#1c1511', roughness: 0.9 });
      for (const p of [die1, die2]) {
        const dot = new Mesh(new SphereGeometry(0.007, 6, 6), pipMat);
        dot.position.set(p.position.x, p.position.y + 0.024, p.position.z);
        group.add(dot);
      }

      // Foamy beer mugs for players
      addBeerTankard(-width * 0.28, 0.87, -depth * 0.18);
      addBeerTankard(width * 0.28, 0.87, depth * 0.18);

      // Distinct Western table badge
      addStandingBadge('MÄXCHEN', '🎲', 0, 0.87, -width / 2 + 0.22, 0);

      // Turned table base
      cylinder(0, 0.42, 0, 0.15, 0.76, trim);
      for (const x of [-width * 0.26, width * 0.26]) {
        for (const z of [-depth * 0.26, depth * 0.26]) {
          cylinder(x, 0.4, z, 0.06, 0.78, wood);
        }
      }

      chair(0, depth / 2 + 0.42, 0);
      chair(0, -depth / 2 - 0.42, Math.PI);
      chair(width / 2 + 0.42, 0, Math.PI / 2);
      chair(-width / 2 - 0.42, 0, -Math.PI / 2);

    } else {
      // 4. Upgraded Western Dining/Saloon Table
      box('table-top', 0, 0.82, 0, width, 0.11, depth, trim);
      box('table-apron', 0, 0.68, 0, width - 0.15, 0.2, depth - 0.15);

      for (const x of [-width / 2 + 0.2, width / 2 - 0.2]) {
        for (const z of [-depth / 2 + 0.2, depth / 2 - 0.2]) {
          cylinder(x, 0.39, z, 0.075, 0.78, wood);
        }
      }

      // Saloon drink ware & lantern
      addBeerTankard(-0.15, 0.87, 0.1);
      cylinder(0.12, 0.97, -0.05, 0.08, 0.18, brass); // Brass lantern base

      chair(0, depth / 2 + 0.43, 0);
      chair(0, -depth / 2 - 0.43, Math.PI);
      chair(width / 2 + 0.43, 0, Math.PI / 2);
      chair(-width / 2 - 0.43, 0, -Math.PI / 2);
    }

  } else if (kind === 'shelf') {
    box('shelf-back', 0, 1.15, -depth / 2 + 0.035, width, 2.3, 0.07);
    for (const x of [-width / 2 + 0.055, width / 2 - 0.055]) box('shelf-upright', x, 1.18, 0, 0.11, 2.36, depth, trim);
    for (const y of [0.12, 0.63, 1.14, 1.65, 2.22]) box('shelf-board', 0, y, 0, width, 0.09, depth, trim);
    box('shelf-cornice', 0, 2.38, 0, width + 0.1, 0.12, depth + 0.04, trim);

  } else if (kind === 'bench') {
    box('bench-seat', 0, 0.48, 0, width, 0.12, depth, trim);
    for (const x of [-width / 2 + 0.18, width / 2 - 0.18]) for (const z of [-depth / 2 + 0.1, depth / 2 - 0.1]) box('bench-leg', x, 0.22, z, 0.09, 0.44, 0.09);
    for (const x of [-width / 2 + 0.1, width / 2 - 0.1]) box('bench-back-post', x, 0.75, -depth / 2 + 0.03, 0.09, 1.05, 0.09);
    for (const y of [0.76, 1.03]) box('bench-back-board', 0, y, -depth / 2 + 0.03, width, 0.17, 0.08, trim);

  } else if (kind === 'bed') {
    const linen = new MeshStandardMaterial({ color: '#ded2b8', roughness: 1 });
    linen.userData.interiorRole = 'rug';
    for (const x of [-width / 2 + 0.09, width / 2 - 0.09]) {
      for (const z of [-depth / 2 + 0.09, depth / 2 - 0.09]) {
        box('bed-post', x, 0.55, z, 0.11, 1.1, 0.11, trim);
        cylinder(x, 1.13, z, 0.085, 0.1, trim);
      }
    }
    box('bed-frame', 0, 0.35, 0, width, 0.22, depth);
    box('bed-mattress', 0, 0.55, 0, width - 0.15, 0.2, depth - 0.1, linen);
    box('bed-headboard', 0, 0.91, -depth / 2 + 0.07, width - 0.12, 0.6, 0.08, trim);
    box('bed-footboard', 0, 0.74, depth / 2 - 0.07, width - 0.12, 0.38, 0.08);
    box('bed-blanket', 0, 0.67, 0.18, width - 0.13, 0.045, depth * 0.66, fabric);
    fabric.userData.interiorRole = 'rug';
    box('bed-pillow', 0, 0.7, -depth / 2 + 0.42, width * 0.6, 0.14, 0.4, ivory);

  } else if (kind === 'bathtub') {
    const copper = new MeshStandardMaterial({ color: '#956a49', metalness: 0.65, roughness: 0.48 });
    const profile = [[0, 0.1], [0.37, 0.1], [0.5, 0.5], [0.48, 0.53], [0.45, 0.49], [0.34, 0.15], [0, 0.15]].map(([x, y]) => new Vector2(x, y));
    const shell = new Mesh(new LatheGeometry(profile, 32), copper);
    shell.name = 'bath-shell';
    shell.scale.set(width, 1, depth);
    shell.position.y = 0.12;
    group.add(shell);
    const rim = new Mesh(new TorusGeometry(0.48, 0.02, 8, 40), copper);
    rim.name = 'bath-rim';
    rim.rotation.x = Math.PI / 2;
    rim.scale.set(width, depth, 1);
    rim.position.y = 0.64;
    group.add(rim);
    for (const x of [-width * 0.3, width * 0.3]) for (const z of [-depth * 0.3, depth * 0.3]) box('bath-foot', x, 0.09, z, 0.12, 0.18, 0.13, brass);

  } else if (kind === 'desk') {
    box('desk-top', 0, 0.84, 0, width + 0.04, 0.12, depth + 0.04, trim);
    for (const x of [-width / 2 + 0.12, width / 2 - 0.12]) for (const z of [-depth / 2 + 0.1, depth / 2 - 0.1]) box('desk-leg', x, 0.4, z, 0.1, 0.8, 0.1);
    box('desk-drawer', 0, 0.67, 0, width - 0.15, 0.2, depth - 0.12);
    for (const x of [-width * 0.25, width * 0.25]) box('desk-drawer-pull', x, 0.67, depth / 2, 0.16, 0.04, 0.04, brass);
    box('desk-ledger', -0.3, 0.92, 0, 0.38, 0.05, 0.3, dark);

  } else if (kind === 'bank-counter') {
    box('bank-counter-cabinet', 0, 0.55, 0, width, 1.1, depth);
    box('bank-counter-top', 0, 1.18, 0, width + 0.16, 0.15, depth + 0.14, trim);
    for (let x = -width / 2 + 0.6; x < width / 2; x += 1.2) {
      box('bank-raised-panel', x, 0.58, -depth / 2 - 0.02, 1.03, 0.8, 0.05, trim);
      box('bank-panel-inset', x, 0.58, -depth / 2 - 0.05, 0.83, 0.6, 0.03);
    }
    for (const x of [-width / 2 + 0.15, width / 2 - 0.15]) box('bank-divider-post', x, 1.5, 0, 0.13, 1.5, 0.13, trim);
    box('bank-service-ledger', -0.65, 1.29, -0.08, 0.46, 0.05, 0.33, dark);
    cylinder(0.7, 1.32, -0.1, 0.1, 0.12, brass);

  } else if (kind === 'npc-bartender' || kind === 'npc-clerk') {
    // 5. Authentic Detailed Western Bartender & Clerk
    const shirt = new MeshStandardMaterial({ color: '#f5f0e1', roughness: 0.85 });
    const vest = new MeshStandardMaterial({ color: kind === 'npc-clerk' ? '#2f3b43' : '#33231f', roughness: 0.8 });
    const trousers = new MeshStandardMaterial({ color: '#27201c', roughness: 0.85 });
    const boots = new MeshStandardMaterial({ color: '#16110e', roughness: 0.7 });
    const skin = new MeshStandardMaterial({ color: '#c49e7b', roughness: 0.75 });
    const hairMat = new MeshStandardMaterial({ color: '#1b130e', roughness: 0.9 });
    const apronMat = new MeshStandardMaterial({ color: '#eee7d4', roughness: 0.92 });
    const tieMat = new MeshStandardMaterial({ color: '#591f24', roughness: 0.8 });

    // Boots & Trousers
    for (const x of [-0.13, 0.13]) {
      const boot = new Mesh(new BoxGeometry(0.16, 0.16, 0.28), boots);
      boot.name = 'npc-boot';
      boot.position.set(x, 0.08, 0.05);
      group.add(boot);

      const leg = new Mesh(new CylinderGeometry(0.09, 0.08, 0.68, 10), trousers);
      leg.name = 'npc-trouser';
      leg.position.set(x, 0.46, 0);
      group.add(leg);
    }

    // Leather belt with brass buckle
    const belt = new Mesh(new CylinderGeometry(0.22, 0.21, 0.07, 12), dark);
    belt.position.set(0, 0.8, 0);
    const buckle = new Mesh(new BoxGeometry(0.08, 0.05, 0.03), brass);
    buckle.position.set(0, 0.8, 0.21);
    group.add(belt, buckle);

    // Torso: Shirt & Tailored Vest
    const torso = new Mesh(new CylinderGeometry(0.24, 0.22, 0.62, 12), shirt);
    torso.name = 'npc-shirt';
    torso.position.set(0, 1.13, 0);
    group.add(torso);

    const waistcoat = new Mesh(new CylinderGeometry(0.245, 0.225, 0.54, 12), vest);
    waistcoat.name = 'npc-waistcoat';
    waistcoat.position.set(0, 1.1, 0);
    group.add(waistcoat);

    // Vest lapels & 4 brass buttons
    for (let i = 0; i < 4; i++) {
      const btn = new Mesh(new CylinderGeometry(0.012, 0.012, 0.01, 8), brass);
      btn.rotation.x = Math.PI / 2;
      btn.position.set(0, 0.92 + i * 0.1, 0.24);
      group.add(btn);
    }

    // Pocket watch chain draped across vest
    const chainCurve = new Mesh(new TorusGeometry(0.12, 0.007, 6, 16), brass);
    chainCurve.position.set(0.06, 0.98, 0.23);
    chainCurve.rotation.z = -0.3;
    group.add(chainCurve);

    // Arms: Rolled-up white shirt sleeves & hands
    for (const side of [-1, 1]) {
      const shoulderX = side * 0.32;
      const upperArm = new Mesh(new CylinderGeometry(0.075, 0.07, 0.32, 10), shirt);
      upperArm.position.set(shoulderX, 1.25, 0);
      group.add(upperArm);

      // Rolled sleeve cuff band
      const cuff = new Mesh(new TorusGeometry(0.076, 0.02, 6, 12), shirt);
      cuff.position.set(shoulderX, 1.08, 0);
      cuff.rotation.x = Math.PI / 2;
      group.add(cuff);

      // Bare forearm
      const forearm = new Mesh(new CylinderGeometry(0.06, 0.055, 0.28, 8), skin);
      forearm.name = 'npc-sleeve';
      forearm.position.set(shoulderX, 0.93, 0.06);
      forearm.rotation.x = 0.35;
      group.add(forearm);

      // Hand resting on counter or holding bar item
      const hand = new Mesh(new BoxGeometry(0.09, 0.08, 0.12), skin);
      hand.name = 'npc-hand';
      hand.position.set(shoulderX, 0.8, 0.18);
      group.add(hand);
    }

    // Bartender Props: Towel draped over left arm & glass tumbler in right hand
    if (kind === 'npc-bartender') {
      const towel = new Mesh(new BoxGeometry(0.12, 0.32, 0.04), apronMat);
      towel.name = 'bartender-towel';
      towel.position.set(-0.34, 0.96, 0.1);
      towel.rotation.z = 0.2;
      group.add(towel);

      // Whiskey glass in right hand
      const tumbler = new Mesh(new CylinderGeometry(0.038, 0.034, 0.08, 10), glass);
      tumbler.position.set(0.32, 0.86, 0.2);
      const whiskey = new Mesh(new CylinderGeometry(0.034, 0.03, 0.05, 8), beerGold);
      whiskey.position.set(0.32, 0.84, 0.2);
      group.add(tumbler, whiskey);

      // Authentic bartender apron
      const apron = new Mesh(new BoxGeometry(0.38, 0.62, 0.03), apronMat);
      apron.name = 'npc-apron';
      apron.position.set(0, 0.82, 0.23);
      group.add(apron);

      // Leather neck strap for apron
      const neckStrapL = new Mesh(new CylinderGeometry(0.008, 0.008, 0.26, 6), dark);
      neckStrapL.position.set(-0.12, 1.24, 0.17);
      neckStrapL.rotation.z = -0.3;
      const neckStrapR = new Mesh(new CylinderGeometry(0.008, 0.008, 0.26, 6), dark);
      neckStrapR.position.set(0.12, 1.24, 0.17);
      neckStrapR.rotation.z = 0.3;
      group.add(neckStrapL, neckStrapR);
    }

    // Neck & Head
    const neck = new Mesh(new CylinderGeometry(0.09, 0.1, 0.14, 10), skin);
    neck.position.set(0, 1.48, 0);
    group.add(neck);

    // Collar & Bowtie / Western string tie
    const collar = new Mesh(new CylinderGeometry(0.12, 0.11, 0.06, 12), shirt);
    collar.position.set(0, 1.44, 0);
    const bowtie = new Mesh(new BoxGeometry(0.14, 0.06, 0.04), tieMat);
    bowtie.name = 'npc-bowtie';
    bowtie.position.set(0, 1.42, 0.14);
    group.add(collar, bowtie);

    // Head
    const head = new Mesh(new SphereGeometry(0.17, 16, 14), skin);
    head.name = 'npc-head';
    head.scale.set(0.9, 1.15, 0.95);
    head.position.set(0, 1.66, 0);
    group.add(head);

    // Neatly combed hair with side parting
    const hair = new Mesh(new SphereGeometry(0.18, 14, 12), hairMat);
    hair.name = 'npc-hair';
    hair.scale.set(0.94, 0.9, 1.02);
    hair.position.set(0, 1.76, -0.02);
    group.add(hair);

    // Sideburns
    for (const x of [-0.15, 0.15]) {
      const burn = new Mesh(new BoxGeometry(0.03, 0.12, 0.04), hairMat);
      burn.position.set(x, 1.66, 0.02);
      group.add(burn);
    }

    // Nose
    const nose = new Mesh(new CylinderGeometry(0.015, 0.03, 0.08, 6), skin);
    nose.name = 'npc-nose';
    nose.position.set(0, 1.65, 0.18);
    nose.rotation.x = -0.2;
    group.add(nose);

    // Eyes
    for (const x of [-0.055, 0.055]) {
      const eye = new Mesh(new SphereGeometry(0.016, 8, 8), dark);
      eye.name = 'npc-eye';
      eye.position.set(x, 1.7, 0.165);
      group.add(eye);
    }

    // Curved Western Handlebar Moustache
    const stacheL = new Mesh(new TorusGeometry(0.045, 0.015, 6, 12, Math.PI), hairMat);
    stacheL.name = 'npc-mustache';
    stacheL.rotation.z = Math.PI / 2 + 0.3;
    stacheL.position.set(-0.04, 1.58, 0.175);
    const stacheR = new Mesh(new TorusGeometry(0.045, 0.015, 6, 12, Math.PI), hairMat);
    stacheR.rotation.z = Math.PI / 2 - 0.3;
    stacheR.position.set(0.04, 1.58, 0.175);
    group.add(stacheL, stacheR);

  } else if (kind === 'bar') {
    box('bar-body', 0, 0.56, 0, width, 1.12, depth);
    box('bar-top', 0, 1.18, 0, width + 0.2, 0.14, depth + 0.22, trim);
    for (let z = -depth / 2 + 0.45; z < depth / 2; z += 0.95) {
      box('bar-raised-panel', width / 2 + 0.035, 0.58, z, 0.05, 0.7, 0.76, trim);
      box('bar-inset-panel', width / 2 + 0.066, 0.58, z, 0.022, 0.56, 0.62);
    }
    for (const y of [0.12, 1.02]) box('bar-moulding', width / 2 + 0.06, y, 0, 0.1, 0.06, depth, trim);
    const rail = new Mesh(new CylinderGeometry(0.035, 0.035, depth, 12), brass);
    rail.rotation.x = Math.PI / 2;
    rail.position.set(width / 2 + 0.3, 0.18, 0);
    group.add(rail);

  } else if (kind === 'backbar') {
    box('backbar-cabinet', 0, 0.48, 0, width, 0.96, depth);
    box('backbar-back', -width / 2 + 0.06, 1.65, 0, 0.1, 2.3, depth);
    for (const y of [1.08, 1.7, 2.4]) box('backbar-shelf', 0, y, 0, width + 0.1, 0.08, depth, trim);
    for (const z of [-depth / 2 + 0.08, 0, depth / 2 - 0.08]) box('backbar-upright', 0, 1.7, z, width, 0.08, 0.08, trim).scale.y = 22;
    for (let z = -depth / 2 + 0.35; z < depth / 2 - 0.2; z += 0.6) {
      cylinder(0.1, 1.23, z, 0.065, 0.22, fabric);
      cylinder(0.1, 1.39, z, 0.026, 0.13, fabric);
    }

  } else if (kind === 'piano') {
    box('piano-case', 0, 0.88, 0, width, 1.65, depth);
    box('piano-keys', 0, 0.87, depth / 2 + 0.12, width - 0.15, 0.07, 0.4, ivory);
    const count = 24;
    for (let i = 0; i < count; i++) {
      const x = -width / 2 + 0.1 + (i * (width - 0.2)) / count;
      box('piano-key-seam', x, 0.91, depth / 2 + 0.15, 0.009, 0.01, 0.32, dark);
      if (i % 7 !== 2 && i % 7 !== 6) box('piano-black-key', x, 0.94, depth / 2 - 0.005, 0.035, 0.05, 0.19, dark);
    }
    box('piano-top-moulding', 0, 1.73, 0, width + 0.12, 0.12, depth + 0.1, trim);
    box('piano-front-panel', 0, 1.29, depth / 2 + 0.015, width - 0.2, 0.53, 0.04, trim);
    box('piano-music-rest', 0, 1.13, depth / 2 + 0.06, 0.65, 0.36, 0.035);
    box('piano-bench', 0, 0.46, depth / 2 + 0.72, 1, 0.09, 0.42, trim);
    for (const x of [-0.4, 0.4]) box('piano-bench-leg', x, 0.23, depth / 2 + 0.72, 0.09, 0.46, 0.32);

  } else if (kind === 'picture') {
    // Elegant Victorian Framed Artwork with customizable canvas
    box('picture-frame', 0, 0, 0, width, depth, 0.09, brass);
    box('picture-mount', 0, 0, 0.052, width - 0.1, depth - 0.1, 0.02, ivory);
    const artMaterial = new MeshStandardMaterial({ color: '#7697a2', side: DoubleSide });
    artMaterial.userData.interiorRole = 'art';
    const art = new Group();
    const sky = box('picture-landscape', 0, 0, 0.066, width - 0.17, depth - 0.17, 0.012, artMaterial);
    box('picture-hills', 0, -depth * 0.18, 0.076, width - 0.2, depth * 0.3, 0.013, new MeshStandardMaterial({ color: '#4e644c' }));
    group.add(art);
    sky.userData.ownArtwork = true;

  } else if (kind === 'rug') {
    const material = new MeshStandardMaterial({ color: '#752e38', roughness: 1 });
    material.userData.interiorRole = 'rug';
    box('woven-rug', 0, 0.012, 0, width, 0.015, depth, material);
  }

  return group;
}
