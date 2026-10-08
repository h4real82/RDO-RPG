from pathlib import Path

import pytest

from rdo_pipeline.cli import approved_runtime_root, build_coverage_report, load_placements


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
