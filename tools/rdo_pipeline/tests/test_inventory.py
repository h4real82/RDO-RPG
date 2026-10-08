from __future__ import annotations

import hashlib
from pathlib import Path

from rdo_pipeline.inventory import build_inventory


def test_inventory_is_sorted_hashed_and_explicit_about_unknown_files(tmp_path: Path) -> None:
    raw = tmp_path / 'raw'
    (raw / 'z').mkdir(parents=True)
    (raw / 'a').mkdir()
    (raw / 'z' / 'model.ydr').write_bytes(b'model')
    (raw / 'a' / 'texture.ytd').write_bytes(b'texture')
    (raw / 'a' / 'valentine.ymap.xml').write_bytes(b'ymap')
    (raw / 'a' / 'notes.bin').write_bytes(b'unknown')

    before = sorted(raw.rglob('*'), key=lambda path: path.as_posix())
    inventory = build_inventory(raw)

    assert [item.path for item in inventory.items] == [
        'a/notes.bin',
        'a/texture.ytd',
        'a/valentine.ymap.xml',
        'z/model.ydr',
    ]
    assert [item.category for item in inventory.items] == ['unknown', 'texture', 'ymap', 'model']
    assert inventory.items[3].sha256 == hashlib.sha256(b'model').hexdigest()
    assert sorted(raw.rglob('*'), key=lambda path: path.as_posix()) == before


def test_inventory_can_assign_a_runtime_prefix_without_renaming_sources(tmp_path: Path) -> None:
    raw = tmp_path / 'exports'
    raw.mkdir()
    (raw / 'saloon.glb').write_bytes(b'model')

    inventory = build_inventory(raw, runtime_prefix='models/valentine')

    assert inventory.items[0].path == 'models/valentine/saloon.glb'
    assert inventory.items[0].source_path == 'saloon.glb'
