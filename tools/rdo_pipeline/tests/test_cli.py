from pathlib import Path

import pytest

from rdo_pipeline.cli import approved_runtime_root, load_placements


def test_cli_rejects_runtime_output_outside_repository_runtime_directory(tmp_path: Path) -> None:
    with pytest.raises(ValueError, match='data/runtime'):
        approved_runtime_root(tmp_path)


def test_cli_adapts_an_rdo_entity_export_and_reports_unresolved_models(tmp_path: Path) -> None:
    placements = tmp_path / 'placements.json'
    placements.write_text('{"entities":[{"modelName":"0x7fb016f7","position":[1,2,3],"rotation":[0,0,0,1],"scale":[1,1,1],"sourceFile":"station.xml"}]}', encoding='utf-8')

    adapted, missing = load_placements(placements, {'val_trainstn_int_em_hd'})

    assert adapted[0]['asset'] == 'models/valentine/val_trainstn_int_em_hd.glb'
    assert missing == ()
