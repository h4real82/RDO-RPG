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


def apply_material_preview(staged_root: Path, runtime_root: Path) -> dict:
    runtime_root = runtime_root.resolve()
    manifest_path = runtime_root / 'rdo_world_manifest.json'
    manifest_bytes = manifest_path.read_bytes()
    manifest = json.loads(manifest_bytes)
    assets = sorted({p['asset'] for p in manifest['placements'] if p['layer'] != 'terrain'})
    planned = []
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
        if not textured:
            continue
        old_hash, new_hash = sha256(target.read_bytes()).hexdigest(), sha256(raw).hexdigest()
        if old_hash == new_hash:
            continue
        planned.append((staged, target, {
            'path': asset, 'previousSha256': old_hash, 'sha256': new_hash,
            'backup': f'asset-backups/{old_hash}.glb',
            'texturedMaterialCount': textured,
            'materialStatusCounts': dict(Counter(m.get('extras', {}).get('rdo_material_status', 'unmarked') for m in materials)),
        }))

    report = {'version': 1, 'manifestSha256': sha256(manifest_bytes).hexdigest(),
              'promotedModelCount': len(planned), 'assets': [item for _, _, item in planned]}
    if not planned:
        return report
    provenance_path = runtime_root / 'provenance.json'
    provenance = json.loads(provenance_path.read_text()) if provenance_path.exists() else {}
    indexed = {item['path']: item for item in provenance.get('assets', [])}
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
