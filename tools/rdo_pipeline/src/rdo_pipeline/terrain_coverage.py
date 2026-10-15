"""Source bounding-box coverage; deliberately not a mesh-ground/walkability test."""
import itertools
import math
from pathlib import Path
import xml.etree.ElementTree as ET

from .placements import _joaat
from .terrain_placements import build_terrain_placements


def terrain_world_bounds(placement: dict, minimum: dict, maximum: dict) -> dict:
    corners = []
    r, s, p = (placement[key] for key in ('rotation', 'scale', 'position'))
    cx, cy, cz = (math.cos(r[a]) for a in 'xyz')
    sx, sy, sz = (math.sin(r[a]) for a in 'xyz')
    for gx, gy, gz in itertools.product(*[(minimum[a], maximum[a]) for a in 'xyz']):
        x, y, z = gx*s['x'], gz*s['y'], -gy*s['z']
        x, y = cz*x - sz*y, sz*x + cz*y
        x, z = cy*x + sy*z, -sy*x + cy*z
        y, z = cx*y - sx*z, sx*y + cx*z
        corners.append((x+p['x'], z+p['z']))
    if not all(math.isfinite(value) for point in corners for value in point):
        raise ValueError('non-finite terrain bounds')
    return {key: round(value, 6) for key, value in {
        'minX': min(v[0] for v in corners), 'maxX': max(v[0] for v in corners),
        'minZ': min(v[1] for v in corners), 'maxZ': max(v[1] for v in corners),
    }.items()}


def read_source_terrain_bounds(ymaps: list[Path], ytyps: list[Path], models: list[str]) -> list[dict]:
    archetypes = {}
    for path in sorted(ytyps):
        root = ET.parse(path).getroot()
        if root.tag != 'CMapTypes':
            raise ValueError(f'expected YTYP CMapTypes: {path.name}')
        for item in root.findall('./archetypes/Item'):
            key = item.findtext('name', '').strip().lower()
            if not key:
                continue
            lo, hi = item.find('bbMin'), item.find('bbMax')
            if lo is None or hi is None:
                continue
            bounds = tuple({a: float(node.attrib[a]) for a in 'xyz'} for node in (lo, hi))
            if any(bounds[0][a] > bounds[1][a] for a in 'xyz'):
                raise ValueError('inverted terrain bounds')
            if key in archetypes and archetypes[key][0] != bounds:
                raise ValueError(f'conflicting archetype bounds: {key}')
            archetypes[key] = (bounds, path.name)
    result = []
    for placement in build_terrain_placements(ymaps, models):
        name = Path(placement['asset']).stem
        if _joaat(name) not in archetypes:
            raise ValueError(f'source YTYP bounds missing: {name}')
        (lo, hi), source = archetypes[_joaat(name)]
        result.append({'model': name, 'sourceYmap': placement['source'], 'sourceYtyp': source,
                       'bounds': terrain_world_bounds(placement, lo, hi)})
    return result


def audit_terrain_bounds(tiles: list[dict], points: list[dict], exported: set[str]) -> dict:
    targets, findings = {}, []
    for point in points:
        if not all(math.isfinite(point[a]) for a in ('x', 'z')):
            raise ValueError('non-finite terrain checkpoint')
        covering = [tile for tile in tiles if tile['bounds']['minX'] <= point['x'] <= tile['bounds']['maxX']
                    and tile['bounds']['minZ'] <= point['z'] <= tile['bounds']['maxZ']]
        present = [tile for tile in covering if tile['model'] in exported]
        status = ('exported-bounds-only' if present else 'export-needed' if covering else 'source-bounds-missing')
        findings.append({**point, 'status': status, 'candidateModels': [tile['model'] for tile in covering]})
        if present:
            continue
        for tile in covering:
            target = targets.setdefault(tile['model'], {**tile, 'requiredBy': []})
            target['requiredBy'].append(point['id'])
    return {'version': 1, 'meshGroundVerified': False, 'points': findings,
            'exportTargets': [targets[key] for key in sorted(targets)]}
