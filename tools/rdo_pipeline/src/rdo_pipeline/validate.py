from __future__ import annotations

import json
import math
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Mapping

from .manifest import CHUNK_SIZE, _LAYERS


@dataclass(frozen=True)
class ValidationReport:
    valid: bool
    errors: tuple[str, ...]


def _chunk_id(position: Mapping[str, Any]) -> str:
    return f"{int(position['x'] // CHUNK_SIZE)}:{int(position['z'] // CHUNK_SIZE)}"


def validate_runtime(runtime_root: Path) -> ValidationReport:
    manifest = json.loads((runtime_root / 'rdo_world_manifest.json').read_text(encoding='utf-8'))
    errors: list[str] = []
    for placement in manifest.get('placements', []):
        if not (runtime_root / placement.get('asset', '')).is_file():
            errors.append('ASSET_MISSING')
        position = placement.get('position', {})
        if not all(isinstance(position.get(axis), (int, float)) and math.isfinite(position[axis]) for axis in ('x', 'y', 'z')):
            errors.append('POSITION_NON_FINITE')
        if placement.get('layer') not in _LAYERS:
            errors.append('LAYER_INVALID')
        if all(isinstance(position.get(axis), (int, float)) and math.isfinite(position[axis]) for axis in ('x', 'z')) and placement.get('chunkId') != _chunk_id(position):
            errors.append('CHUNK_MISMATCH')
    return ValidationReport(not errors, tuple(dict.fromkeys(errors)))
