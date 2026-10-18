/** Both gameplay and DEV inspection consume the same promoted manifest. */
export const SCENE_BASE_URL = '/runtime/valentine/verified-scene/';

export function sceneAssetUrl(relative: string): string {
  if (!relative || relative.startsWith('/') || relative.includes('\\') || relative.includes(':')
    || relative.split('/').some((part) => !part || part === '.' || part === '..')) {
    throw new Error('Invalid scene asset path');
  }
  return `${SCENE_BASE_URL}${relative}`;
}

export function sceneManifestUrl(): string { return sceneAssetUrl('rdo_world_manifest.json'); }
