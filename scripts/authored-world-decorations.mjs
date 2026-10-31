/**
 * Procedural Authored Decorative Large Objects & Animals for Valentine
 * (Steam train, stagecoaches, freight wagons, hitched horses, town dogs, chickens)
 * Classification: authored-gameplay
 */

import { createRequire } from 'node:module';
const {
  BoxGeometry,
  CylinderGeometry,
  SphereGeometry,
  ConeGeometry,
  Vector3,
  Quaternion,
  Euler,
  Matrix4
} = createRequire(new URL('../apps/client/package.json', import.meta.url))('three');

export function initDecorationMaterials(doc, materials, baseWood) {
  materials.brass = doc.createMaterial('brass')
    .setBaseColorFactor([0.88, 0.72, 0.28, 1])
    .setMetallicFactor(0.85)
    .setRoughnessFactor(0.35);

  materials.coal = doc.createMaterial('coal')
    .setBaseColorFactor([0.05, 0.05, 0.05, 1])
    .setRoughnessFactor(1.0)
    .setMetallicFactor(0.0);

  materials.coachWood = doc.createMaterial('coachWood')
    .setBaseColorTexture(baseWood.getBaseColorTexture())
    .setBaseColorFactor([0.72, 0.24, 0.16, 1])
    .setRoughnessFactor(0.65)
    .setMetallicFactor(0.0);

  materials.leather = doc.createMaterial('leather')
    .setBaseColorFactor([0.25, 0.16, 0.10, 1])
    .setRoughnessFactor(0.85)
    .setMetallicFactor(0.0);

  materials.horseChestnut = doc.createMaterial('horseChestnut')
    .setBaseColorFactor([0.56, 0.26, 0.12, 1])
    .setRoughnessFactor(0.85)
    .setMetallicFactor(0.0);

  materials.horseBay = doc.createMaterial('horseBay')
    .setBaseColorFactor([0.38, 0.20, 0.11, 1])
    .setRoughnessFactor(0.85)
    .setMetallicFactor(0.0);

  materials.horseBlack = doc.createMaterial('horseBlack')
    .setBaseColorFactor([0.09, 0.09, 0.09, 1])
    .setRoughnessFactor(0.85)
    .setMetallicFactor(0.0);

  materials.horsePalomino = doc.createMaterial('horsePalomino')
    .setBaseColorFactor([0.82, 0.70, 0.44, 1])
    .setRoughnessFactor(0.85)
    .setMetallicFactor(0.0);

  materials.dogFur = doc.createMaterial('dogFur')
    .setBaseColorFactor([0.60, 0.40, 0.22, 1])
    .setRoughnessFactor(0.9)
    .setMetallicFactor(0.0);

  materials.chicken = doc.createMaterial('chicken')
    .setBaseColorFactor([0.92, 0.88, 0.80, 1])
    .setRoughnessFactor(0.9)
    .setMetallicFactor(0.0);

  materials.comb = doc.createMaterial('comb')
    .setBaseColorFactor([0.85, 0.12, 0.12, 1])
    .setRoughnessFactor(0.7)
    .setMetallicFactor(0.0);
}

/**
 * 1899 American 4-4-0 Steam Locomotive & Cars on rails at Valentine Station
 */
