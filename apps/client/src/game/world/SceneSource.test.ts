import { expect, it } from 'vitest';
import { SCENE_BASE_URL, sceneAssetUrl, sceneManifestUrl } from './SceneSource';

it('uses one verified manifest and asset root for gameplay and inspector', () => {
  expect(SCENE_BASE_URL).toBe('/runtime/valentine/verified-scene/');
  expect(sceneManifestUrl()).toBe(`${SCENE_BASE_URL}rdo_world_manifest.json`);
  expect(sceneAssetUrl('models/valentine/val_01_trainstn_ext.glb')).toBe(`${SCENE_BASE_URL}models/valentine/val_01_trainstn_ext.glb`);
});

it('rejects external or escaping runtime asset paths', () => {
  for (const invalid of ['../secret', '/outside', 'https://example.org/x', 'models/../other.glb', 'x\\other.glb']) {
    expect(() => sceneAssetUrl(invalid)).toThrow();
  }
});
