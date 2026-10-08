from __future__ import annotations

import argparse
import json
from pathlib import Path

from .inventory import build_inventory
from .manifest import build_manifest, write_runtime_manifest
from .placements import adapt_rdo_placements, read_mlo_archetypes
from .validate import validate_runtime
from .pois import validate_pois
from .infrastructure import build_valentine_traces
from .texture_references import build_texture_reference_report


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


def build_coverage_report(payload: object, placements: tuple[dict[str, object], ...] | list[dict[str, object]], missing_models: tuple[str, ...]) -> dict[str, object]:
    entities = payload.get('entities', []) if isinstance(payload, dict) else []
    entity_count = len(entities) if isinstance(entities, list) else 0
    return {
        'version': 1,
        'entityCount': entity_count,
        'renderableEntityCount': len(placements),
        'unresolvedEntityCount': max(0, entity_count - len(placements)),
        'uniqueUnresolvedModelCount': len(missing_models),
        'missingModels': list(missing_models),
    }


def main() -> int:
    parser = argparse.ArgumentParser(prog='rdo-pipeline')
    commands = parser.add_subparsers(dest='command', required=True)
    mlo_inventory = commands.add_parser('inspect-mlo')
    mlo_inventory.add_argument('--archetype-root', type=Path, required=True)
    mlo_inventory.add_argument('--runtime-root', type=Path, required=True)
    build = commands.add_parser('build-valentine')
    build.add_argument('--asset-root', type=Path, required=True)
    build.add_argument('--placements', type=Path, required=True)
    build.add_argument('--runtime-root', type=Path, required=True)
    build.add_argument('--allow-incomplete', action='store_true')
    validate = commands.add_parser('validate-valentine')
    validate.add_argument('--runtime-root', type=Path, required=True)
    validate.add_argument('--pois', type=Path)
    traces = commands.add_parser('extract-valentine-traces')
    traces.add_argument('--runtime-root', type=Path, required=True)
    traces.add_argument('--roads', type=Path, required=True)
    traces.add_argument('--rails', type=Path, required=True)
    texture_coverage = commands.add_parser('texture-coverage')
    texture_coverage.add_argument('--asset-root', type=Path, required=True)
    texture_coverage.add_argument('--model-root', type=Path, required=True)
    texture_coverage.add_argument('--texture-root', type=Path, required=True)
    texture_coverage.add_argument('--runtime-root', type=Path, required=True)
    args = parser.parse_args()
    if args.command == 'inspect-mlo':
        archetypes = read_mlo_archetypes(list(args.archetype_root.glob('*ytyp.xml')))
        runtime_root = approved_runtime_root(args.runtime_root)
        runtime_root.mkdir(parents=True, exist_ok=True)
        report = {'version': 1, 'coordinateSpace': 'game-local', 'renderable': False,
                  'archetypes': archetypes}
        (runtime_root / 'mlo-archetypes.json').write_text(json.dumps(report, indent=2, sort_keys=True) + '\n', encoding='utf-8')
        print(f'MLO definitions: {len(archetypes)}; local-space only, no optional sets activated')
        return 0
    if args.command == 'build-valentine':
        inventory = build_inventory(args.asset_root, runtime_prefix='models/valentine')
        available_models = {Path(item.path).stem for item in inventory.items if item.category == 'model'}
        source_payload = json.loads(args.placements.read_text(encoding='utf-8'))
        placements, missing = load_placements(args.placements, available_models)
        if missing and not args.allow_incomplete:
            raise ValueError(f'{len(missing)} placement models are unresolved; pass --allow-incomplete only for an explicitly partial test runtime')
        manifest = build_manifest(inventory, placements)
        write_runtime_manifest(
            manifest, inventory, approved_runtime_root(args.runtime_root),
            asset_root=args.asset_root, placement_inputs=[args.placements],
        )
        (approved_runtime_root(args.runtime_root) / 'missing-models.json').write_text(json.dumps({'version': 1, 'missingModels': list(missing)}, indent=2) + '\n', encoding='utf-8')
        if missing:
            print(f'partial runtime: {len(missing)} placement models unresolved')
        (approved_runtime_root(args.runtime_root) / 'coverage.json').write_text(json.dumps(build_coverage_report(source_payload, placements, missing), indent=2) + '\n', encoding='utf-8')
        return 0
    if args.command == 'extract-valentine-traces':
        runtime_root = approved_runtime_root(args.runtime_root)
        manifest = json.loads((runtime_root / 'rdo_world_manifest.json').read_text(encoding='utf-8'))
        positions = [placement['position'] for placement in manifest.get('placements', [])]
        if not positions:
            raise ValueError('runtime manifest has no placements for a deterministic Valentine trace boundary')
        padding = 250.0
        bounds = (
            min(position['x'] for position in positions) - padding,
            max(position['x'] for position in positions) + padding,
            min(position['z'] for position in positions) - padding,
            max(position['z'] for position in positions) + padding,
        )
        trace_payload = {'version': 1, 'world': 'valentine', 'bounds': {'minX': bounds[0], 'maxX': bounds[1], 'minZ': bounds[2], 'maxZ': bounds[3]}, 'traces': build_valentine_traces(args.roads, args.rails, bounds=bounds)}
        (runtime_root / 'ground-truth-traces.json').write_text(json.dumps(trace_payload, indent=2, sort_keys=True) + '\n', encoding='utf-8')
        return 0
    if args.command == 'texture-coverage':
        inventory = build_inventory(args.asset_root, runtime_prefix='models/valentine')
        available_models = {Path(item.path).stem for item in inventory.items if item.category == 'model'}
        report = build_texture_reference_report(args.model_root, args.texture_root, available_models)
        runtime_root = approved_runtime_root(args.runtime_root)
        runtime_root.mkdir(parents=True, exist_ok=True)
        (runtime_root / 'texture-coverage.json').write_text(json.dumps(report, indent=2, sort_keys=True) + '\n', encoding='utf-8')
        print(f"texture coverage: {report['summary']['availableTextureCount']}/{report['summary']['referencedTextureCount']} exported references")
        return 0
    report = validate_runtime(args.runtime_root)
    if args.pois:
        poi_report = validate_pois(approved_runtime_root(args.runtime_root), args.pois)
        if not poi_report.valid:
            print(','.join(poi_report.errors))
            return 1
    if report.valid:
        return 0
    print(','.join(report.errors))
    return 1


if __name__ == '__main__':
    raise SystemExit(main())
