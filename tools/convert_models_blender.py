#!/usr/bin/env python3
r"""Headless fallback exporter for static RDR2 YDR drawables.

Run through the bundled Blender, e.g.:
  blender.exe --background --python tools/convert_models_blender.py -- --input-dir D:\...\models --output-dir D:\...\models_glb

It intentionally exports without skins/animations. The fallback is restricted to
models whose normal GLB export fails because RedDeadBlend2 produces an invalid
armature relationship; it never overwrites an existing GLB.
"""

from __future__ import annotations

import argparse
import os
import shutil
import sys
import re
from pathlib import Path
from tempfile import TemporaryDirectory

import bpy

sys.path.insert(0, os.fspath(Path(__file__).resolve().parent / 'rdo_pipeline' / 'src'))
from rdo_pipeline.drawable_materials import decode_drawable_materials, diffuse_texture_plan


def parse_args() -> argparse.Namespace:
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument('--input-dir', type=Path, required=True)
    parser.add_argument('--output-dir', type=Path, required=True)
    parser.add_argument('--only', action='append', default=[])
    parser.add_argument('--texture-root', type=Path)
    return parser.parse_args(argv)


def clear_scene() -> None:
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    for collection in (bpy.data.meshes, bpy.data.armatures, bpy.data.materials):
        for item in list(collection):
            if item.users == 0:
                collection.remove(item)


def discover_models(input_dir: Path, only: set[str]) -> list[tuple[str, Path, bool]]:
    models: list[tuple[str, Path, bool]] = []
    for entry in sorted(input_dir.iterdir()):
        if entry.is_file() and entry.suffix.lower() == '.ydr':
            name, source, is_full = entry.stem, entry, False
        elif entry.is_dir():
            match = next((candidate for candidate in entry.iterdir() if candidate.name.lower().endswith('.ydr.full')), None)
            if match is None:
                continue
            name, source, is_full = (entry.name[:-4] if entry.name.lower().endswith('_ydr') else entry.name), match, True
        else:
            continue
        if not only or name in only:
            models.append((name, source, is_full))
    return models


def remove_skinning() -> None:
    for obj in list(bpy.data.objects):
        if obj.type == 'ARMATURE':
            bpy.data.objects.remove(obj, do_unlink=True)
            continue
        for modifier in list(obj.modifiers):
            if modifier.type == 'ARMATURE':
                obj.modifiers.remove(modifier)


def bind_diffuse_materials(source: Path, texture_files: dict[str, list[str]]) -> None:
    bindings = decode_drawable_materials(source.read_bytes())
    plan = diffuse_texture_plan(bindings, texture_files)
    materials = []
    for index, entry in enumerate(plan):
        material = bpy.data.materials.new(f'shader_{index}_{entry["shaderHash"]}')
        material.use_nodes = True
        material['rdo_shader_hash'] = entry['shaderHash']
        material['rdo_material_status'] = 'diffuse-only' if entry['path'] else entry['reason']
        if entry['path']:
            image_node = material.node_tree.nodes.new('ShaderNodeTexImage')
            image_node.image = bpy.data.images.load(entry['path'], check_existing=True)
            image_node.image.colorspace_settings.name = 'sRGB'
            principled = material.node_tree.nodes.get('Principled BSDF')
            material.node_tree.links.new(image_node.outputs['Color'], principled.inputs['Base Color'])
        materials.append(material)
    objects = {}
    for obj in bpy.data.objects:
        if obj.type != 'MESH':
            continue
        match = re.match(r'geometry(\d+)__model(\d+)__lod_(hi|med|low|vlow)__', obj.name)
        if match:
            key = (('hi', 'med', 'low', 'vlow').index(match[3]), int(match[2]), int(match[1]))
            if key in objects:
                raise ValueError('ambiguous imported geometry identity')
            objects[key] = obj
    for binding in bindings['geometries']:
        key = (binding['lod'], binding['model'], binding['geometry'])
        obj = objects.pop(key, None)
        if obj is None:
            raise ValueError(f'missing imported geometry {key}')
        obj.data.materials.clear()
        obj.data.materials.append(materials[binding['shader']])
    if objects:
        raise ValueError('imported geometry has no source shader binding')
    print(f'diffuse textures bound: {sum(entry["path"] is not None for entry in plan)}/{len(plan)} shaders')


def main() -> int:
    args = parse_args()
    args.output_dir.mkdir(parents=True, exist_ok=True)
    try:
        bpy.ops.preferences.addon_enable(module='RedDeadBlend2')
    except Exception as error:
        print(f'Cannot enable RedDeadBlend2: {error}', file=sys.stderr)
        return 1
    failures: list[str] = []
    texture_files: dict[str, list[str]] = {}
    if args.texture_root:
        for texture in sorted(args.texture_root.rglob('*.png')):
            texture_files.setdefault(texture.stem.lower(), []).append(os.fspath(texture.resolve()))
    for name, source, is_full in discover_models(args.input_dir, set(args.only)):
        destination = args.output_dir / f'{name}.glb'
        if destination.exists():
            continue
        clear_scene()
        try:
            if is_full:
                # The importer requires .ydr, but raw exports must remain read-only.
                # Import is synchronous, so the copy can be removed before GLB export.
                with TemporaryDirectory(prefix='rdo-drawable-') as staging:
                    import_path = Path(staging) / f'{name}.ydr'
                    shutil.copyfile(source, import_path)
                    bpy.ops.import_mesh.ydr(filepath=os.fspath(import_path))
            else:
                bpy.ops.import_mesh.ydr(filepath=os.fspath(source))
            remove_skinning()
            if args.texture_root:
                bind_diffuse_materials(source, texture_files)
            bpy.ops.export_scene.gltf(filepath=os.fspath(destination), export_format='GLB', use_selection=False, export_apply=True, export_skins=False, export_animations=False, export_extras=True)
            if not destination.is_file() or destination.stat().st_size == 0:
                raise RuntimeError('Blender did not produce a non-empty GLB')
            print(f'converted {name}')
        except Exception as error:
            destination.unlink(missing_ok=True)
            failures.append(name)
            print(f'failed {name}: {error}', file=sys.stderr)
        finally:
            clear_scene()
    if failures:
        print(f'failed models: {",".join(failures)}', file=sys.stderr)
        return 1
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
