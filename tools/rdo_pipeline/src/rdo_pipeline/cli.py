from __future__ import annotations

import argparse
import json
from pathlib import Path

from .inventory import build_inventory
from .manifest import build_manifest, write_runtime_manifest
from .validate import validate_runtime


def _placements(path: Path) -> list[dict[str, object]]:
    payload = json.loads(path.read_text(encoding='utf-8'))
    if isinstance(payload, list):
        return payload
    if isinstance(payload, dict) and isinstance(payload.get('placements'), list):
        return payload['placements']
    raise ValueError('placements JSON must be an array or object with placements')


def main() -> int:
    parser = argparse.ArgumentParser(prog='rdo-pipeline')
    commands = parser.add_subparsers(dest='command', required=True)
    build = commands.add_parser('build-valentine')
    build.add_argument('--asset-root', type=Path, required=True)
    build.add_argument('--placements', type=Path, required=True)
    build.add_argument('--runtime-root', type=Path, required=True)
    validate = commands.add_parser('validate-valentine')
    validate.add_argument('--runtime-root', type=Path, required=True)
    args = parser.parse_args()
    if args.command == 'build-valentine':
        inventory = build_inventory(args.asset_root)
        manifest = build_manifest(inventory, _placements(args.placements))
        write_runtime_manifest(manifest, inventory, args.runtime_root)
        return 0
    report = validate_runtime(args.runtime_root)
    if report.valid:
        return 0
    print(','.join(report.errors))
    return 1


if __name__ == '__main__':
    raise SystemExit(main())