export function buildSteamTrain(ctx, { x, z, yaw }) {
  const y = ctx.height(x, z);
  if (y === undefined) return false;

  const local = (dx, dz) => ({
    x: x + dx * Math.cos(yaw) + dz * Math.sin(yaw),
    z: z - dx * Math.sin(yaw) + dz * Math.cos(yaw)
  });

  const part = (dx, dy, dz, w, h, d, key = 'iron', coll = false) => {
    const p = local(dx, dz);
    ctx.box(key, p.x, y + dy, p.z, w, h, d, yaw, coll);
  };

  const cylH = (dx, dy, dz, r, len, key = 'iron') => {
    const p = local(dx, dz);
    const g = new CylinderGeometry(r, r, len, 16);
    g.rotateX(Math.PI / 2);
    ctx.add(key, g, p.x, y + dy, p.z, yaw);
  };

  const wheel = (dx, dy, dz, r, width = 0.12, key = 'iron') => {
    const p = local(dx, dz);
    const g = new CylinderGeometry(r, r, width, 16);
    g.rotateZ(Math.PI / 2);
    ctx.add(key, g, p.x, y + dy, p.z, yaw);
  };

  // --- 1. LOCOMOTIVE ---
  // Main chassis beam
  part(0, 0.72, 0, 2.45, 0.35, 7.6, 'iron', false);

  // Cowcatcher (Wedge Pilot at front)
  part(0, 0.40, -4.0, 2.3, 0.45, 0.8, 'iron', false);
  part(0, 0.55, -4.3, 0.4, 0.25, 0.4, 'brass', false);

  // 4 Front Bogie Wheels (r = 0.42m)
  for (const sx of [-1.08, 1.08]) {
    wheel(sx, 0.46, -2.1, 0.42, 0.10);
    wheel(sx, 0.46, -3.2, 0.42, 0.10);
  }

  // 4 Large Driving Wheels (r = 0.75m)
  for (const sx of [-1.18, 1.18]) {
    wheel(sx, 0.80, 0.7, 0.75, 0.14);
    wheel(sx, 0.80, 2.3, 0.75, 0.14);
    // Side connecting rod between wheel hubs
    part(sx + (sx > 0 ? 0.08 : -0.08), 0.80, 1.5, 0.06, 0.12, 1.85, 'iron');
  }

  // Steam cylinders (pistons on sides)
  for (const sx of [-1.22, 1.22]) {
    cylH(sx, 0.75, -2.5, 0.24, 1.35, 'iron');
  }

  // Boiler barrel (horizontal cylinder)
  cylH(0, 2.10, -0.6, 0.76, 4.6, 'iron');

  // Front smokebox door and latch
  part(0, 2.10, -2.92, 1.4, 1.4, 0.1, 'iron');
  part(0, 2.10, -2.98, 0.22, 0.22, 0.08, 'brass');

  // Smokestack with flared spark arrestor
  const stackP = local(0, -2.5);
  ctx.cylinder('iron', stackP.x, y + 3.25, stackP.z, 0.35, 1.1, yaw);
  ctx.cylinder('iron', stackP.x, y + 3.85, stackP.z, 0.48, 0.25, yaw);

  // Steam Dome & Sand Dome
  const d1 = local(0, -1.3);
  ctx.cylinder('iron', d1.x, y + 3.05, d1.z, 0.36, 0.55, yaw);
  const d2 = local(0, 0.4);
  ctx.cylinder('iron', d2.x, y + 3.05, d2.z, 0.36, 0.55, yaw);

  // Brass locomotive bell
  const bellP = local(0, -0.45);
  ctx.cylinder('brass', bellP.x, y + 3.05, bellP.z, 0.18, 0.32, yaw);

  // Brass steam whistle beside cab
  part(0.55, 3.25, 1.35, 0.08, 0.45, 0.08, 'brass');

  // Front glowing locomotive headlight
  part(0, 2.55, -3.45, 0.55, 0.65, 0.5, 'iron');
  part(0, 2.55, -3.72, 0.45, 0.52, 0.06, 'glow');

  // Cab (wooden and iron enclosed cabin)
  part(0, 2.35, 2.5, 2.65, 1.9, 2.3, 'wood');
  part(0, 3.35, 2.5, 2.85, 0.14, 2.5, 'iron'); // cab curved roof
  // Arched side windows (glow accent)
  part(-1.34, 2.45, 2.5, 0.06, 0.65, 0.95, 'glow');
  part(1.34, 2.45, 2.5, 0.06, 0.65, 0.95, 'glow');

  // Walkways along boiler flanks
  part(-1.18, 1.35, -0.6, 0.25, 0.06, 4.4, 'wood');
  part(1.18, 1.35, -0.6, 0.25, 0.06, 4.4, 'wood');

  // Solid locomotive physics collision box
  ctx.box('iron', x, y + 1.8, z, 2.7, 3.6, 7.8, yaw, true);

  // --- 2. COAL TENDER ---
  const tenderOffsetZ = 6.4;
  const tenderCenter = local(0, tenderOffsetZ);
  const ty = ctx.height(tenderCenter.x, tenderCenter.z) ?? y;

  const tlocal = (dx, dz) => local(dx, tenderOffsetZ + dz);
  const tpart = (dx, dy, dz, w, h, d, key = 'iron', coll = false) => {
    const p = tlocal(dx, dz);
    ctx.box(key, p.x, ty + dy, p.z, w, h, d, yaw, coll);
  };

  // Tender underframe and 8 bogie wheels (2 trucks)
  tpart(0, 0.68, 0, 2.5, 0.32, 4.8, 'iron');
  for (const sx of [-1.12, 1.12]) {
    for (const dz of [-1.6, -0.8, 0.8, 1.6]) {
      const p = tlocal(sx, dz);
      const g = new CylinderGeometry(0.42, 0.42, 0.10, 16);
      g.rotateZ(Math.PI / 2);
      ctx.add('iron', g, p.x, ty + 0.46, p.z, yaw);
    }
  }

  // Water tank & coal body
  tpart(0, 1.65, 0, 2.55, 1.6, 4.9, 'iron');
  // Heaped black coal inside tender bunker
  tpart(0, 2.40, -0.3, 2.15, 0.55, 3.2, 'coal');

  // Tender collision
  ctx.box('iron', tenderCenter.x, ty + 1.4, tenderCenter.z, 2.6, 2.6, 5.0, yaw, true);

  // --- 3. PASSENGER COACH ---
  const coachOffsetZ = 14.6;
  const coachCenter = local(0, coachOffsetZ);
  const cy = ctx.height(coachCenter.x, coachCenter.z) ?? y;

  const clocal = (dx, dz) => local(dx, coachOffsetZ + dz);
  const cpart = (dx, dy, dz, w, h, d, key = 'coachWood', coll = false) => {
    const p = clocal(dx, dz);
    ctx.box(key, p.x, cy + dy, p.z, w, h, d, yaw, coll);
  };

  // Coach undercarriage & 8 wheels (2 trucks)
  cpart(0, 0.70, 0, 2.65, 0.32, 10.6, 'iron');
  for (const sx of [-1.15, 1.15]) {
    for (const dz of [-3.8, -2.8, 2.8, 3.8]) {
      const p = clocal(sx, dz);
      const g = new CylinderGeometry(0.45, 0.45, 0.10, 16);
      g.rotateZ(Math.PI / 2);
      ctx.add('iron', g, p.x, cy + 0.48, p.z, yaw);
    }
  }

  // Coach wooden cabin body
  cpart(0, 2.15, 0, 2.7, 2.55, 9.8, 'coachWood');
  // Monitor raised roof
  cpart(0, 3.50, 0, 2.85, 0.22, 10.2, 'wood');
  cpart(0, 3.70, 0, 1.75, 0.22, 8.8, 'iron');

  // Rows of passenger windows (accent panels)
  for (let wi = -4; wi <= 4; wi++) {
    if (wi === 0) continue;
    const wz = wi * 1.05;
    cpart(-1.37, 2.30, wz, 0.05, 0.75, 0.65, 'glow');
    cpart(1.37, 2.30, wz, 0.05, 0.75, 0.65, 'glow');
  }

  // Front and rear vestibule end platforms with iron railings
  for (const ez of [-5.05, 5.05]) {
    cpart(0, 1.02, ez, 2.6, 0.14, 0.95, 'wood');
    // Railings
    cpart(-1.22, 1.55, ez, 0.08, 0.9, 0.95, 'iron');
    cpart(1.22, 1.55, ez, 0.08, 0.9, 0.95, 'iron');
    cpart(0, 1.55, ez + (ez > 0 ? 0.44 : -0.44), 2.5, 0.9, 0.08, 'iron');
  }

  // Coach physics collision
  ctx.box('wood', coachCenter.x, cy + 2.1, coachCenter.z, 2.8, 3.2, 11.0, yaw, true);

  return true;
}

