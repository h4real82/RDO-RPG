"""Inventory exported YMAP records without treating packed instance headers as TRS."""
from hashlib import sha256
from pathlib import Path
import xml.etree.ElementTree as ET


def audit_ymap_batch(paths: list[Path], *, expected_count: int) -> dict:
    if expected_count < 1 or len(paths) != expected_count:
        raise ValueError(f'expected {expected_count} YMAP XML files, received {len(paths)}')
    files, identities = [], set()
    summary = dict(files=len(paths), emptyMaps=0, entityRecords=0, grassBatches=0,
                   grassInstances=0, propInstances=0)
    for path in sorted(paths):
        raw = path.read_bytes()
        root = ET.fromstring(raw)
        if root.tag != 'CMapData':
            raise ValueError(f'expected CMapData XML: {path.name}')
        identity = root.findtext('name', '').strip().lower()
        if not identity:
            raise ValueError(f'missing map identity: {path.name}')
        if identity in identities:
            raise ValueError(f'duplicate map identity: {identity}')
        identities.add(identity)
        entities = root.findall('./entities/Item')
        grass = [{
            'archetype': node.findtext('archetypeName', '').strip().lower(),
            'instanceCount': len(node.findall('./InstanceList/Item')),
            'renderable': False,
            'reason': 'packed instance layout requires separate verified decoding',
        } for node in root.findall('./instancedData/GrassInstanceList/Item')]
        props = len(root.findall('./instancedData/PropInstanceList/Item'))
        empty = not entities and not grass and not props
        summary['emptyMaps'] += int(empty)
        summary['entityRecords'] += len(entities)
        summary['grassBatches'] += len(grass)
        summary['grassInstances'] += sum(item['instanceCount'] for item in grass)
        summary['propInstances'] += props
        files.append({
            'path': path.name, 'sha256': sha256(raw).hexdigest(), 'internalName': identity,
            'blockName': root.findtext('./block/name', ''), 'emptyPlacementMap': empty,
            'entityCount': len(entities), 'propInstanceCount': props, 'grass': grass,
        })
    return {'version': 1, 'summary': summary, 'files': files}
