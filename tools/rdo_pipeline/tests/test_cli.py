from pathlib import Path

import pytest
import json
from rdo_pipeline import cli

from rdo_pipeline.cli import approved_runtime_root, build_coverage_report, load_placements


def test_shader_database_cli_exports_selected_verified_program(tmp_path, monkeypatch):
    import struct
    source = tmp_path / 'shaders.fxdb'
    dxbc = b'DXBC' + bytes(16) + struct.pack('<III', 1, 32, 0)
    name = b'PS_Terrain_Test\0'
    source.write_bytes(b'SGD1' + bytes(4) + bytes([len(name)]) + name +
                       b'\x32' + struct.pack('<I', len(dxbc)) + dxbc)
    runtime = tmp_path / 'runtime'
    monkeypatch.setattr(cli, 'approved_runtime_root', lambda candidate: runtime)
    monkeypatch.setattr('sys.argv', ['rdo-pipeline', 'inspect-shader-database',
                                    '--database', str(source), '--runtime-root', str(runtime),
                                    '--name-filter', 'Terrain'])
    assert cli.main() == 0
    report = json.loads((runtime / 'shader-programs' / 'shader-programs.json').read_text())
    assert report['programCount'] == 1
    assert report['programs'][0]['name'] == 'PS_Terrain_Test'


def test_vertex_color_cli_reports_source_provenance_without_mutating_input(tmp_path, monkeypatch):
    import hashlib
    source = tmp_path / 'empty.ydr.full'
    raw = bytes(112)
    source.write_bytes(raw)
    runtime = tmp_path / 'runtime'
    monkeypatch.setattr(cli, 'approved_runtime_root', lambda candidate: runtime)
    monkeypatch.setattr('sys.argv', ['rdo-pipeline', 'inspect-vertex-colors',
                                   '--drawable', str(source), '--runtime-root', str(runtime)])
    assert cli.main() == 0
    report = json.loads((runtime / 'vertex-colors.json').read_text())
    assert report['sourceSha256'] == hashlib.sha256(raw).hexdigest()
    assert report['sourceFile'] == 'empty.ydr.full'
    assert report['geometries'] == []
    assert source.read_bytes() == raw


def test_add_terrain_tiles_merges_y_map_ground_truth_into_existing_preview(tmp_path, monkeypatch):
    asset_root = tmp_path / 'models'
    asset_root.mkdir()
    (asset_root / 'saloon.glb').write_bytes(b'saloon')
    (asset_root / 'l_09__hd_0_0_-1.glb').write_bytes(b'terrain')
    runtime = tmp_path / 'runtime'
    runtime.mkdir()
    base = {
        'version': 1, 'world': 'valentine', 'placements': [{
            'id': 'saloon', 'asset': 'models/valentine/saloon.glb',
            'position': {'x': -300, 'y': 120, 'z': 750},
            'rotation': {'x': 0, 'y': 0, 'z': 0}, 'scale': {'x': 1, 'y': 1, 'z': 1},
            'layer': 'buildings', 'chunkId': '-2:3', 'lod': 0, 'tags': ['exterior'],
        }],
    }
    (runtime / 'rdo_world_manifest.json').write_text(json.dumps(base), encoding='utf-8')
    ymap = tmp_path / 'l_09__strm_0_ymap.xml'
    ymap.write_text('''<CMapData><entities><Item type="CEntityDef">
      <archetypeName>0x095E97A2</archetypeName><position x="-288" y="800" z="118"/>
      <rotation x="0" y="0" z="0" w="1"/><scaleXY value="1"/><scaleZ value="1"/>
      <lodLevel>LODTYPES_DEPTH_HD</lodLevel>
    </Item></entities></CMapData>''', encoding='utf-8')
    monkeypatch.setattr(cli, 'approved_runtime_root', lambda candidate: runtime)
    monkeypatch.setattr('sys.argv', [
        'rdo-pipeline', 'add-terrain-tiles', '--asset-root', str(asset_root),
        '--ymap', str(ymap), '--model', 'l_09__hd_0_0_-1', '--runtime-root', str(runtime),
    ])

    assert cli.main() == 0

    result = json.loads((runtime / 'rdo_world_manifest.json').read_text())
    assert len(result['placements']) == 2
    tile = next(item for item in result['placements'] if item['layer'] == 'terrain')
    assert tile['asset'] == 'models/valentine/l_09__hd_0_0_-1.glb'
    assert tile['position'] == {'x': -288.0, 'y': 118.0, 'z': -800.0}
    report = json.loads((runtime / 'terrain-placement-report.json').read_text())
    assert report['baseManifestSha256']
    assert report['terrainModelCount'] == 1


