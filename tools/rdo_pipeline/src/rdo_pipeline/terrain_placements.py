"""Resolve explicitly selected terrain drawable names against exported YMAP entities."""
from __future__ import annotations

import math
from pathlib import Path
import xml.etree.ElementTree as ET
from typing import Sequence

from .placements import _joaat, _rotation_xyz


def build_terrain_placements(ymap_paths: Sequence[Path], model_names: Sequence[str]) -> list[dict[str, object]]:
    """Build terrain-layer placements only when YMAP JOAAT and HD source agree.

    Model names are an explicit allowlist derived from exported drawable names;
    all transforms come from matching CEntityDef records in the supplied YMAPs.
    """
    if not ymap_paths or not model_names:
        raise ValueError('at least one YMAP and one explicit terrain model are required')
    if len(set(model_names)) != len(model_names):
        raise ValueError('duplicate terrain model name')
    models_by_hash = {_joaat(name): name for name in model_names}
    if len(models_by_hash) != len(model_names):
        raise ValueError('terrain model names have a JOAAT hash collision')

    placements: dict[str, dict] = {}
    for path in ymap_paths:
        root = ET.parse(path).getroot()
        for entity in root.findall('.//entities/Item[@type="CEntityDef"]'):
            archetype_hash = entity.findtext('archetypeName', '').strip().lower()
            model = models_by_hash.get(archetype_hash)
            if model is None or entity.findtext('lodLevel', '').strip() != 'LODTYPES_DEPTH_HD':
                continue
            if model in placements:
                raise ValueError(f'multiple HD placements found for terrain model {model}')
            position = entity.find('position')
            rotation = entity.find('rotation')
            scale_xy = entity.find('scaleXY')
            scale_z = entity.find('scaleZ')
            if any(value is None for value in (position, rotation, scale_xy, scale_z)):
                raise ValueError(f'incomplete YMAP transform for terrain model {model}')

            def coordinate(node: ET.Element, key: str) -> float:
                value = float(node.attrib[key])
                if not math.isfinite(value):
                    raise ValueError(f'non-finite YMAP transform for terrain model {model}')
                return value

            x, game_y, elevation = (coordinate(position, axis) for axis in ('x', 'y', 'z'))
            quaternion = [coordinate(rotation, axis) for axis in ('x', 'y', 'z', 'w')]
            xy_scale = coordinate(scale_xy, 'value')
            z_scale = coordinate(scale_z, 'value')
            if xy_scale == 0 or z_scale == 0:
                raise ValueError(f'zero YMAP scale for terrain model {model}')
            placements[model] = {
                'source': path.name,
                'asset': f'models/valentine/{model}.glb',
                'position': {'x': x, 'y': elevation, 'z': game_y},
                'rotation': _rotation_xyz(quaternion),
                'scale': {'x': xy_scale, 'y': z_scale, 'z': xy_scale},
                'layer': 'terrain',
                'lod': 0,
                'interior': False,
            }

    missing = sorted(set(model_names) - set(placements))
    if missing:
        raise ValueError(f'terrain models not found as HD YMAP entities: {", ".join(missing)}')
    return [placements[name] for name in model_names]
