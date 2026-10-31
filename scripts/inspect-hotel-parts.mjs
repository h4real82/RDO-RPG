import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const root = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(await import('node:fs').then(fs => fs.realpathSync(resolve(root, 'node_modules/@gltf-transform/cli/package.json'))));
const { Document, NodeIO } = require('@gltf-transform/core');
const io = new NodeIO();

async function inspectNodes() {
  const bytes = await readFile(resolve(root, 'data/runtime/interiors/hotel/Hotel_Lobby_woman.glb'));
  const doc = await io.readBinary(bytes);
  const rootObj = doc.getRoot();

  console.log('Nodes count:', rootObj.listNodes().length);
  const parts = [];
  for (const node of rootObj.listNodes()) {
    const mesh = node.getMesh();
    if (!mesh) continue;
    let triCount = 0;
    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
    for (const prim of mesh.listPrimitives()) {
      const pos = prim.getAttribute('POSITION');
      if (pos) {
        triCount += prim.getIndices() ? prim.getIndices().getCount() / 3 : pos.getCount() / 3;
        const arr = pos.getArray();
        for (let i = 0; i < arr.length; i += 3) {
          const x = arr[i], y = arr[i+1], z = arr[i+2];
          if (x < minX) minX = x; if (x > maxX) maxX = x;
          if (y < minY) minY = y; if (y > maxY) maxY = y;
          if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
        }
      }
    }
    parts.push({
      name: node.getName(),
      mesh: mesh.getName(),
      triangles: Math.round(triCount),
      boundsY: [minY.toFixed(2), maxY.toFixed(2)],
      height: (maxY - minY).toFixed(2),
      center: [((minX + maxX)/2).toFixed(2), ((minY + maxY)/2).toFixed(2), ((minZ + maxZ)/2).toFixed(2)]
    });
  }

  // Sort by Y center
  parts.sort((a,b) => b.center[1] - a.center[1]);
  console.log('Top parts by elevation (likely head/hat/upper body):');
  console.log(parts.slice(0, 15));
  console.log('Bottom parts by elevation (likely chair legs/base):');
  console.log(parts.slice(-15));
}

inspectNodes().catch(console.error);
