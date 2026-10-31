import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const root = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(await import('node:fs').then(fs => fs.realpathSync(resolve(root, 'node_modules/@gltf-transform/cli/package.json'))));
const { Document, NodeIO } = require('@gltf-transform/core');
const io = new NodeIO();

async function inspect() {
  const bytes = await readFile(resolve(root, 'data/runtime/interiors/hotel/Hotel_Lobby_woman.glb'));
  const doc = await io.readBinary(bytes);
  const rootObj = doc.getRoot();

  console.log('Meshes:', rootObj.listMeshes().map(m => m.getName()));
  console.log('Nodes count:', rootObj.listNodes().length);
  console.log('Node names:', rootObj.listNodes().map(n => n.getName()).slice(0, 10));
  console.log('Animations:', rootObj.listAnimations().map(a => a.getName()));
  console.log('Skins:', rootObj.listSkins().map(s => s.getName()));
  console.log('Materials:', rootObj.listMaterials().map(m => m.getName()));
  for (const mat of rootObj.listMaterials()) {
    console.log('Mat details:', mat.getName(), {
      baseColorFactor: mat.getBaseColorFactor(),
      hasBaseColorTex: !!mat.getBaseColorTexture(),
      hasNormalTex: !!mat.getNormalTexture(),
      hasMetallicRoughnessTex: !!mat.getMetallicRoughnessTexture()
    });
  }
  for (const tex of rootObj.listTextures()) {
    console.log('Tex details:', tex.getName(), tex.getMimeType(), 'bytes:', tex.getImage()?.byteLength);
  }
  console.log('Textures count:', rootObj.listTextures().length);

  let totalTriangles = 0;
  for (const mesh of rootObj.listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      const pos = prim.getAttribute('POSITION');
      if (pos) {
        const count = prim.getIndices() ? prim.getIndices().getCount() / 3 : pos.getCount() / 3;
        totalTriangles += count;
      }
    }
  }
  console.log('Total Triangles:', totalTriangles);

  // Check bounding box from position accessors
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  for (const access of rootObj.listAccessors()) {
    if (access.getType() === 'VEC3') {
      const arr = access.getArray();
      if (!arr || arr.length < 3) continue;
      for (let i = 0; i < arr.length; i += 3) {
        const x = arr[i], y = arr[i+1], z = arr[i+2];
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (y < minY) minY = y; if (y > maxY) maxY = y;
        if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
      }
    }
  }
  console.log('Bounding Box:', {
    min: [minX, minY, minZ],
    max: [maxX, maxY, maxZ],
    size: [maxX - minX, maxY - minY, maxZ - minZ]
  });
}

inspect().catch(console.error);
