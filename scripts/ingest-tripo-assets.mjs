import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import fs from 'node:fs';

const root = fileURLToPath(new URL('../', import.meta.url));
const real = fs.realpathSync(resolve(root, 'node_modules/@gltf-transform/cli/package.json'));
const require = createRequire(real);
const { Document, NodeIO } = require('@gltf-transform/core');
const { prune, dedup, weld, resample, compactPrimitive } = require('@gltf-transform/functions');
const { MeshoptSimplifier } = require('meshoptimizer');
const sharp = require('sharp');

const io = new NodeIO();

export async function optimizeModel(srcPath, destPath, options = {}) {
  const { maxTexSize = 2048, targetTriangles = 45000 } = options;
  console.log(`\n=== Processing: ${basename(srcPath)} ===`);
  console.log(`Source: ${srcPath}`);
  console.log(`Target: ${destPath}`);

  await mkdir(dirname(destPath), { recursive: true });

  const bytes = await readFile(srcPath);
  const doc = await io.readBinary(bytes);

  // 1. Textures
  for (const tex of doc.getRoot().listTextures()) {
    const imgBuf = tex.getImage();
    if (imgBuf && imgBuf.byteLength > 1024 * 1024) {
      try {
        const resized = await sharp(Buffer.from(imgBuf))
          .resize({ width: maxTexSize, height: maxTexSize, fit: 'inside', withoutEnlargement: true })
          .jpeg({ quality: 85 })
          .toBuffer();
        tex.setImage(resized);
        tex.setMimeType('image/jpeg');
        console.log(`Resized texture ${tex.getName() || 'unnamed'} -> ${(resized.byteLength / 1024 / 1024).toFixed(2)} MB`);
      } catch (err) {
        console.warn(`Could not resize texture: ${err.message}`);
      }
    }
  }

  // 2. glTF cleanup
  await doc.transform(
    prune(),
    dedup(),
    weld({ tolerance: 0.0001 }),
    resample()
  );

  // 3. Geometry decimation
  await MeshoptSimplifier.ready;
  for (const mesh of doc.getRoot().listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      const pos = prim.getAttribute('POSITION');
      const indices = prim.getIndices();
      if (!pos || !indices) continue;

      let posArr = pos.getArray();
      if (!(posArr instanceof Float32Array)) posArr = new Float32Array(posArr);
      let indArr = indices.getArray();
      if (!(indArr instanceof Uint32Array)) indArr = new Uint32Array(indArr);

      const srcTris = indArr.length / 3;
      if (srcTris > targetTriangles) {
        const targetCount = targetTriangles * 3;
        try {
          const [dst] = MeshoptSimplifier.simplifySloppy(indArr, posArr, 3, null, targetCount, 0.05);
          if (dst && dst.length > 0 && dst.length < indArr.length) {
            indices.setArray(dst);
            compactPrimitive(prim);
            console.log(`Decimated primitive: ${srcTris} -> ${dst.length / 3} triangles`);
          }
        } catch (e) {
          console.warn(`Decimation error: ${e.message}`);
        }
      }
    }
  }

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

  const outBytes = await io.writeBinary(doc);
  await writeFile(destPath, outBytes);
  console.log(`Saved: ${destPath} (${Math.round(totalTriangles)} tris, ${(outBytes.byteLength / 1024 / 1024).toFixed(2)} MB)`);
}

async function main() {
  const tasks = [
    // Animals
    { src: 'D:\\Projects\\RDO-RPG\\data\\runtime\\Animals\\wolf 3d model.glb', dest: resolve(root, 'data/runtime/tripo/animals/wolf.glb'), targetTriangles: 35000 },
    { src: 'D:\\Projects\\RDO-RPG\\data\\runtime\\Animals\\Male elk 3d model.glb', dest: resolve(root, 'data/runtime/tripo/animals/elk.glb'), targetTriangles: 45000 },
    { src: 'D:\\Projects\\RDO-RPG\\data\\runtime\\Animals\\horse 3d model.glb', dest: resolve(root, 'data/runtime/tripo/animals/horse.glb'), targetTriangles: 45000 },
    { src: 'D:\\Projects\\RDO-RPG\\data\\runtime\\Animals\\doberman dog 3d model.glb', dest: resolve(root, 'data/runtime/tripo/animals/doberman-dog.glb'), targetTriangles: 40000 },
    { src: 'D:\\Projects\\RDO-RPG\\data\\runtime\\Animals\\fluffy dog 3d model.glb', dest: resolve(root, 'data/runtime/tripo/animals/fluffy-dog.glb'), targetTriangles: 40000 },
    { src: 'D:\\Projects\\RDO-RPG\\data\\runtime\\Animals\\domestic cat 3d model.glb', dest: resolve(root, 'data/runtime/tripo/animals/domestic-cat.glb'), targetTriangles: 30000 },
    { src: 'D:\\Projects\\RDO-RPG\\data\\runtime\\Animals\\hedgehog 3d model.glb', dest: resolve(root, 'data/runtime/tripo/animals/hedgehog.glb'), targetTriangles: 25000 },

    // NPCs
    { src: 'D:\\Projects\\RDO-RPG\\data\\runtime\\NPC\\fantasy gunslinger 3d model.glb', dest: resolve(root, 'data/runtime/tripo/characters/gunslinger.glb'), targetTriangles: 48000 },
    { src: 'D:\\Projects\\RDO-RPG\\data\\runtime\\NPC\\thai waitress 3d model.glb', dest: resolve(root, 'data/runtime/tripo/characters/waitress.glb'), targetTriangles: 48000 },
    { src: 'D:\\Projects\\RDO-RPG\\data\\runtime\\NPC\\female archer 3d model.glb', dest: resolve(root, 'data/runtime/tripo/characters/archer.glb'), targetTriangles: 48000 },
    { src: 'D:\\Projects\\RDO-RPG\\data\\runtime\\NPC\\steampunk masked figure 3d model.glb', dest: resolve(root, 'data/runtime/tripo/characters/masked-outlaw.glb'), targetTriangles: 40000 },
    { src: 'D:\\Projects\\RDO-RPG\\data\\runtime\\NPC\\tribal shaman 3d model.glb', dest: resolve(root, 'data/runtime/tripo/characters/shaman.glb'), targetTriangles: 48000 }
  ];

  for (const t of tasks) {
    if (fs.existsSync(t.src)) {
      try {
        await optimizeModel(t.src, t.dest, { targetTriangles: t.targetTriangles });
      } catch (e) {
        console.error(`Error processing ${t.src}:`, e);
      }
    } else {
      console.log(`Skipping (not found): ${t.src}`);
    }
  }
}

main().catch(console.error);
