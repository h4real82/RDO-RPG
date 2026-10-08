import { createRequire } from 'node:module';
import { realpathSync } from 'node:fs';
import { mkdir, readdir, stat } from 'node:fs/promises';
import { resolve, join, basename, relative, isAbsolute } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// Reuse the repository's pinned glTF Transform CLI dependency tree.
const require = createRequire(realpathSync(new URL('../node_modules/@gltf-transform/cli/package.json', import.meta.url)));
const { NodeIO } = require('@gltf-transform/core');
const previewStatuses = new Set(['diffuse-only', 'missing-texture', 'ambiguous-texture', 'unsupported-diffuse-binding']);

export function stripPreviewMasks(document) {
  const root = document.getRoot();
  const removed = new Set();
  for (const mesh of root.listMeshes()) {
    for (const primitive of mesh.listPrimitives()) {
      if (!previewStatuses.has(primitive.getMaterial()?.getExtras().rdo_material_status)) continue;
      for (const semantic of primitive.listSemantics()) {
        if (!/^COLOR_\d+$/.test(semantic)) continue;
        removed.add(primitive.getAttribute(semantic));
        primitive.setAttribute(semantic, null);
      }
    }
  }
  let bytes = 0;
  for (const accessor of removed) {
    if (accessor.listParents().some(parent => parent !== root)) continue;
    bytes += accessor.getArray().byteLength;
    accessor.dispose();
  }
  return bytes;
}

async function main() {
  const [inputArg, outputArg] = process.argv.slice(2);
  if (!inputArg || !outputArg) throw new Error('Usage: node scripts/strip-preview-masks.mjs INPUT OUTPUT');
  const input = resolve(inputArg), output = resolve(outputArg);
  const runtime = fileURLToPath(new URL('../data/runtime/', import.meta.url));
  const within = relative(runtime, output);
  if (within.startsWith('..') || isAbsolute(within) || input === output) throw new Error('Use a separate output within data/runtime.');
  const directory = (await stat(input)).isDirectory();
  const files = directory ? (await readdir(input)).filter(name => name.endsWith('.glb')).sort().map(name => join(input,name)) : [input];
  const io = new NodeIO();
  let removedBytes = 0;
  for (const file of files) {
    const destination = directory ? join(output,basename(file)) : output;
    await mkdir(resolve(destination,'..'), {recursive:true});
    const document = await io.read(file);
    removedBytes += stripPreviewMasks(document);
    await io.write(destination,document);
  }
  console.log(JSON.stringify({models:files.length, removedAttributeBytes:removedBytes}));
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) await main();
