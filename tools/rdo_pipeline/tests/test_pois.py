from __future__ import annotations

import json
from pathlib import Path

from rdo_pipeline.pois import validate_pois


def test_poi_validator_rejects_missing_manifest_reference_and_invalid_radius(tmp_path: Path) -> None:
    runtime = tmp_path / 'runtime'
    runtime.mkdir()
    (runtime / 'rdo_world_manifest.json').write_text(json.dumps({'version': 1, 'world': 'valentine', 'placements': [
        {'id': 'valentine:hotel', 'asset': 'models/valentine/hotel.glb', 'position': {'x': 1, 'y': 2, 'z': 3}, 'rotation': {'x': 0, 'y': 0, 'z': 0}, 'scale': {'x': 1, 'y': 1, 'z': 1}, 'layer': 'buildings', 'chunkId': '0:0', 'lod': 0},
    ]}), encoding='utf-8')
    (runtime / 'pois.json').write_text(json.dumps([
        {'id': 'missing', 'name': 'Missing', 'manifestRef': 'valentine:nope', 'position': {'x': 0, 'y': 0, 'z': 0}, 'radius': 2, 'category': 'shop'},
        {'id': 'bad-radius', 'name': 'Bad', 'manifestRef': 'valentine:hotel', 'position': {'x': 0, 'y': 0, 'z': 0}, 'radius': 0, 'category': 'shop'},
    ]), encoding='utf-8')

    report = validate_pois(runtime)

    assert report.valid is False
    assert report.errors == ('POI_MANIFEST_REF_MISSING', 'POI_RADIUS_INVALID')
