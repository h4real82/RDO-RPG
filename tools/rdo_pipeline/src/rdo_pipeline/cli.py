from __future__ import annotations

import argparse
import json
from pathlib import Path

from .inventory import build_inventory
from .manifest import build_manifest, write_runtime_manifest
from .placements import adapt_rdo_placements
from .validate import validate_runtime


def approved_runtime_root(candidate: Path) -> Path:
    repository = Path(__file__).resolve().parents[4]
    approved = (repository / 'data' / 'runtime').resolve()
    resolved = candidate.resolve()
    if resolved != approved and approved not in resolved.parents:
        raise ValueError('runtime output must be within repository data/runtime')
    return resolved


def load_placements(path: Path, available_models: set[str]) -> tuple[list[dict[str, object]], tuple[str, ...]]:
    payload = json.loads(path.read_text(encoding='utf-8'))
    if isinstance(payload, list):
        return payload, ()
    if isinstance(payload, dict) and isinstance(payload.get('placements'), list):
        return payload['placements'], ()
    if isinstance(payload, dict) and isinstance(payload.get('entities'), list):
        adapted = adapt_rdo_placements(payload, available_models)
        return list(adapted.placements), adapted.missing_models
    raise ValueError('placements JSON must be an array or object with placements')


def main() -> int:
    parser = argparse.ArgumentParser(prog='rdo-pipeline')
    commands = parser.add_subparsers(dest='command', required=True)
    build = commands.add_parser('build-valentine')
    build.add_argument('--asset-root', type=Path, required=True)
    build.add_argument('--placements', type=Path, required=True)
    build.add_argument('--runtime-root', type=Path, required=True)
    build.add_argument('--allow-incomplete', action='store_true')
    validate = commands.add_parser('validate-valentine')
    validate.add_argument('--runtime-root', type=Path, required=True)
    args = parser.parse_args()
    if args.command == 'build-valentine':
        inventory = build_inventory(args.asset_root, runtime_prefix='models/valentine')
        available_models = {Path(item.path).stem for item in inventory.items if item.category == 'model'}
        placements, missing = load_placements(args.placements, available_models)
        if missing and not args.allow_incomplete:
            raise ValueError(f'{len(missing)} placement models are unresolved; pass --allow-incomplete only for an explicitly partial test runtime')
        manifest = build_manifest(inventory, placements)
        write_runtime_manifest(
            manifest, inventory, approved_runtime_root(args.runtime_root),
            asset_root=args.asset_root, placement_inputs=[args.placements],
        )
        if missing:
            print(f'partial runtime: {len(missing)} placement models unresolved')
        return 0
    report = validate_runtime(args.runtime_root)
    if report.valid:
        return 0
    print(','.join(report.errors))
    return 1


if __name__ == '__main__':
    raise SystemExit(main())