/**
 * Western Concord Passenger Stagecoach
 */
export function buildStagecoach(ctx, { x, z, yaw }) {
  const y = ctx.height(x, z);
  if (y === undefined) return false;

  const local = (dx, dz) => ({
    x: x + dx * Math.cos(yaw) + dz * Math.sin(yaw),
    z: z - dx * Math.sin(yaw) + dz * Math.cos(yaw)
  });

  const part = (dx, dy, dz, w, h, d, key = 'coachWood', coll = false) => {
    const p = local(dx, dz);
    ctx.box(key, p.x, y + dy, p.z, w, h, d, yaw, coll);
  };

  const spokedWheel = (dx, dy, dz, r, spokes = 10) => {
    const p = local(dx, dz);
    // Rim
    const rim = new CylinderGeometry(r, r, 0.08, 16);
    rim.rotateZ(Math.PI / 2);
    ctx.add('iron', rim, p.x, y + dy, p.z, yaw);
    // Hub
    const hub = new CylinderGeometry(0.12, 0.12, 0.18, 8);
    hub.rotateZ(Math.PI / 2);
    ctx.add('wood', hub, p.x, y + dy, p.z, yaw);
    // Spokes
    for (let i = 0; i < spokes / 2; i++) {
      const angle = (i * Math.PI) / (spokes / 2);
      const spoke = new CylinderGeometry(0.025, 0.025, r * 1.85, 4);
      spoke.rotateZ(angle);
      ctx.add('wood', spoke, p.x, y + dy, p.z, yaw);
    }
  };

  // Undercarriage axles & thoroughbraces
  part(0, 0.44, -1.05, 1.85, 0.12, 0.12, 'wood'); // front axle
  part(0, 0.62, 1.05, 1.95, 0.12, 0.12, 'wood'); // rear axle
  part(0, 0.52, 0, 0.16, 0.12, 2.2, 'iron'); // reach pole
  // Leather suspension straps
  part(-0.75, 0.68, 0, 0.10, 0.16, 2.1, 'leather');
  part(0.75, 0.68, 0, 0.10, 0.16, 2.1, 'leather');

  // 4 Spoked wheels (larger in back, smaller in front)
  spokedWheel(-0.95, 0.44, -1.05, 0.44);
  spokedWheel(0.95, 0.44, -1.05, 0.44);
  spokedWheel(-1.02, 0.62, 1.05, 0.62);
  spokedWheel(1.02, 0.62, 1.05, 0.62);

  // Coach cabin body (lacquered red western coach wood)
  part(0, 1.45, 0, 1.55, 1.40, 2.15, 'coachWood');
  // Curved roof
  part(0, 2.20, 0, 1.68, 0.15, 2.25, 'wood');
  // Roof luggage rack rails
  part(0, 2.38, 0, 1.45, 0.22, 1.9, 'iron');
  // Luggage suitcases on roof
  part(-0.25, 2.45, -0.3, 0.65, 0.32, 0.95, 'leather');
  part(0.30, 2.45, 0.35, 0.60, 0.35, 0.85, 'wood');

  // Side doors and windows
  part(-0.79, 1.55, 0, 0.05, 0.55, 0.65, 'glow');
  part(0.79, 1.55, 0, 0.05, 0.55, 0.65, 'glow');
  // Brass door handles
  part(-0.80, 1.25, 0.28, 0.06, 0.08, 0.08, 'brass');
  part(0.80, 1.25, 0.28, 0.06, 0.08, 0.08, 'brass');

  // Front elevated driver's box seat
  part(0, 1.70, -1.35, 1.25, 0.45, 0.65, 'wood');
  part(0, 1.95, -1.30, 1.15, 0.14, 0.45, 'leather'); // seat cushion
  part(0, 1.40, -1.75, 1.20, 0.08, 0.45, 'wood'); // footboard
  part(0.62, 1.75, -1.35, 0.06, 0.65, 0.06, 'iron'); // brake handle

  // Rear luggage boot with leather apron
  part(0, 1.22, 1.35, 1.30, 0.65, 0.65, 'leather');

  // Wooden hitch tongue / draft pole extending forward
  part(0, 0.45, -2.6, 0.12, 0.12, 2.8, 'wood');

  // Physics collision box
  ctx.box('wood', x, y + 1.25, z, 2.1, 2.4, 3.4, yaw, true);
  return true;
}

