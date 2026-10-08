from __future__ import annotations

import json
from pathlib import Path


def test_reference_camera_poses_are_unique_orthographic_and_grounded() -> None:
    root = Path(__file__).resolve().parents[3]
    poses = json.loads((root / 'data/runtime/valentine/reference-camera-poses.json').read_text(encoding='utf-8'))

    assert len({pose['id'] for pose in poses['poses']}) == len(poses['poses'])
    for pose in poses['poses']:
        assert pose['projection'] == 'orthographic'
        assert set(pose['position']) == {'x', 'y', 'z'}
        assert set(pose['target']) == {'x', 'y', 'z'}
        assert (root / pose['reference']).is_file()
