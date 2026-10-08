from __future__ import annotations

from dataclasses import dataclass
from hashlib import sha256
from pathlib import Path


@dataclass(frozen=True)
class AssetItem:
    path: str
    category: str
    sha256: str


@dataclass(frozen=True)
class AssetInventory:
    items: tuple[AssetItem, ...]


def _category(path: Path) -> str:
    suffixes = ''.join(path.suffixes).lower()
    if path.suffix.lower() in {'.ydr', '.yft', '.glb'}:
        return 'model'
    if path.suffix.lower() in {'.ytd', '.dds', '.png', '.jpg', '.jpeg'}:
        return 'texture'
    if path.suffix.lower() == '.ymap' or suffixes.endswith('.ymap.xml'):
        return 'ymap'
    return 'unknown'


def build_inventory(raw_root: Path) -> AssetInventory:
    root = raw_root.resolve()
    if not root.is_dir():
        raise ValueError(f'raw root is not a directory: {raw_root}')
    items = []
    for source in sorted((path for path in root.rglob('*') if path.is_file()), key=lambda path: path.relative_to(root).as_posix()):
        relative = source.relative_to(root).as_posix()
        items.append(AssetItem(relative, _category(source), sha256(source.read_bytes()).hexdigest()))
    return AssetInventory(tuple(items))
