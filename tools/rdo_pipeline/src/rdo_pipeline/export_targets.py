from pathlib import Path
from collections import defaultdict
from hashlib import sha256
import os
import re

from .placements import _joaat


def build_export_targets(missing: list[str], name_database: Path) -> dict:
    """Hash-verified name candidates, not guessed model types or resource files."""
    root = name_database.resolve()
    if os.name == 'nt' and not str(root).startswith('\\\\?\\'):
        root = Path('\\\\?\\' + str(root))
    if not root.is_dir():
        raise ValueError('name database directory is missing')
    models = sorted(set(model.lower() for model in missing))
    requested = {model if re.fullmatch(r'0x[0-9a-f]{8}', model) else _joaat(model) for model in models}
    names = defaultdict(lambda: defaultdict(set))
    database_hash = sha256()
    files = sorted(root.rglob('*.txt'))
    for file in files:
        relative = file.relative_to(root).as_posix()
        raw = file.read_bytes()
        database_hash.update(relative.encode('utf-8') + b'\0' + sha256(raw).digest())
        for line in raw.decode('utf-8-sig').splitlines():
            name = line.strip().lower()
            if not name or '/' in name or '\\' in name or name.startswith('#'):
                continue
            hashed = _joaat(name)
            if hashed in requested:
                names[hashed][name].add(relative)
    targets = []
    summary = {'requested': len(models), 'named': 0, 'ambiguous': 0, 'unknown': 0}
    for model in models:
        hashed = model if re.fullmatch(r'0x[0-9a-f]{8}', model) else _joaat(model)
        if model != hashed:
            names[hashed][model].add('placement:modelName')
        candidates = [{'name': name, 'nameSources': sorted(sources)}
                      for name, sources in sorted(names[hashed].items())]
        status = 'unknown' if not candidates else 'name-candidate' if len(candidates) == 1 else 'ambiguous'
        summary[{'name-candidate': 'named', 'ambiguous': 'ambiguous', 'unknown': 'unknown'}[status]] += 1
        targets.append({'model': model, 'hash': hashed, 'status': status, 'candidates': candidates})
    return {'version': 1, 'nameDatabaseSha256': database_hash.hexdigest(),
            'nameDatabaseFileCount': len(files), 'summary': summary, 'targets': targets}
