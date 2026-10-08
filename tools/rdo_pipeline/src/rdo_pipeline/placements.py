from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Any, Mapping
from pathlib import Path
import xml.etree.ElementTree as ET


@dataclass(frozen=True)
class PlacementAdaptation:
    placements: tuple[dict[str, Any], ...]
    missing_models: tuple[str, ...]


def read_mlo_archetypes(paths: list[Path]) -> dict[str, dict[str, Any]]:
    """Read local-space MLO members, preserving optional sets separately.

    No world transform or entity-set activation is inferred by this reader.
    """
    def text(node: ET.Element, key: str) -> str:
        value = node.findtext(key, '').strip().lower()
        if not value:
            raise ValueError(f'missing MLO {key}')
        return value

    def vector(node: ET.Element, key: str, axes: str) -> list[float]:
        element = node.find(key)
        if element is None or any(axis not in element.attrib for axis in axes):
            raise ValueError(f'missing MLO {key}')
        values = [float(element.attrib[axis]) for axis in axes]
        if not all(math.isfinite(value) for value in values):
            raise ValueError(f'non-finite MLO {key}')
        return values

    def scalar(node: ET.Element, key: str) -> float:
        element = node.find(key)
        if element is None or 'value' not in element.attrib:
            raise ValueError(f'missing MLO {key}')
        value = float(element.attrib['value'])
        if not math.isfinite(value):
            raise ValueError(f'non-finite MLO {key}')
        return value

    def members(node: ET.Element, source: Path) -> list[dict[str, Any]]:
        result = []
        for entity in node.findall('./entities/Item'):
            if entity.get('type') != 'CEntityDef':
                raise ValueError('unsupported MLO entity type')
            xy, z = scalar(entity, 'scaleXY'), scalar(entity, 'scaleZ')
            result.append({
                'modelName': text(entity, 'archetypeName'),
                'position': vector(entity, 'position', 'xyz'),
                'rotation': vector(entity, 'rotation', 'xyzw'),
                'scale': [xy, xy, z], 'sourceFile': source.name, 'isInterior': True,
            })
        return result

    result: dict[str, dict[str, Any]] = {}
    for path in sorted(paths):
        root = ET.parse(path).getroot()
        if root.tag != 'CMapTypes':
            raise ValueError(f'not a CMapTypes export: {path.name}')
        for node in root.findall('./archetypes/Item'):
            if node.get('type') != 'CMloArchetypeDef':
                continue
            name = text(node, 'name')
            if name in result:
                raise ValueError(f'duplicate MLO archetype: {name}')
            result[name] = {
                'sourceFile': path.name, 'entities': members(node, path),
                'entitySets': [{'name': text(entity_set, 'name'), 'entities': members(entity_set, path)}
                               for entity_set in node.findall('./entitySets/Item')],
            }
    return result


def compose_mlo_entity(parent: Mapping[str, Any], child: Mapping[str, Any]) -> dict[str, Any]:
    """Compose game-space MLO orientation with inverse-oriented CEntityDef.

    Kept separate from the renderer until coordinate-basis validation is complete.
    A TRS-only manifest cannot represent shear from nonuniform parent scaling.
    """
    scales = [float(value) for value in parent['scale']]
    if not all(math.isfinite(value) for value in scales):
        raise ValueError('invalid MLO parent scale')
    if max(scales) - min(scales) > 1e-7:
        raise ValueError('nonuniform MLO parent scale requires a matrix transform')

    def unit(values: list[float]) -> list[float]:
        norm = math.sqrt(sum(float(value)**2 for value in values))
        if not math.isfinite(norm) or norm == 0:
            raise ValueError('invalid MLO quaternion')
        return [float(value)/norm for value in values]

    px, py, pz, pw = unit(parent['rotation'])
    cx, cy, cz, cw = unit(child['rotation'])
    vx, vy, vz = [float(value)*scales[index] for index, value in enumerate(child['position'])]
    tx, ty, tz = 2*(py*vz-pz*vy), 2*(pz*vx-px*vz), 2*(px*vy-py*vx)
    offset = [vx+pw*tx+py*tz-pz*ty, vy+pw*ty+pz*tx-px*tz, vz+pw*tz+px*ty-py*tx]
    # Stored world rotation = inverse(parent * inverse(child))
    #                       = child * inverse(parent).
    ax, ay, az = -px, -py, -pz
    rotation = [cw*ax+cx*pw+cy*az-cz*ay,
                cw*ay-cx*az+cy*pw+cz*ax,
                cw*az+cx*ay-cy*ax+cz*pw,
                cw*pw-cx*ax-cy*ay-cz*az]
    result = dict(child)
    result['position'] = [float(parent['position'][index])+offset[index] for index in range(3)]
    result['rotation'] = rotation
    result['scale'] = [float(value)*scales[index] for index, value in enumerate(child['scale'])]
    if not all(math.isfinite(value) for value in result['position'] + result['scale']):
        raise ValueError('non-finite MLO world transform')
    result['isInterior'] = True
    return result


