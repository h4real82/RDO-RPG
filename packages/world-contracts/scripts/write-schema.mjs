import { mkdir, writeFile } from 'node:fs/promises';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { worldManifestSchema } from '../dist/manifest.js';

const schema = zodToJsonSchema(worldManifestSchema, {
  name: 'WorldManifest',
  $refStrategy: 'none',
});

await mkdir(new URL('../schema/', import.meta.url), { recursive: true });
await writeFile(
  new URL('../schema/world-manifest.schema.json', import.meta.url),
  `${JSON.stringify(schema, null, 2)}\n`,
  'utf8',
);
