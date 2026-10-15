"""Apply converter-produced diffuse previews without changing world placements."""
from collections import Counter
from hashlib import sha256
import json
from pathlib import Path
import shutil
import struct

from .manifest import _atomic_json


def read_glb_metadata(raw: bytes) -> dict:
    if len(raw) < 20:
        raise ValueError('truncated GLB')
    magic, version, total, length, kind = struct.unpack_from('<5I', raw)
    if magic != 0x46546c67 or version != 2 or total != len(raw) or kind != 0x4e4f534a or 20 + length > total:
        raise ValueError('invalid GLB header or JSON chunk')
    try:
        document = json.loads(raw[20:20 + length])
    except (UnicodeError, ValueError) as error:
        raise ValueError('invalid GLB JSON') from error
    if not isinstance(document, dict) or document.get('asset', {}).get('version') != '2.0':
        raise ValueError('invalid GLB asset metadata')
    return document


def apply_material_preview(staged_root: Path, runtime_root: Path, *, include_terrain: bool = False) -> dict:
    runtime_root = runtime_root.resolve()
    manifest_path = runtime_root / 'rdo_world_manifest.json'
    manifest_bytes = manifest_path.read_bytes()
    manifest = json.loads(manifest_bytes)
    assets = sorted({p['asset'] for p in manifest['placements'] if include_terrain or p['layer'] != 'terrain'})
    terrain_assets = {p['asset'] for p in manifest['placements'] if p['layer'] == 'terrain'}
    planned = []
    textures = {}
    # Inspect the complete batch before replacing any generated asset.
    for asset in assets:
        target = (runtime_root / asset).resolve()
        if runtime_root not in target.parents:
            raise ValueError('asset path escapes runtime root')
        staged = staged_root / target.name
        if not staged.is_file():
            continue
        raw = staged.read_bytes()
        document = read_glb_metadata(raw)
        materials = document.get('materials', [])
        # This GBuffer decal is not a diffuse surface; see valentine-preview-evidence.md.
        if any(m.get('extras', {}).get('rdo_shader_hash') == '0xec8e6107' for m in materials):
            continue
        textured = sum(m.get('extras', {}).get('rdo_material_status') == 'diffuse-only'
                       and 'baseColorTexture' in m.get('pbrMetallicRoughness', {}) for m in materials)
        terrain = [m for m in materials if asset in terrain_assets
                   and m.get('extras', {}).get('rdo_material_status') == 'terrain-four-layer-preview']
        if not textured and not terrain:
            continue
        for material in terrain:
            for key in ('rdo_terrain_lookup', *(f'rdo_terrain_layer{i}' for i in range(4))):
                name = material['extras'].get(key)
                if not isinstance(name, str) or Path(name).name != name or '\\' in name or not name.endswith('.png'):
                    raise ValueError('invalid terrain texture reference')
                texture = staged_root / 'textures' / name
                if not texture.is_file():
                    raise ValueError(f'missing terrain texture: {name}')
                destination = runtime_root / 'textures' / 'terrain' / name
                if destination.exists() and destination.read_bytes() != texture.read_bytes():
                    raise ValueError(f'conflicting terrain texture: {name}')
                textures[name] = (texture, destination)
        old_hash, new_hash = sha256(target.read_bytes()).hexdigest(), sha256(raw).hexdigest()
        if old_hash == new_hash:
            continue
        planned.append((staged, target, {
            'path': asset, 'previousSha256': old_hash, 'sha256': new_hash,
            'backup': f'asset-backups/{old_hash}.glb',
            'texturedMaterialCount': textured,
            'terrainMaterialCount': len(terrain),
            'materialStatusCounts': dict(Counter(m.get('extras', {}).get('rdo_material_status', 'unmarked') for m in materials)),
        }))

    report = {'version': 1, 'manifestSha256': sha256(manifest_bytes).hexdigest(),
              'promotedModelCount': len(planned), 'assets': [item for _, _, item in planned],
              'terrainTextureCount': len(textures)}
    if not planned and all(destination.exists() for _, destination in textures.values()):
        return report
    provenance_path = runtime_root / 'provenance.json'
    provenance = json.loads(provenance_path.read_text()) if provenance_path.exists() else {}
    indexed = {item['path']: item for item in provenance.get('assets', [])}
    for texture, destination in textures.values():
        destination.parent.mkdir(parents=True, exist_ok=True)
        if not destination.exists():
            shutil.copy2(texture, destination)
        relative = destination.relative_to(runtime_root).as_posix()
        indexed[relative] = {'path': relative, 'sha256': sha256(destination.read_bytes()).hexdigest()}
    for staged, target, item in planned:
        backup = runtime_root / item['backup']
        backup.parent.mkdir(parents=True, exist_ok=True)
        if not backup.exists():
            shutil.copy2(target, backup)
        temporary = target.with_suffix('.glb.tmp')
        shutil.copy2(staged, temporary)
        temporary.replace(target)
        indexed[item['path']] = {'path': item['path'], 'sha256': item['sha256']}
    provenance['assets'] = [indexed[key] for key in sorted(indexed)]
    _atomic_json(provenance_path, provenance)
    _atomic_json(runtime_root / 'material-preview-report.json', report)
    return report