def test_export_targets_cli_writes_search_candidates_with_input_provenance(tmp_path, monkeypatch):
    names = tmp_path / 'names'
    names.mkdir()
    (names / 'station.txt').write_text('val_trainstn_int_em_hd\n', encoding='utf-8')
    missing = tmp_path / 'missing.json'
    missing.write_text(json.dumps({'missingModels': ['0x7fb016f7']}), encoding='utf-8')
    runtime = tmp_path / 'runtime'
    monkeypatch.setattr(cli, 'approved_runtime_root', lambda candidate: runtime)
    monkeypatch.setattr('sys.argv', ['rdo-pipeline', 'export-targets', '--missing-models', str(missing),
                                   '--name-database', str(names), '--runtime-root', str(runtime)])
    assert cli.main() == 0
    report = json.loads((runtime / 'export-targets.json').read_text())
    assert report['targets'][0]['candidates'][0]['name'] == 'val_trainstn_int_em_hd'
    assert len(report['missingModelsSha256']) == 64


def test_complete_rebuild_clears_the_previous_missing_model_report(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    assets = tmp_path / 'assets'
    assets.mkdir()
    runtime = tmp_path / 'runtime'
    placements = tmp_path / 'placements.json'
    placements.write_text(json.dumps({'entities': [{'modelName': 'missing'}]}), encoding='utf-8')
    monkeypatch.setattr(cli, 'approved_runtime_root', lambda candidate: runtime)
    monkeypatch.setattr('sys.argv', ['rdo-pipeline', 'build-valentine', '--asset-root', str(assets), '--placements', str(placements), '--runtime-root', str(runtime), '--allow-incomplete'])
    assert cli.main() == 0
    assert json.loads((runtime / 'missing-models.json').read_text())['missingModels'] == ['missing']

    placements.write_text(json.dumps({'entities': []}), encoding='utf-8')
    assert cli.main() == 0
    assert json.loads((runtime / 'missing-models.json').read_text())['missingModels'] == []


def test_cli_rejects_runtime_output_outside_repository_runtime_directory(tmp_path: Path) -> None:
    with pytest.raises(ValueError, match='data/runtime'):
        approved_runtime_root(tmp_path)


def test_cli_adapts_an_rdo_entity_export_and_reports_unresolved_models(tmp_path: Path) -> None:
    placements = tmp_path / 'placements.json'
    placements.write_text('{"entities":[{"modelName":"0x7fb016f7","position":[1,2,3],"rotation":[0,0,0,1],"scale":[1,1,1],"sourceFile":"station.xml"}]}', encoding='utf-8')

    adapted, missing = load_placements(placements, {'val_trainstn_int_em_hd'})

    assert adapted[0]['asset'] == 'models/valentine/val_trainstn_int_em_hd.glb'
    assert missing == ()


def test_coverage_report_counts_entities_instead_of_only_unique_missing_models() -> None:
    payload = {'entities': [
        {'modelName': 'known'}, {'modelName': 'missing'}, {'modelName': 'missing'},
    ]}

    report = build_coverage_report(payload, ({'asset': 'models/valentine/known.glb'},), ('missing',))

    assert report == {
        'version': 1,
        'entityCount': 3,
        'renderableEntityCount': 1,
        'unresolvedEntityCount': 2,
        'uniqueUnresolvedModelCount': 1,
        'missingModels': ['missing'],
    }
