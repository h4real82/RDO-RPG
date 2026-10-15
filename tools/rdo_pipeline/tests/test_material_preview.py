import json
import struct
from hashlib import sha256

import pytest


def glb(textured=True, shader=None):
    payload = {'asset': {'version': '2.0'}, 'materials': [
        {'extras': {'rdo_material_status': 'diffuse-only', 'rdo_shader_hash': shader},
         'pbrMetallicRoughness': {'baseColorTexture': {'index': 0}}},
    ] if textured else []}
    chunk = json.dumps(payload).encode()
    chunk += b' ' * (-len(chunk) % 4)
    return struct.pack('<III', 0x46546c67, 2, 20 + len(chunk)) + struct.pack('<II', len(chunk), 0x4e4f534a) + chunk


def test_promotion_keeps_placements_and_untextured_assets_and_records_recovery(tmp_path):
    from rdo_pipeline.material_preview import apply_material_preview
    runtime, staged = tmp_path / 'runtime', tmp_path / 'staged'
    models = runtime / 'models' / 'valentine'
    models.mkdir(parents=True)
    staged.mkdir()
    old = glb(False)
    for name in ['saloon', 'terrain']:
        (models / f'{name}.glb').write_bytes(old)
    manifest = {'placements': [
        {'asset': 'models/valentine/saloon.glb', 'layer': 'buildings'},
        {'asset': 'models/valentine/terrain.glb', 'layer': 'terrain'},
    ]}
    manifest_bytes = json.dumps(manifest).encode()
    (runtime / 'rdo_world_manifest.json').write_bytes(manifest_bytes)
    (runtime / 'provenance.json').write_text(json.dumps({'placementInputs': [{'sha256': 'original'}], 'assets': []}))
    (staged / 'saloon.glb').write_bytes(glb())
    (staged / 'terrain.glb').write_bytes(glb())

    report = apply_material_preview(staged, runtime)

    assert (models / 'saloon.glb').read_bytes() == glb()
    assert (models / 'terrain.glb').read_bytes() == old
    assert (runtime / 'rdo_world_manifest.json').read_bytes() == manifest_bytes
    assert report['promotedModelCount'] == 1
    item = report['assets'][0]
    assert (runtime / item['backup']).read_bytes() == old
    assert item['sha256'] == sha256(glb()).hexdigest()
    provenance = json.loads((runtime / 'provenance.json').read_text())
    assert provenance['placementInputs'] == [{'sha256': 'original'}]
    assert next(a for a in provenance['assets'] if a['path'].endswith('saloon.glb'))['sha256'] == item['sha256']
    assert apply_material_preview(staged, runtime)['promotedModelCount'] == 0


def test_invalid_staged_glb_cannot_partially_replace_runtime(tmp_path):
    from rdo_pipeline.material_preview import apply_material_preview
    runtime, staged = tmp_path / 'runtime', tmp_path / 'staged'
    models = runtime / 'models' / 'valentine'
    models.mkdir(parents=True)
    staged.mkdir()
    for name in ['a', 'b']:
        (models / f'{name}.glb').write_bytes(glb(False))
    (runtime / 'rdo_world_manifest.json').write_text(json.dumps({'placements': [
        {'asset': f'models/valentine/{name}.glb', 'layer': 'buildings'} for name in ['a', 'b']
    ]}))
    (staged / 'a.glb').write_bytes(glb())
    (staged / 'b.glb').write_bytes(b'broken')
    with pytest.raises(ValueError, match='GLB'):
        apply_material_preview(staged, runtime)
    assert (models / 'a.glb').read_bytes() == glb(False)


def test_gbuffer_road_decal_is_not_promoted_as_diffuse_surface(tmp_path):
    from rdo_pipeline.material_preview import apply_material_preview
    runtime, staged = tmp_path / 'runtime', tmp_path / 'staged'
    models = runtime / 'models' / 'valentine'
    models.mkdir(parents=True)
    staged.mkdir()
    (models / 'road.glb').write_bytes(glb(False))
    (staged / 'road.glb').write_bytes(glb(shader='0xec8e6107'))
    (runtime / 'rdo_world_manifest.json').write_text(json.dumps({'placements': [
        {'asset': 'models/valentine/road.glb', 'layer': 'buildings'},
    ]}))
    assert apply_material_preview(staged, runtime)['promotedModelCount'] == 0
    assert (models / 'road.glb').read_bytes() == glb(False)


def terrain_fixture(tmp_path, texture_name='ground.png'):
    runtime, staged = tmp_path / 'runtime', tmp_path / 'staged'
    target = runtime / 'models/valentine/terrain.glb'
    target.parent.mkdir(parents=True)
    target.write_bytes(glb(False))
    (staged / 'textures').mkdir(parents=True)
    (staged / 'textures/ground.png').write_bytes(b'original-texture')
    extras = {'rdo_material_status': 'terrain-four-layer-preview',
              'rdo_terrain_lookup': texture_name,
              **{f'rdo_terrain_layer{i}': texture_name for i in range(4)}}
    chunk = json.dumps({'asset': {'version': '2.0'}, 'materials': [{'extras': extras}]}).encode()
    chunk += b' ' * (-len(chunk) % 4)
    raw = struct.pack('<5I', 0x46546c67, 2, 20 + len(chunk), len(chunk), 0x4e4f534a) + chunk
    (staged / 'terrain.glb').write_bytes(raw)
    manifest = json.dumps({'placements': [{'asset': 'models/valentine/terrain.glb', 'layer': 'terrain'}]})
    (runtime / 'rdo_world_manifest.json').write_text(manifest)
    return runtime, staged, target, raw, manifest


def test_explicit_terrain_promotion_copies_source_textures_and_keeps_placements(tmp_path):
    from rdo_pipeline.material_preview import apply_material_preview
    runtime, staged, target, raw, manifest = terrain_fixture(tmp_path)
    report = apply_material_preview(staged, runtime, include_terrain=True)
    assert target.read_bytes() == raw
    assert (runtime / 'textures/terrain/ground.png').read_bytes() == b'original-texture'
    assert (runtime / 'rdo_world_manifest.json').read_text() == manifest
    assert report['assets'][0]['terrainMaterialCount'] == 1
    provenance = json.loads((runtime / 'provenance.json').read_text())
    assert {item['path'] for item in provenance['assets']} == {
        'models/valentine/terrain.glb', 'textures/terrain/ground.png'}
    assert apply_material_preview(staged, runtime, include_terrain=True)['promotedModelCount'] == 0
    assert json.loads((runtime / 'material-preview-report.json').read_text())['promotedModelCount'] == 1


@pytest.mark.parametrize('name', ['missing.png', '../ground.png'])
def test_invalid_terrain_texture_reference_cannot_replace_runtime_model(tmp_path, name):
    from rdo_pipeline.material_preview import apply_material_preview
    runtime, staged, target, _, _ = terrain_fixture(tmp_path, name)
    with pytest.raises(ValueError, match='terrain texture'):
        apply_material_preview(staged, runtime, include_terrain=True)
    assert target.read_bytes() == glb(False)
