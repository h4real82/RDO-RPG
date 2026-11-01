import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import fs from 'node:fs';

const root = fileURLToPath(new URL('../', import.meta.url));
const real = fs.realpathSync(resolve(root, 'node_modules/@gltf-transform/cli/package.json'));
const require = createRequire(real);
const { Document, NodeIO } = require('@gltf-transform/core');
const { prune, dedup, weld, simplify, resample } = require('@gltf-transform/functions');
const { MeshoptSimplifier } = require('meshoptimizer');
const sharp = require('sharp');

const io = new NodeIO();

async function optimizeModel() {
  const src = resolve(root, 'data/runtime/interiors/hotel/Hotel_Lobby_woman.glb');
  const rawDest = resolve(root, 'data/raw/interiors/hotel/Hotel_Lobby_woman.glb');
  const runtimeDest = resolve(root, 'data/runtime/interiors/hotel/hotel-lobby-woman.glb');
  const verifiedDest = resolve(root, 'data/runtime/valentine/verified-scene/interiors/hotel/hotel-lobby-woman.glb');

  await mkdir(resolve(root, 'data/raw/interiors/hotel'), { recursive: true });
  if (!fs.existsSync(rawDest)) {
    fs.copyFileSync(src, rawDest);
    console.log('Backed up raw asset to data/raw/interiors/hotel/');
  }

  console.log('Reading source GLB...');
  const bytes = await readFile(src);
  const doc = await io.readBinary(bytes);

  console.log('Optimizing textures with sharp (resizing to 2048x2048, Q=85)...');
  for (const tex of doc.getRoot().listTextures()) {
    const imgBuf = tex.getImage();
    if (imgBuf && imgBuf.byteLength > 2 * 1024 * 1024) {
      console.log(`Resizing texture ${tex.getName()} (${(imgBuf.byteLength / 1024 / 1024).toFixed(1)} MB)...`);
      const resized = await sharp(Buffer.from(imgBuf))
        .resize({ width: 2048, height: 2048, fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 85 })
        .toBuffer();
      tex.setImage(resized);
      tex.setMimeType('image/jpeg');
      console.log(` -> Resized to ${(resized.byteLength / 1024 / 1024).toFixed(2)} MB`);
    }
  }

  console.log('Running glTF transforms: prune, dedup, weld...');
  await doc.transform(
    prune(),
    dedup(),
    weld({ tolerance: 0.0001 }),
    resample()
  );

  console.log('Simplifying geometry with Meshopt (target 10-15% of 1.6M)...');
  await MeshoptSimplifier.ready;
  await doc.transform(
    simplify({
      simplifier: MeshoptSimplifier,
      ratio: 0.12,
      error: 0.002
    })
  );

  await doc.transform(prune());

  let totalTriangles = 0;
  for (const mesh of doc.getRoot().listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      const pos = prim.getAttribute('POSITION');
      if (pos) {
        totalTriangles += prim.getIndices() ? prim.getIndices().getCount() / 3 : pos.getCount() / 3;
      }
    }
  }
  console.log('Optimized Total Triangles:', Math.round(totalTriangles));

  const outBytes = await io.writeBinary(doc);
  await writeFile(runtimeDest, outBytes);
  await mkdir(resolve(root, 'data/runtime/valentine/verified-scene/interiors/hotel'), { recursive: true });
  await writeFile(verifiedDest, outBytes);
  console.log(`Saved optimized runtime GLB: ${runtimeDest} & ${verifiedDest} (${(outBytes.byteLength / 1024 / 1024).toFixed(2)} MB)`);
}

optimizeModel().catch(console.error);

