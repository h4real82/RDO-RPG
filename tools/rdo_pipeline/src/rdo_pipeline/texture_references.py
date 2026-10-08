from __future__ import annotations

import re
from pathlib import Path


_TEXTURE_NAME = re.compile(r'(?<![A-Za-z0-9_])[A-Za-z0-9_#.-]+(?:_(?:al|ab|nm|ma|mb|dr|pal)|#dr)(?![A-Za-z0-9_])', re.IGNORECASE)


def _texture_stems(texture_root: Path) -> dict[str, str]:
    if not texture_root.is_dir():
        return {}
    return {
        texture.stem.lower(): texture.name
        for texture in sorted(texture_root.rglob('*'))
        if texture.is_file()
    }


def _source_model(model_root: Path, model: str) -> Path | None:
    preferred = model_root / f'{model}_ydr'
    if preferred.is_dir():
        source = next(iter(sorted(preferred.glob('*.ydr.full'))), None)
        if source is not None:
            return source
    matches = sorted(model_root.rglob(f'{model}.ydr.full'))
    return matches[0] if matches else None


def _references(source: Path) -> list[str]:
    data = source.read_bytes().decode('latin-1', errors='ignore')
    return sorted({match.group(0).lower() for match in _TEXTURE_NAME.finditer(data)})


def build_texture_reference_report(model_root: Path, texture_root: Path, models: set[str]) -> dict[str, object]:
    """Inventory texture names present in YDR binaries without inventing bindings.

    A drawable's proprietary shader-to-primitive mapping is deliberately not
    reconstructed here. The report only proves whether each literal texture
    reference can be satisfied by an exported texture file.
    """
    known_textures = _texture_stems(texture_root)
    entries: list[dict[str, object]] = []
    all_references: set[str] = set()
    all_available: set[str] = set()
    for model in sorted(models):
        source = _source_model(model_root, model)
        if source is None:
            continue
        references = _references(source)
        available = sorted(known_textures[reference] for reference in references if reference in known_textures)
        missing = sorted(reference for reference in references if reference not in known_textures)
        all_references.update(references)
        all_available.update(available)
        entries.append({
            'model': model,
            'referencedTextures': references,
            'availableTextures': available,
            'missingTextures': missing,
        })
    return {
        'version': 1,
        'models': entries,
        'summary': {
            'modelCount': len(entries),
            'referencedTextureCount': len(all_references),
            'availableTextureCount': len(all_available),
            'missingTextureCount': len(all_references - {Path(name).stem.lower() for name in all_available}),
        },
    }
