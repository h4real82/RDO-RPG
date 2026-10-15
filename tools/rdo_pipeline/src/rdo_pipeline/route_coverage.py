"""Audit required exterior landmarks without inferring missing world positions.

This is an asset/placement gate. Terrain continuity, rails and a real input
walk require separate measured evidence and cannot pass from filenames alone.
"""
from __future__ import annotations

from collections import defaultdict
from pathlib import Path, PurePosixPath
from typing import Any, Mapping

from .placements import _joaat, _rotation_xyz


def _model_key(name: str) -> str:
    name = name.lower()
    return name if name.startswith('0x') else _joaat(name)


def build_route_coverage(
    circuit: Mapping[str, Any], source: Mapping[str, Any],
    manifest: Mapping[str, Any], raw_root: Path,
) -> dict[str, Any]:
    if not raw_root.is_dir():
        raise ValueError('raw export root must exist')
    required = circuit.get('landmarks', [])
    if not required or len({item['id'] for item in required}) != len(required):
        raise ValueError('landmarks must be nonempty with unique ids')
    files: dict[str, list[dict[str, str]]] = defaultdict(list)
    for path in sorted(raw_root.rglob('*')):
        if not path.is_file():
            continue
        lower = path.name.lower()
        for suffix, kind in (('.ydr.full', 'fullExports'), ('.ydr', 'archiveCopies')):
            if lower.endswith(suffix):
                files[lower[:-len(suffix)]].append({
                    'kind': kind, 'path': path.relative_to(raw_root).as_posix(),
                })
                break
    exterior = [entity for entity in source.get('entities', []) if not entity.get('isInterior', False)]
    active = [p for p in manifest.get('placements', [])
              if 'interior' not in p.get('tags', []) and p.get('layer') == 'buildings']
    results = []
    for landmark in required:
        names = landmark['models']
        if not names or len(set(names)) != len(names):
            raise ValueError('landmark models must be nonempty and unique')
        keys = {_model_key(name) for name in names}
        entities = [entity for entity in exterior if _model_key(entity['modelName']) in keys]
        loaded = [p for p in active if _model_key(PurePosixPath(p['asset']).stem) in keys]
        records = []
        matches = []
        for entity in entities:
            x, game_y, elevation = entity['position']
            position = {'x': x, 'y': elevation, 'z': -game_y}
            rotation = _rotation_xyz(entity['rotation'])
            sx, sy, sz = entity['scale']
            scale = {'x': sx, 'y': sz, 'z': sy}
            records.append({'sourceFile': entity['sourceFile'], 'model': entity['modelName'],
                            'position': position, 'rotation': rotation, 'scale': scale})
            matches.append(any(
                _model_key(PurePosixPath(p['asset']).stem) == _model_key(entity['modelName'])
                and all(abs(p[field][axis] - expected[axis]) < 0.001
                        for field, expected in (('position', position), ('rotation', rotation), ('scale', scale))
                        for axis in ('x', 'y', 'z')) for p in loaded))
        models = [{
            'name': name, 'hash': _model_key(name),
            'archiveCopies': [f['path'] for f in files[name] if f['kind'] == 'archiveCopies'],
            'fullExports': [f['path'] for f in files[name] if f['kind'] == 'fullExports'],
        } for name in names]
        if not entities:
            status, action = 'source-placement-missing', 'recover-source-placement'
        elif all(matches):
            status, action = 'placed-exterior', 'verify-rendered-silhouette'
        elif loaded:
            status, action = 'placement-mismatch', 'repair-source-transform'
        else:
            status = 'runtime-placement-missing'
            action = ('convert-or-integrate-existing-export' if any(m['fullExports'] for m in models)
                      else 'export-full-resource')
        results.append({'id': landmark['id'], 'label': landmark['label'], 'status': status,
                        'nextAction': action, 'models': models, 'placements': records})
    return {
        'version': 1, 'coordinateSpace': 'three-right-handed', 'ready': False,
        'gates': {'landmarkPlacements': all(item['status'] == 'placed-exterior' for item in results),
                  'terrainContinuity': 'not-verified', 'sourceRoadAndBoardwalkGeometry': 'not-verified',
                  'stationRailComplex': 'not-verified', 'walkableCircuit': 'not-verified'},
        'segments': circuit.get('segments', []), 'landmarks': results,
    }