/**
 * Heavy Buckboard Freight Wagon / Covered Prairie Schooner Wagon
 */
export function buildFreightWagon(ctx, { x, z, yaw, covered = false }) {
  const y = ctx.height(x, z);
  if (y === undefined) return false;

  const local = (dx, dz) => ({
    x: x + dx * Math.cos(yaw) + dz * Math.sin(yaw),
    z: z - dx * Math.sin(yaw) + dz * Math.cos(yaw)
  });

  const part = (dx, dy, dz, w, h, d, key = 'wood', coll = false) => {
    const p = local(dx, dz);
    ctx.box(key, p.x, y + dy, p.z, w, h, d, yaw, coll);
  };

  const spokedWheel = (dx, dy, dz, r) => {
    const p = local(dx, dz);
    const rim = new CylinderGeometry(r, r, 0.08, 16);
    rim.rotateZ(Math.PI / 2);
    ctx.add('iron', rim, p.x, y + dy, p.z, yaw);
    const hub = new CylinderGeometry(0.11, 0.11, 0.16, 8);
    hub.rotateZ(Math.PI / 2);
    ctx.add('wood', hub, p.x, y + dy, p.z, yaw);
    for (let i = 0; i < 4; i++) {
      const spoke = new CylinderGeometry(0.024, 0.024, r * 1.85, 4);
      spoke.rotateZ((i * Math.PI) / 4);
      ctx.add('wood', spoke, p.x, y + dy, p.z, yaw);
    }
  };

  // 4 Wheels
  spokedWheel(-0.92, 0.45, -1.2, 0.45);
  spokedWheel(0.92, 0.45, -1.2, 0.45);
  spokedWheel(-0.95, 0.60, 1.2, 0.60);
  spokedWheel(0.95, 0.60, 1.2, 0.60);

  // Axles and bed frame
  part(0, 0.45, -1.2, 1.8, 0.14, 0.14, 'wood');
  part(0, 0.60, 1.2, 1.85, 0.14, 0.14, 'wood');
  part(0, 0.72, 0, 1.65, 0.12, 3.6, 'wood'); // bed bottom floor

  // Side stake boards
  part(-0.80, 1.05, 0, 0.08, 0.58, 3.5, 'wood');
  part(0.80, 1.05, 0, 0.08, 0.58, 3.5, 'wood');
  part(0, 1.05, 1.72, 1.62, 0.58, 0.08, 'wood'); // rear tailgate

  // Front seat bench
  part(0, 1.25, -1.45, 1.45, 0.12, 0.45, 'wood');
  part(0, 1.55, -1.25, 1.45, 0.45, 0.08, 'wood'); // backrest
  part(0, 0.95, -1.78, 1.45, 0.08, 0.40, 'wood'); // footrest

  // Hitch tongue pole
  part(0, 0.45, -2.8, 0.12, 0.12, 2.6, 'wood');

  if (covered) {
    // 4 Arched wooden bows with draped canvas cover (Conestoga Prairie Schooner)
    for (let bi = -2; bi <= 2; bi++) {
      const bz = bi * 0.75;
      const arc = new CylinderGeometry(0.85, 0.85, 0.10, 12, 1, true, 0, Math.PI);
      arc.rotateX(Math.PI / 2);
      arc.rotateZ(Math.PI / 2);
      const bp = local(0, bz);
      ctx.add('wood', arc, bp.x, y + 1.85, bp.z, yaw);
    }
    // Curved canvas fabric covering
    const canvas = new CylinderGeometry(0.88, 0.88, 3.4, 16, 1, true, 0, Math.PI);
    canvas.rotateX(Math.PI / 2);
    canvas.rotateZ(Math.PI / 2);
    const cp = local(0, 0);
    ctx.add('cloth', canvas, cp.x, y + 1.88, cp.z, yaw);
  } else {
    // Cargo load inside open wagon bed: barrels, crates, burlap sacks
    const b1 = local(-0.35, -0.4);
    ctx.cylinder('barrel', b1.x, y + 1.15, b1.z, 0.32, 0.85, yaw);
    const b2 = local(0.35, 0.3);
    ctx.cylinder('barrel', b2.x, y + 1.15, b2.z, 0.32, 0.85, yaw);
    part(-0.35, 1.05, 0.8, 0.65, 0.55, 0.75, 'wood'); // cargo crate
    part(0.32, 1.00, -0.7, 0.60, 0.45, 0.65, 'wood'); // cargo crate
    // Grain sack
    const sack = new SphereGeometry(0.32, 7, 5);
    sack.scale(1.1, 0.65, 0.85);
    const sp = local(0.25, 1.05);
    ctx.add('cloth', sack, sp.x, y + 0.95, sp.z, yaw);
  }

  // Physics collision box
  ctx.box('wood', x, y + 1.1, z, 1.9, 2.2, 3.8, yaw, true);
  return true;
}

