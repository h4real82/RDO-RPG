import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import fs from 'node:fs';

const root = fileURLToPath(new URL('../', import.meta.url));
const real = fs.realpathSync(resolve(root, 'node_modules/@gltf-transform/cli/package.json'));
const require = createRequire(real);
const { Document, NodeIO } = require('@gltf-transform/core');
const { prune, compactPrimitive } = require('@gltf-transform/functions');
const { MeshoptSimplifier } = require('meshoptimizer');
const sharp = require('sharp');

const io = new NodeIO();

async function optimizeStatue() {
  const externalSrc = 'D:\\Projects\\RDO-RPG\\data\\runtime\\interiors\\Friedhof\\Buddah_Statue.glb';
  const rawDestDir = resolve(root, 'data/raw/interiors/church');
  const rawBackup = resolve(rawDestDir, 'Buddah_Statue.glb');
  const runtimeDest = resolve(root, 'data/runtime/interiors/church/friedhof-statue.glb');
  const verifiedDest = resolve(root, 'data/runtime/valentine/verified-scene/interiors/church/friedhof-statue.glb');
  const publicDest = resolve(root, 'apps/client/public/models/friedhof-statue.glb');

  await mkdir(rawDestDir, { recursive: true });
  await mkdir(resolve(root, 'data/runtime/interiors/church'), { recursive: true });
  await mkdir(resolve(root, 'data/runtime/valentine/verified-scene/interiors/church'), { recursive: true });
  await mkdir(resolve(root, 'apps/client/public/models'), { recursive: true });

  let src = externalSrc;
  if (!fs.existsSync(src)) {
    if (fs.existsSync(rawBackup)) {
      src = rawBackup;
      console.log(`Using existing raw backup: ${src}`);
    } else {
      throw new Error(`Statue source not found: ${src}`);
    }
  } else {
    if (!fs.existsSync(rawBackup)) {
      console.log(`Backing up raw statue to ${rawBackup}...`);
      fs.copyFileSync(src, rawBackup);
    }
  }

  console.log(`Reading source GLB: ${src}...`);
  const bytes = await readFile(src);
  const doc = await io.readBinary(bytes);

  const prim = doc.getRoot().listMeshes()[0].listPrimitives()[0];
  let pos = prim.getAttribute('POSITION').getArray();
  if (!(pos instanceof Float32Array)) pos = new Float32Array(pos);
  let indices = prim.getIndices().getArray();
  if (!(indices instanceof Uint32Array)) indices = new Uint32Array(indices);

  const origTriangles = indices.length / 3;
  console.log(`Source geometry: ${indices.length} indices, ${origTriangles} triangles`);

  // 1. Meshopt Sloppy decimation to ~42,000 triangles
  await MeshoptSimplifier.ready;
  const targetTriangles = 42000;
  const targetCount = targetTriangles * 3;
  const [dstIndices, error] = MeshoptSimplifier.simplifySloppy(
    indices,
    pos,
    3,
    null,
    targetCount,
    0.05
  );

  console.log(`Decimated to ${dstIndices.length / 3} triangles (error: ${error.toFixed(4)})`);
  prim.getIndices().setArray(dstIndices);
  compactPrimitive(prim);
  await doc.transform(prune());

  // 2. Generate smooth cylindrical UVs (wrapping texture around the statue)
  const compactedPos = prim.getAttribute('POSITION');
  const compactedPosArray = compactedPos.getArray();
  const vertexCount = compactedPos.getCount();
  const uvArray = new Float32Array(vertexCount * 2);

  let min = [Infinity, Infinity, Infinity];
  let max = [-Infinity, -Infinity, -Infinity];

  for (let i = 0; i < vertexCount; i++) {
    const x = compactedPosArray[i * 3];
    const y = compactedPosArray[i * 3 + 1];
    const z = compactedPosArray[i * 3 + 2];

    min[0] = Math.min(min[0], x);
    min[1] = Math.min(min[1], y);
    min[2] = Math.min(min[2], z);
    max[0] = Math.max(max[0], x);
    max[1] = Math.max(max[1], y);
    max[2] = Math.max(max[2], z);

    // Cylindrical coordinates
    const angle = Math.atan2(x, z); // [-PI, PI]
    const u = (angle / (2 * Math.PI)) + 0.5;
    const v = y * 2.0;

    uvArray[i * 2] = u;
    uvArray[i * 2 + 1] = v;
  }

  const uvAccessor = doc.createAccessor('UV_Cylindrical')
    .setType('VEC2')
    .setArray(uvArray);
  prim.setAttribute('TEXCOORD_0', uvAccessor);

  console.log(`Natural bounds: min=[${min.map(n => n.toFixed(2)).join(', ')}], max=[${max.map(n => n.toFixed(2)).join(', ')}]`);
  console.log(`Generated TEXCOORD_0 for ${vertexCount} vertices.`);

  // 3. Create authentic weathered stone material and embed texture
  const stoneTexSrc = resolve(root, 'data/runtime/valentine/verified-scene/textures/terrain/hea_dirt_stones_je_02_abte.png');
  let stoneJpegBuf;
  if (fs.existsSync(stoneTexSrc)) {
    console.log(`Processing stone texture: ${stoneTexSrc}...`);
    stoneJpegBuf = await sharp(stoneTexSrc)
      .resize({ width: 1024, height: 1024, fit: 'inside' })
      .jpeg({ quality: 85 })
      .toBuffer();
  } else {
    console.log('Stone texture not found, creating synthetic stone base...');
    stoneJpegBuf = await sharp({
      create: {
        width: 512,
        height: 512,
        channels: 3,
        background: { r: 140, g: 135, b: 125 }
      }
    }).jpeg().toBuffer();
  }

  const stoneTex = doc.createTexture('val_cemetery_statue_stone')
    .setMimeType('image/jpeg')
    .setImage(stoneJpegBuf);

  const stoneMat = doc.createMaterial('Material_Cemetery_Statue')
    .setRoughnessFactor(0.88)
    .setMetallicFactor(0.04)
    .setBaseColorFactor([0.9, 0.88, 0.84, 1.0])
    .setBaseColorTexture(stoneTex);

  prim.setMaterial(stoneMat);

  const outBytes = await io.writeBinary(doc);
  await writeFile(runtimeDest, outBytes);
  await writeFile(verifiedDest, outBytes);
  await writeFile(publicDest, outBytes);

  console.log(`Saved optimized runtime GLB:`);
  console.log(` - ${runtimeDest} (${(outBytes.byteLength / 1024 / 1024).toFixed(2)} MB)`);
  console.log(` - ${verifiedDest}`);
  console.log(` - ${publicDest}`);
}

optimizeStatue().catch(console.error);
