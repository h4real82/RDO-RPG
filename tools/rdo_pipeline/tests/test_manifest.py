from __future__ import annotations

from pathlib import Path

import pytest

from rdo_pipeline.inventory import AssetInventory, AssetItem
from rdo_pipeline.manifest import build_manifest, write_runtime_manifest


def _inventory() -> AssetInventory:
    return AssetInventory((AssetItem('models/valentine/saloon.glb', 'model', 'a' * 64),))


def _placement() -> dict[str, object]:
    return {
        'source': 'val_03__ymap.xml',
        'asset': 'models/valentine/saloon.glb',
        'position': {'x': 250.0, 'y': 0.005, 'z': -0.001},
        'rotation': {'x': 0.0, 'y': 0.0, 'z': 0.0},
        'scale': {'x': 1.0, 'y': 1.0, 'z': 1.0},
        'layer': 'buildings',
        'lod': 0,
        'interior': False,
    }


def test_manifest_is_stable_sorted_and_chunked(tmp_path: Path) -> None:
    manifest = build_manifest(_inventory(), [_placement()])

    assert manifest['world'] == 'valentine'
    assert manifest['placements'][0]['chunkId'] == '1:-1'
    assert manifest['placements'][0]['layer'] == 'buildings'
    assert manifest['placements'][0]['id'].startswith('valentine:')

    write_runtime_manifest(manifest, _inventory(), tmp_path)
    assert (tmp_path / 'rdo_world_manifest.json').read_text(encoding='utf-8').endswith('\n')
    assert (tmp_path / 'provenance.json').exists()


def test_manifest_rejects_duplicate_placement_keys() -> None:
    with pytest.raises(ValueError, match='duplicate placement'):
        build_manifest(_inventory(), [_placement(), _placement()])