/**
 * Hitched Western Horse tied to hitching post
 */
export function buildHitchedHorse(ctx, { x, z, yaw, coat = 'bay' }) {
  const y = ctx.height(x, z);
  if (y === undefined) return false;

  const matKey =
    coat === 'chestnut' ? 'horseChestnut' :
    coat === 'black' ? 'horseBlack' :
    coat === 'palomino' ? 'horsePalomino' : 'horseBay';

  const local = (dx, dz) => ({
    x: x + dx * Math.cos(yaw) + dz * Math.sin(yaw),
    z: z - dx * Math.sin(yaw) + dz * Math.cos(yaw)
  });

  const part = (dx, dy, dz, w, h, d, key = matKey) => {
    const p = local(dx, dz);
    ctx.box(key, p.x, y + dy, p.z, w, h, d, yaw);
  };

  // Torso / Barrel Body
  const body = new SphereGeometry(0.52, 9, 7);
  body.scale(0.85, 0.95, 1.75);
  const bp = local(0, 0);
  ctx.add(matKey, body, bp.x, y + 1.35, bp.z, yaw);

  // Muscular Neck (angled upward & forward)
  const neck = new CylinderGeometry(0.24, 0.34, 0.85, 8);
  neck.rotateX(0.72);
  const np = local(0, -0.68);
  ctx.add(matKey, neck, np.x, y + 1.72, np.z, yaw);

  // Horse Head & Muzzle
  const head = new SphereGeometry(0.22, 8, 6);
  head.scale(0.8, 1.1, 1.7);
  const hp = local(0, -1.05);
  ctx.add(matKey, head, hp.x, y + 2.05, hp.z, yaw);

  // Muzzle nose
  part(0, 1.88, -1.25, 0.22, 0.20, 0.28, matKey);

  // Pointed ears
  for (const sx of [-0.12, 0.12]) {
    const ear = new ConeGeometry(0.065, 0.18, 4);
    const ep = local(sx, -0.92);
    ctx.add(matKey, ear, ep.x, y + 2.32, ep.z, yaw);
  }

  // Dark Mane crest along neck
  part(0, 1.95, -0.65, 0.08, 0.55, 0.65, 'iron');

  // 4 Slender legs with hooves
  for (const sx of [-0.26, 0.26]) {
    // Front legs
    ctx.cylinder(matKey, local(sx, -0.52).x, y + 0.68, local(sx, -0.52).z, 0.10, 0.85, yaw);
    ctx.cylinder('iron', local(sx, -0.52).x, y + 0.10, local(sx, -0.52).z, 0.11, 0.18, yaw); // hoof
    // Rear legs
    ctx.cylinder(matKey, local(sx, 0.58).x, y + 0.68, local(sx, 0.58).z, 0.12, 0.85, yaw);
    ctx.cylinder('iron', local(sx, 0.58).x, y + 0.10, local(sx, 0.58).z, 0.11, 0.18, yaw); // hoof
  }

  // Sweeping tail
  const tail = new ConeGeometry(0.12, 0.85, 6);
  tail.rotateX(-0.35);
  const tp = local(0, 0.95);
  ctx.add('iron', tail, tp.x, y + 1.15, tp.z, yaw);

  // Saddle Blanket
  part(0, 1.48, 0, 0.72, 0.08, 0.85, 'cloth');
  // Western Leather Saddle & Horn
  part(0, 1.54, 0, 0.62, 0.12, 0.72, 'leather');
  part(0, 1.68, -0.24, 0.10, 0.16, 0.10, 'brass'); // saddle horn
  part(0, 1.65, 0.28, 0.45, 0.16, 0.10, 'leather'); // high cantle
  // Stirrups
  for (const sx of [-0.34, 0.34]) {
    part(sx, 1.05, 0, 0.06, 0.55, 0.08, 'leather'); // stirrup strap
    part(sx, 0.76, 0, 0.12, 0.06, 0.12, 'brass'); // stirrup ring
  }

  // Bridle & Reins extending forward to hitch rail
  part(0, 2.05, -1.05, 0.26, 0.26, 0.12, 'leather');
  part(0, 1.65, -1.65, 0.05, 0.05, 1.1, 'leather'); // reins tied to hitch

  // Soft collision radius around horse
  ctx.box('wood', x, y + 1.0, z, 1.0, 1.8, 2.2, yaw, true);
  return true;
}

