from __future__ import annotations

import json
from pathlib import Path

from rdo_pipeline.validate import validate_runtime


def _runtime(tmp_path: Path, placements: list[dict[str, object]]) -> Path:
    runtime = tmp_path / 'runtime'
    (runtime / 'models' / 'valentine').mkdir(parents=True)
    (runtime / 'models' / 'valentine' / 'saloon.glb').write_bytes(b'glb')
    (runtime / 'rdo_world_manifest.json').write_text(json.dumps({
        'version': 1, 'world': 'valentine', 'placements': placements,
    }), encoding='utf-8')
    return runtime


def _placement() -> dict[str, object]:
    return {
        'id': 'valentine:0001', 'asset': 'models/valentine/saloon.glb',
        'position': {'x': 0.0, 'y': 0.005, 'z': 0.0},
        'rotation': {'x': 0.0, 'y': 0.0, 'z': 0.0},
        'scale': {'x': 1.0, 'y': 1.0, 'z': 1.0},
        'layer': 'buildings', 'chunkId': '0:0', 'lod': 0,
    }


def test_runtime_validator_reports_precise_contract_errors(tmp_path: Path) -> None:
    missing = _placement() | {'asset': 'models/valentine/missing.glb'}
    non_finite = _placement() | {'id': 'valentine:0002', 'position': {'x': float('inf'), 'y': 0.005, 'z': 0.0}}
    invalid_layer = _placement() | {'id': 'valentine:0003', 'layer': 'water'}
    wrong_chunk = _placement() | {'id': 'valentine:0004', 'chunkId': '9:9'}

    report = validate_runtime(_runtime(tmp_path, [missing, non_finite, invalid_layer, wrong_chunk]))

    assert report.valid is False
    assert report.errors == ('ASSET_MISSING', 'POSITION_NON_FINITE', 'LAYER_INVALID', 'CHUNK_MISMATCH')
