from __future__ import annotations

import argparse
import json
from pathlib import Path
from hashlib import sha256

from .inventory import build_inventory
from .manifest import build_manifest, write_runtime_manifest
from .placements import adapt_rdo_placements, read_mlo_archetypes, expand_mlo_placements
from .validate import validate_runtime
from .pois import validate_pois
from .infrastructure import build_valentine_traces
from .texture_references import build_texture_reference_report
from .drawable_materials import decode_drawable_materials
from .export_targets import build_export_targets
from .vertex_colors import decode_drawable_vertex_colors
from .shader_database import LocalOodleDecoder, export_matching_programs
from .terrain_placements import build_terrain_placements
from .material_preview import apply_material_preview
from .world_state import select_world_state
from .route_coverage import build_route_coverage
from .placement_recovery import audit_landmark_sources
from .metadata_batch import audit_ymap_batch
from .terrain_coverage import read_source_terrain_bounds, audit_terrain_bounds


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
        placements = []
        for item in payload['placements']:
            placement = dict(item)
            if 'interior' not in placement:
                placement['interior'] = 'interior' in placement.get('tags', [])
            placements.append(placement)
        return placements, ()
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
    recovery = commands.add_parser('audit-landmark-sources')
    recovery.add_argument('--raw-root', type=Path, required=True)
    recovery.add_argument('--runtime-root', type=Path, required=True)
    recovery.add_argument('--model', action='append', required=True)
    terrain_audit = commands.add_parser('audit-terrain-corridor')
    terrain_audit.add_argument('--definition', type=Path, required=True)
    terrain_audit.add_argument('--ymap', type=Path, action='append', required=True)
    terrain_audit.add_argument('--ytyp-root', type=Path, required=True)
    terrain_audit.add_argument('--placements', type=Path, required=True)
    terrain_audit.add_argument('--raw-root', type=Path, required=True)
    terrain_audit.add_argument('--runtime-root', type=Path, required=True)
    metadata = commands.add_parser('audit-placement-metadata')
    metadata.add_argument('--ymap', type=Path, action='append', required=True)
    metadata.add_argument('--expected-count', type=int, required=True)
    metadata.add_argument('--runtime-root', type=Path, required=True)
    route = commands.add_parser('audit-valentine-circuit')
    route.add_argument('--circuit', type=Path, required=True)
    route.add_argument('--placements', type=Path, required=True)
    route.add_argument('--raw-root', type=Path, required=True)
    route.add_argument('--runtime-root', type=Path, required=True)
    targets = commands.add_parser('export-targets')
    targets.add_argument('--missing-models', type=Path, required=True)
    targets.add_argument('--name-database', type=Path, required=True)
    targets.add_argument('--runtime-root', type=Path, required=True)
    drawable_inspect = commands.add_parser('inspect-drawable-materials')
    drawable_inspect.add_argument('--drawable', type=Path, required=True)
    drawable_inspect.add_argument('--runtime-root', type=Path, required=True)
    colors = commands.add_parser('inspect-vertex-colors')
    colors.add_argument('--drawable', type=Path, required=True)
    colors.add_argument('--runtime-root', type=Path, required=True)
    shaders = commands.add_parser('inspect-shader-database')
    shaders.add_argument('--database', type=Path, required=True)
    shaders.add_argument('--runtime-root', type=Path, required=True)
    shaders.add_argument('--oodle-dll', type=Path)
    shaders.add_argument('--name-filter', default='Terrain')
    mlo_inventory = commands.add_parser('inspect-mlo')
    mlo_inventory.add_argument('--archetype-root', type=Path, required=True)
    mlo_inventory.add_argument('--runtime-root', type=Path, required=True)
    build = commands.add_parser('build-valentine')
    build.add_argument('--asset-root', type=Path, required=True)
    build.add_argument('--placements', type=Path, required=True)
    build.add_argument('--runtime-root', type=Path, required=True)
    build.add_argument('--allow-incomplete', action='store_true')
    build.add_argument('--archetype-root', type=Path)
    build.add_argument('--material-preview-root', type=Path,
                       help='reapply verified diffuse preview GLBs after rebuilding base assets')
    terrain = commands.add_parser('add-terrain-tiles')
    terrain.add_argument('--asset-root', type=Path, required=True)
    terrain.add_argument('--ymap', type=Path, action='append', required=True)
    terrain.add_argument('--model', action='append', required=True)
    terrain.add_argument('--runtime-root', type=Path, required=True)
    materials = commands.add_parser('apply-material-preview')
    materials.add_argument('--asset-root', type=Path, required=True)
    materials.add_argument('--runtime-root', type=Path, required=True)
    materials.add_argument('--include-terrain', action='store_true')
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
    if args.command == 'audit-terrain-corridor':
        runtime_root = approved_runtime_root(args.runtime_root)
        trace_path = runtime_root / 'ground-truth-traces.json'
        definition = json.loads(args.definition.read_text(encoding='utf-8'))
        traces = {t['id']: t for t in json.loads(trace_path.read_text(encoding='utf-8'))['traces']}
        points = []
        for span in definition['roadSpans']:
            trace = traces[span['trace']]
            if not 0 <= span['from'] <= span['to'] < len(trace['points']):
                raise ValueError('invalid terrain checkpoint span')
            points.extend({'id': f"{span['trace']}:{i}", **trace['points'][i]}
                          for i in range(span['from'], span['to']+1))
        source = json.loads(args.placements.read_text(encoding='utf-8'))
        for model in definition['landmarkModels']:
            adaptation = adapt_rdo_placements(source, {model})
            matches = [p for p in adaptation.placements if not p['interior']]
            if not matches:
                raise ValueError(f'landmark source placement missing: {model}')
            points.extend({'id': f'{model}:{i}', 'x': p['position']['x'], 'z': p['position']['z']}
                          for i, p in enumerate(matches))
        ytyps = sorted(args.ytyp_root.glob('*ytyp.xml'))
        tiles = read_source_terrain_bounds(args.ymap, ytyps, definition['models'])
        available = {p.name[:-len('.ydr.full')] for p in args.raw_root.rglob('*.ydr.full')}
        report = audit_terrain_bounds(tiles, points, available)
        report['scope'] = definition['scope']
        report['inputs'] = [{'path': p.name, 'sha256': sha256(p.read_bytes()).hexdigest()}
                            for p in [args.definition, trace_path, args.placements, *args.ymap, *ytyps]]
        (runtime_root / 'terrain-corridor-export-targets.json').write_text(
            json.dumps(report, indent=2, sort_keys=True) + '\n', encoding='utf-8')
        print(json.dumps([target['model'] for target in report['exportTargets']]))
        return 0
    if args.command == 'audit-placement-metadata':
        runtime_root = approved_runtime_root(args.runtime_root)
        report = audit_ymap_batch(args.ymap, expected_count=args.expected_count)
        runtime_root.mkdir(parents=True, exist_ok=True)
        (runtime_root / 'placement-metadata-audit.json').write_text(
            json.dumps(report, indent=2, sort_keys=True) + '\n', encoding='utf-8')
        print(json.dumps(report['summary'], sort_keys=True))
        return 0
    if args.command == 'audit-landmark-sources':
        runtime_root = approved_runtime_root(args.runtime_root)
        report = audit_landmark_sources(args.raw_root, args.model)
        runtime_root.mkdir(parents=True, exist_ok=True)
        (runtime_root / 'landmark-source-recovery.json').write_text(
            json.dumps(report, indent=2, sort_keys=True) + '\n', encoding='utf-8')
        print(json.dumps({'summary': report['summary'],
                          'models': {m['model']: m['status'] for m in report['models']}}, sort_keys=True))
        return 0
    if args.command == 'audit-valentine-circuit':
        runtime_root = approved_runtime_root(args.runtime_root)
        manifest_path = runtime_root / 'rdo_world_manifest.json'
        report = build_route_coverage(
            json.loads(args.circuit.read_text(encoding='utf-8')),
            json.loads(args.placements.read_text(encoding='utf-8')),
            json.loads(manifest_path.read_text(encoding='utf-8')), args.raw_root,
        )
        report['inputs'] = [{'path': path.name, 'sha256': sha256(path.read_bytes()).hexdigest()}
                           for path in (args.circuit, args.placements, manifest_path)]
        (runtime_root / 'route-critical-export-targets.json').write_text(
            json.dumps(report, indent=2, sort_keys=True) + '\n', encoding='utf-8')
        print(json.dumps({item['id']: item['status'] for item in report['landmarks']}, sort_keys=True))
        return 0
    if args.command == 'apply-material-preview':
        report = apply_material_preview(args.asset_root, approved_runtime_root(args.runtime_root),
                                        include_terrain=args.include_terrain)
        print(f"material previews applied: {report['promotedModelCount']}")
        return 0
    if args.command == 'inspect-shader-database':
        runtime_root = approved_runtime_root(args.runtime_root)
        raw = args.database.read_bytes()
        decoder = LocalOodleDecoder(args.oodle_dll) if args.oodle_dll else None
        report = export_matching_programs(raw, runtime_root / 'shader-programs',
                                          args.name_filter, args.database.name, decoder)
        print(f"shader programs exported: {report['programCount']}")
        return 0
    if args.command == 'inspect-vertex-colors':
        raw = args.drawable.read_bytes()
        geometries = decode_drawable_vertex_colors(raw)
        runtime_root = approved_runtime_root(args.runtime_root)
        runtime_root.mkdir(parents=True, exist_ok=True)
        report = {'version': 1, 'sourceFile': args.drawable.name,
                  'sourceSha256': sha256(raw).hexdigest(), 'geometries': geometries}
        (runtime_root / 'vertex-colors.json').write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
        print(f'decoded vertex colors for {len(geometries)} geometries')
        return 0
    if args.command == 'inspect-drawable-materials':
        raw = args.drawable.read_bytes()
        bindings = decode_drawable_materials(raw)
        runtime_root = approved_runtime_root(args.runtime_root)
        runtime_root.mkdir(parents=True, exist_ok=True)
        report = {'version': 1, 'sourceFile': args.drawable.name, 'sourceSha256': sha256(raw).hexdigest(), **bindings}
        (runtime_root / 'drawable-material-bindings.json').write_text(json.dumps(report, indent=2, sort_keys=True) + '\n', encoding='utf-8')
        print(f"decoded {len(bindings['geometries'])} geometry bindings and {len(bindings['shaders'])} shaders")
        return 0
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
        archetype_paths = []
        if args.archetype_root is not None:
            if not isinstance(source_payload, dict) or not isinstance(source_payload.get('entities'), list):
                raise ValueError('MLO expansion requires source entities')
            archetype_paths = sorted(args.archetype_root.glob('*ytyp.xml'))
            if not archetype_paths:
                raise ValueError('no YTYP exports found')
            source_payload = expand_mlo_placements(source_payload, read_mlo_archetypes(archetype_paths))
            adapted = adapt_rdo_placements(source_payload, available_models)
            placements, missing = list(adapted.placements), adapted.missing_models
        else:
            placements, missing = load_placements(args.placements, available_models)
        if missing and not args.allow_incomplete:
            raise ValueError(f'{len(missing)} placement models are unresolved; pass --allow-incomplete only for an explicitly partial test runtime')
        world_state = select_world_state(placements, state='default_day')
        placements = list(world_state.accepted)
        manifest = build_manifest(inventory, placements)
        write_runtime_manifest(
            manifest, inventory, approved_runtime_root(args.runtime_root),
            asset_root=args.asset_root, placement_inputs=[args.placements, *archetype_paths],
        )
        if args.material_preview_root is not None:
            if not args.material_preview_root.is_dir():
                raise ValueError('material preview root must be an existing directory')
            material_report = apply_material_preview(args.material_preview_root, approved_runtime_root(args.runtime_root))
            print(f"material previews applied: {material_report['promotedModelCount']}")
        (approved_runtime_root(args.runtime_root) / 'missing-models.json').write_text(json.dumps({'version': 1, 'missingModels': list(missing)}, indent=2) + '\n', encoding='utf-8')
        if missing:
            print(f'partial runtime: {len(missing)} placement models unresolved')
        (approved_runtime_root(args.runtime_root) / 'coverage.json').write_text(json.dumps(build_coverage_report(source_payload, placements, missing), indent=2) + '\n', encoding='utf-8')
        (approved_runtime_root(args.runtime_root) / 'world-state-report.json').write_text(json.dumps({
            'version': 1,
            'state': 'default_day',
            'acceptedCount': len(world_state.accepted),
            'excludedCount': len(world_state.excluded),
            'excluded': list(world_state.excluded),
        }, indent=2, sort_keys=True) + '\n', encoding='utf-8')
        return 0
    if args.command == 'add-terrain-tiles':
        runtime_root = approved_runtime_root(args.runtime_root)
        manifest_path = runtime_root / 'rdo_world_manifest.json'
        base_payload = json.loads(manifest_path.read_text(encoding='utf-8'))
        if not isinstance(base_payload, dict) or base_payload.get('world') != 'valentine':
            raise ValueError('terrain integration requires an existing Valentine manifest')
        base_manifest_hash = sha256(manifest_path.read_bytes()).hexdigest()
        inventory = build_inventory(args.asset_root, runtime_prefix='models/valentine')
        available_models = {Path(item.path).stem for item in inventory.items if item.category == 'model'}
        base_placements, missing = load_placements(manifest_path, available_models)
        if missing:
            raise ValueError('existing manifest contains unresolved models')
        terrain_placements = build_terrain_placements(args.ymap, args.model)
        manifest = build_manifest(inventory, [*base_placements, *terrain_placements])
        write_runtime_manifest(manifest, inventory, runtime_root, asset_root=args.asset_root,
                               placement_inputs=args.ymap)
        report_path = runtime_root / 'terrain-placement-report.json'
        report = {
            'version': 1,
            'baseManifestSha256': base_manifest_hash,
            'manifestSha256': sha256(manifest_path.read_bytes()).hexdigest(),
            'terrainModelCount': len(terrain_placements),
            'placements': terrain_placements,
            'ymaps': [{'file': path.name, 'sha256': sha256(path.read_bytes()).hexdigest()} for path in args.ymap],
        }
        report_path.write_text(json.dumps(report, indent=2, sort_keys=True) + '\n', encoding='utf-8')
        print(f"terrain placements added: {len(terrain_placements)}; total: {len(manifest['placements'])}")
        return 0
    if args.command == 'export-targets':
        runtime_root = approved_runtime_root(args.runtime_root)
        raw = args.missing_models.read_bytes()
        missing = json.loads(raw)['missingModels']
        report = build_export_targets(missing, args.name_database)
        report['missingModelsSha256'] = sha256(raw).hexdigest()
        runtime_root.mkdir(parents=True, exist_ok=True)
        (runtime_root / 'export-targets.json').write_text(json.dumps(report, indent=2, sort_keys=True) + '\n', encoding='utf-8')
        print(json.dumps(report['summary'], sort_keys=True))
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
        trace_payload = {'version': 1, 'world': 'valentine', 'coordinateSpace': 'three-right-handed', 'bounds': {'minX': bounds[0], 'maxX': bounds[1], 'minZ': bounds[2], 'maxZ': bounds[3]}, 'traces': build_valentine_traces(args.roads, args.rails, bounds=bounds)}
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