/**
 * Town Dog (Coonhound / Cattle Shepherd) in resting or sitting poses
 */
export function buildStreetDog(ctx, { x, z, yaw, pose = 'sitting' }) {
  const y = ctx.height(x, z);
  if (y === undefined) return false;

  const local = (dx, dz) => ({
    x: x + dx * Math.cos(yaw) + dz * Math.sin(yaw),
    z: z - dx * Math.sin(yaw) + dz * Math.cos(yaw)
  });

  const part = (dx, dy, dz, w, h, d, key = 'dogFur') => {
    const p = local(dx, dz);
    ctx.box(key, p.x, y + dy, p.z, w, h, d, yaw);
  };

  if (pose === 'sleeping') {
    // Dog curled up asleep on porch boardwalk
    const body = new SphereGeometry(0.24, 8, 6);
    body.scale(1.2, 0.75, 1.0);
    const bp = local(0, 0);
    ctx.add('dogFur', body, bp.x, y + 0.14, bp.z, yaw);

    // Resting head
    const head = new SphereGeometry(0.14, 7, 5);
    head.scale(1.1, 0.8, 1.3);
    const hp = local(0.18, -0.16);
    ctx.add('dogFur', head, hp.x, y + 0.12, hp.z, yaw + 0.45);

    // Floppy ears
    part(0.28, 0.09, -0.16, 0.08, 0.04, 0.14, 'dogFur');
    // Curled tail
    part(-0.22, 0.08, 0.14, 0.16, 0.05, 0.10, 'dogFur');
  } else {
    // Dog sitting alert on haunches
    // Rear body haunches resting on ground
    const haunches = new SphereGeometry(0.22, 8, 6);
    haunches.scale(0.9, 0.85, 1.1);
    const hp = local(0, 0.15);
    ctx.add('dogFur', haunches, hp.x, y + 0.18, hp.z, yaw);

    // Chest / upright torso
    const chest = new CylinderGeometry(0.16, 0.20, 0.42, 8);
    chest.rotateX(0.22);
    const cp = local(0, -0.08);
    ctx.add('dogFur', chest, cp.x, y + 0.42, cp.z, yaw);

    // Front straight legs
    for (const sx of [-0.10, 0.10]) {
      ctx.cylinder('dogFur', local(sx, -0.18).x, y + 0.22, local(sx, -0.18).z, 0.045, 0.42, yaw);
    }

    // Alert head looking forward
    const head = new SphereGeometry(0.13, 8, 6);
    head.scale(0.85, 1.0, 1.35);
    const hdp = local(0, -0.14);
    ctx.add('dogFur', head, hdp.x, y + 0.65, hdp.z, yaw);

    // Muzzle & dark nose
    part(0, 0.58, -0.28, 0.10, 0.09, 0.14, 'dogFur');
    part(0, 0.62, -0.34, 0.04, 0.04, 0.04, 'iron');

    // Floppy hound ears
    for (const sx of [-0.13, 0.13]) {
      part(sx, 0.62, -0.12, 0.05, 0.16, 0.08, 'dogFur');
    }

    // Tail resting on ground
    part(0, 0.06, 0.30, 0.06, 0.06, 0.32, 'dogFur');
  }

  return true;
}

