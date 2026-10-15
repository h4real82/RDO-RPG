"""Read-only evidence for missing exterior links; never infer a world transform."""
from collections import defaultdict
from hashlib import sha256
import math
from pathlib import Path
import re
import xml.etree.ElementTree as ET

from .placements import _joaat


def _key(value: str) -> str:
    value = value.strip().lower()
    return value if re.fullmatch(r'0x[0-9a-f]{8}', value) else _joaat(value)


def _transform(node: ET.Element) -> dict:
    def vector(tag: str, axes: str) -> list[float]:
        element = node.find(tag)
        if element is None or any(axis not in element.attrib for axis in axes):
            raise ValueError(f'missing source {tag}')
        values = [float(element.attrib[axis]) for axis in axes]
        if not all(math.isfinite(value) for value in values):
            raise ValueError(f'non-finite source {tag}')
        return values

    def scale(tag: str) -> float:
        element = node.find(tag)
        if element is None or 'value' not in element.attrib:
            raise ValueError(f'missing source {tag}')
        value = float(element.attrib['value'])
        if not math.isfinite(value) or value <= 0:
            raise ValueError(f'invalid source {tag}')
        return value

    rotation = vector('rotation', 'xyzw')
    if sum(value * value for value in rotation) < 1e-12:
        raise ValueError('invalid source rotation')
    xy, z = scale('scaleXY'), scale('scaleZ')
    return {'position': vector('position', 'xyz'), 'rotation': rotation, 'scale': [xy, xy, z]}


def audit_landmark_sources(raw_root: Path, models: list[str]) -> dict:
    root = raw_root.resolve()
    if not root.is_dir():
        raise ValueError('raw root must exist')
    if not models or len(set(models)) != len(models) or any(
        not re.fullmatch(r'[a-z0-9_]+', name) for name in models
    ):
        raise ValueError('unique lowercase model names required')
    inputs, maps, members = [], [], []
    definitions = defaultdict(list)
    counts = {'xmlFiles': 0, 'ymapFiles': 0, 'ytypFiles': 0, 'rootEntities': 0, 'archetypes': 0}
    files = sorted(path for path in root.rglob('*') if path.is_file())
    for path in files:
        if path.suffix.lower() != '.xml':
            continue
        raw = path.read_bytes()
        document = ET.fromstring(raw)
        relative = path.relative_to(root).as_posix()
        inputs.append({'path': relative, 'sha256': sha256(raw).hexdigest(), 'rootTag': document.tag})
        counts['xmlFiles'] += 1
        if document.tag == 'CMapData':
            counts['ymapFiles'] += 1
            for index, entity in enumerate(document.findall('./entities/Item')):
                counts['rootEntities'] += 1
                name = entity.findtext('archetypeName', '').strip()
                if name and entity.get('type') == 'CEntityDef':
                    maps.append((relative, index, _key(name), entity))
        elif document.tag == 'CMapTypes':
            counts['ytypFiles'] += 1
            for index, archetype in enumerate(document.findall('./archetypes/Item')):
                counts['archetypes'] += 1
                name = archetype.findtext('name', '').strip()
                asset = archetype.findtext('assetName', '').strip()
                if name:
                    definitions[_key(name)].append({
                        'path': relative, 'archetypeIndex': index, 'asset': _key(asset) if asset else None,
                        'type': archetype.get('type'), 'assetType': archetype.findtext('assetType', ''),
                    })
                if archetype.get('type') == 'CMloArchetypeDef':
                    for child in archetype.findall('./entities/Item') + archetype.findall('./entitySets/Item/entities/Item'):
                        model = child.findtext('archetypeName', '').strip()
                        if model:
                            members.append((_key(model), {'sourceFile': relative,
                                           'parentArchetype': name, 'model': model}))
    results = []
    for model in models:
        target = _key(model)
        bindings = {key: defs for key, defs in definitions.items()
                    if any(d['asset'] == target for d in defs)}
        world, ambiguous = [], []
        for source, index, archetype, entity in maps:
            if archetype != target and archetype not in bindings:
                continue
            defs = definitions.get(archetype, [])
            if defs and (len({d['asset'] for d in defs}) != 1 or any(
                d['assetType'] != 'ASSET_TYPE_DRAWABLE' or d['type'] not in
                ('CBaseArchetypeDef', 'CTimeArchetypeDef') for d in defs
            ) or any(d['asset'] != target for d in defs)):
                ambiguous.append({'sourceFile': source, 'entityIndex': index, 'archetype': archetype})
                continue
            world.append({'sourceFile': source, 'entityIndex': index, 'archetype': archetype,
                          'bindingFiles': sorted({d['path'] for d in defs}),
                          'lodLevel': entity.findtext('lodLevel', ''), **_transform(entity)})
        local = [record for key, record in members if key == target or key in bindings]
        exports = [{'path': p.relative_to(root).as_posix(), 'sha256': sha256(p.read_bytes()).hexdigest()}
                   for p in files if p.name.lower() == f'{model}.ydr.full']
        status = ('ambiguous-archetype' if ambiguous else 'source-placement-found' if world
                  else 'local-member-only' if local else 'archetype-only' if bindings else 'source-link-missing')
        results.append({'model': model, 'hash': target, 'status': status,
                        'fullExports': exports, 'archetypeBindings': bindings,
                        'worldPlacements': world, 'mloMembers': local, 'ambiguousEntities': ambiguous})
    return {'version': 1, 'coordinateSpace': 'original-game-xyz', 'summary': counts,
            'inputs': inputs, 'models': results, 'runtimeModified': False,
            'note': 'Found records are source evidence, not rendered placement or route acceptance.'}