def expand_mlo_placements(payload: Mapping[str, Any], archetypes: Mapping[str, Any]) -> dict[str, Any]:
    """Expand base members only; optional sets require separate activation data."""
    entities = []
    for parent in payload.get('entities', []):
        name = str(parent['modelName']).lower()
        key = name if name.startswith('0x') else _joaat(name)
        definition = archetypes.get(key)
        if definition is None:
            entities.append(dict(parent))
            continue
        for child in definition['entities']:
            world = compose_mlo_entity(parent, child)
            world['sourceFile'] = f"{parent['sourceFile']}::{child['sourceFile']}"
            entities.append(world)
    return {**payload, 'entities': entities}


def _rotation_xyz(rotation: list[float]) -> dict[str, float]:
    game_x, game_y, game_z, w = (float(value) for value in rotation)
    # Normal CEntityDef stores inverse orientation. Our required world basis
    # swaps game Y/Z (a reflection): conjugating that inverse rotation by the
    # reflection gives quaternion vector (x,z,y). The runtime separately flips
    # GLB-local Z to reconcile Blender's (x,z,-y) mesh basis with (x,z,y).
    x, y, z = game_x, game_z, game_y
    norm = math.sqrt(x*x + y*y + z*z + w*w)
    if not math.isfinite(norm) or norm == 0:
        raise ValueError('invalid source rotation quaternion')
    x, y, z, w = x/norm, y/norm, z/norm, w/norm
    m13 = 2 * (x*z + w*y)
    ry = math.asin(max(-1.0, min(1.0, m13)))
    if abs(m13) < 0.9999999:
        rx = math.atan2(2 * (w*x - y*z), 1 - 2 * (x*x + y*y))
        rz = math.atan2(2 * (w*z - x*y), 1 - 2 * (y*y + z*z))
    else:
        rx = math.atan2(2 * (y*z + w*x), 1 - 2 * (x*x + z*z))
        rz = 0.0
    return {'x': rx, 'y': ry, 'z': rz}


def _joaat(name: str) -> str:
    value = 0
    for byte in name.lower().encode('utf-8'):
        value = (value + byte) & 0xffffffff
        value = (value + (value << 10)) & 0xffffffff
        value = (value ^ (value >> 6)) & 0xffffffff
    value = (value + (value << 3)) & 0xffffffff
    value = (value ^ (value >> 11)) & 0xffffffff
    value = (value + (value << 15)) & 0xffffffff
    return f'0x{value:08x}'


def adapt_rdo_placements(payload: Mapping[str, Any], available_models: set[str]) -> PlacementAdaptation:
    placements: list[dict[str, Any]] = []
    missing: set[str] = set()
    models_by_hash = {_joaat(model): model for model in available_models}
    for entity in payload.get('entities', []):
        model = str(entity['modelName'])
        asset_model = model if model in available_models else models_by_hash.get(model.lower())
        if asset_model is None:
            missing.add(model)
            continue
        x, game_y, elevation = (float(value) for value in entity['position'])
        scale_x, scale_y, scale_z = (float(value) for value in entity['scale'])
        interior = bool(entity.get('isInterior', False))
        placements.append({
            'source': str(entity['sourceFile']),
            'asset': f'models/valentine/{asset_model}.glb',
            'position': {'x': x, 'y': elevation, 'z': game_y},
            'rotation': _rotation_xyz(entity['rotation']),
            'scale': {'x': scale_x, 'y': scale_z, 'z': scale_y},
            'layer': 'buildings',
            'lod': 0,
            'interior': interior,
            'tags': ['interior' if interior else 'exterior'],
        })
    return PlacementAdaptation(tuple(placements), tuple(sorted(missing)))