/**
 * Farm Chicken (pecking, scratching, or perched in coop)
 */
export function buildChicken(ctx, { x, z, yaw, perchedY = null }) {
  const y = perchedY ?? ctx.height(x, z);
  if (y === undefined) return false;

  const local = (dx, dz) => ({
    x: x + dx * Math.cos(yaw) + dz * Math.sin(yaw),
    z: z - dx * Math.sin(yaw) + dz * Math.cos(yaw)
  });

  const part = (dx, dy, dz, w, h, d, key = 'chicken') => {
    const p = local(dx, dz);
    ctx.box(key, p.x, y + dy, p.z, w, h, d, yaw);
  };

  // Plump rounded feathered body
  const body = new SphereGeometry(0.16, 7, 5);
  body.scale(0.85, 0.95, 1.25);
  const bp = local(0, 0);
  ctx.add('chicken', body, bp.x, y + 0.22, bp.z, yaw);

  // Upright tail fan feathers
  const tail = new ConeGeometry(0.11, 0.24, 4);
  tail.rotateX(-0.75);
  const tp = local(0, 0.18);
  ctx.add('chicken', tail, tp.x, y + 0.32, tp.z, yaw);

  // Neck and head
  const head = new SphereGeometry(0.085, 6, 5);
  const hp = local(0, -0.15);
  ctx.add('chicken', head, hp.x, y + 0.35, hp.z, yaw);

  // Bright red crown comb (Kamm)
  part(0, 0.44, -0.15, 0.03, 0.08, 0.12, 'comb');
  // Red wattle under chin
  part(0, 0.28, -0.18, 0.03, 0.06, 0.05, 'comb');

  // Yellow beak
  const beak = new ConeGeometry(0.035, 0.08, 4);
  beak.rotateX(Math.PI / 2);
  const bkp = local(0, -0.24);
  ctx.add('brass', beak, bkp.x, y + 0.33, bkp.z, yaw);

  // Thin yellow legs down to dirt (if not perched)
  if (!perchedY) {
    for (const sx of [-0.05, 0.05]) {
      ctx.cylinder('brass', local(sx, 0).x, y + 0.08, local(sx, 0).z, 0.018, 0.16, yaw);
    }
  }

  return true;
}
