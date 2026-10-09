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
from typing import Callable

import bpy

sys.path.insert(0, os.fspath(Path(__file__).resolve().parent / 'rdo_pipeline' / 'src'))
from rdo_pipeline.drawable_materials import (
    decode_drawable_materials,
    diffuse_texture_plan,
    terrain_material_metadata,
    terrain_texture_plan,
)
from rdo_pipeline.vertex_colors import decode_drawable_vertex_colors


def parse_args() -> argparse.Namespace:
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument('--input-dir', type=Path, required=True)
    parser.add_argument('--output-dir', type=Path, required=True)
    parser.add_argument('--only', action='append', default=[])
    parser.add_argument('--texture-root', type=Path)
    parser.add_argument('--terrain-texture-output-dir', type=Path)
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
            sources = sorted(candidate for candidate in entry.rglob('*')
                             if candidate.is_file() and candidate.name.lower().endswith('.ydr.full'))
            for source in sources:
                name = source.name[:-len('.ydr.full')]
                if not only or name in only:
                    models.append((name, source, True))
            continue
        else:
            continue
        if not only or name in only:
            models.append((name, source, is_full))
    names = [name for name, _, _ in models]
    if len(names) != len(set(names)):
        raise ValueError('input contains multiple YDR sources with the same model name')
    return models


def remove_skinning() -> None:
    for obj in list(bpy.data.objects):
        if obj.type == 'ARMATURE':
            bpy.data.objects.remove(obj, do_unlink=True)
            continue
        for modifier in list(obj.modifiers):
            if modifier.type == 'ARMATURE':
                obj.modifiers.remove(modifier)


def bind_diffuse_materials(source: Path, texture_files: dict[str, list[str]], terrain_texture_output_dir: Path | None) -> None:
    bindings = decode_drawable_materials(source.read_bytes())
    plan = diffuse_texture_plan(bindings, texture_files)
    terrain_plan = terrain_texture_plan(bindings, texture_files)
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
        elif terrain_texture_output_dir is not None:
            metadata = terrain_material_metadata(terrain_plan[index])
            if metadata:
                terrain_texture_output_dir.mkdir(parents=True, exist_ok=True)
                referenced = [terrain_plan[index]['lookup'], *terrain_plan[index]['layers']]
                for texture in referenced:
                    destination = terrain_texture_output_dir / Path(texture).name
                    if destination.exists() and destination.read_bytes() != Path(texture).read_bytes():
                        raise ValueError(f'conflicting staged terrain texture: {destination.name}')
                    if not destination.exists():
                        shutil.copyfile(texture, destination)
                for key, value in metadata.items():
                    material[key] = value
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


def prepare_exact_vertex_colors(source: Path) -> tuple[int, int, Callable[[], None]]:
    """Verify imported point colors against YDR bytes and expose exact FLOAT data to GLB.

    Blender 3.2's bundled glTF exporter enumerates legacy CORNER color layers.
    The importer uses FLOAT_COLOR/POINT, so a temporary byte layer is only an
    enumeration bridge; patched accessors read the original, verified floats.
    """
    mesh_objects = [obj for obj in bpy.data.objects if obj.type == 'MESH']
    colored_objects = [obj for obj in mesh_objects if getattr(obj.data, 'color_attributes', None)]
    if not colored_objects:
        return 0, 0, lambda: None

    source_colors = decode_drawable_vertex_colors(source.read_bytes())
    if len(source_colors) != len(mesh_objects) or len(colored_objects) != len(mesh_objects):
        raise ValueError('imported mesh coverage differs from source vertex-color geometry coverage')
    source_by_geometry = {
        (entry['lod'], entry['model'], entry['geometry']): entry
        for entry in source_colors
    }
    lod_indices = {'hi': 0, 'med': 1, 'low': 2, 'vlow': 3}
    verified_channels = 0
    for obj in colored_objects:
        match = re.match(r'geometry(\d+)__model(\d+)__lod_(hi|med|low|vlow)__', obj.name)
        if not match:
            raise ValueError(f'unrecognized imported geometry identity: {obj.name}')
        geometry_id = (lod_indices[match[3]], int(match[2]), int(match[1]))
        source_entry = source_by_geometry.get(geometry_id)
        if source_entry is None or source_entry['vertexCount'] != len(obj.data.vertices):
            raise ValueError(f'imported vertex count or identity differs from YDR: {geometry_id}')
        source_by_channel = {item['channel']: item['values'] for item in source_entry['channels']}
        for channel in range(4):
            attribute = obj.data.color_attributes.get(f'color_{channel}')
            if attribute is None or attribute.domain != 'POINT':
                raise ValueError(f'missing point color channel {channel}: {obj.name}')
            expected = source_by_channel.get(channel, [[0.0, 0.0, 0.0, 0.0]] * len(obj.data.vertices))
            actual = [tuple(item.color) for item in attribute.data]
            if actual != [tuple(item) for item in expected]:
                raise ValueError(f'imported color channel differs from YDR: {obj.name} channel {channel}')
            verified_channels += 1

    import numpy as np
    from io_scene_gltf2.blender.exp import gltf2_blender_extract
    from io_scene_gltf2.blender.exp import gltf2_blender_gather_primitive_attributes as gather

    for obj in colored_objects:
        mesh = obj.data
        for attribute in list(mesh.color_attributes):
            if attribute.domain != 'POINT':
                continue
            corner_name = f'{attribute.name}_rdo_corner'
            if mesh.color_attributes.get(corner_name) is not None:
                raise ValueError(f'temporary glTF color layer already exists: {corner_name}')
            corner = mesh.color_attributes.new(corner_name, 'BYTE_COLOR', 'CORNER')
            for loop in mesh.loops:
                corner.data[loop.index].color = attribute.data[loop.vertex_index].color

    def exact_point_colors(mesh, color_index):
        layer_name = mesh.vertex_colors[color_index].name
        attribute = mesh.color_attributes.get(layer_name.removesuffix('_rdo_corner'))
        if attribute is None or attribute.domain != 'POINT':
            raise ValueError(f'could not resolve original point color attribute: {layer_name}')
        return np.asarray([tuple(attribute.data[loop.vertex_index].color)
                           for loop in mesh.loops], dtype=np.float32)

    def exact_float_accessors(primitive, settings):
        attributes = {}
        if settings[gather.gltf2_blender_export_keys.COLORS]:
            for channel in range(4):
                key = f'COLOR_{channel}'
                values = primitive['attributes'].get(key)
                if values is None:
                    break
                colors = np.asarray(values, dtype=np.float32).reshape(-1, 4)
                attributes[key] = gather.gltf2_io.Accessor(
                    buffer_view=gather.gltf2_io_binary_data.BinaryData(colors.tobytes()),
                    byte_offset=None, component_type=5126, count=len(colors),
                    extensions=None, extras=None, max=None, min=None, name=None,
                    normalized=False, sparse=None, type='VEC4')
        return attributes

    original_get_colors = gltf2_blender_extract.__get_colors
    original_gather_colors = gather.__gather_colors
    gltf2_blender_extract.__get_colors = exact_point_colors
    gather.__gather_colors = exact_float_accessors

    def restore_exporter() -> None:
        gltf2_blender_extract.__get_colors = original_get_colors
        gather.__gather_colors = original_gather_colors

    return len(colored_objects), verified_channels, restore_exporter


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
                bind_diffuse_materials(source, texture_files, args.terrain_texture_output_dir)
            color_meshes, color_channels, restore_color_export = prepare_exact_vertex_colors(source)
            if color_meshes:
                print(f'verified exact source vertex colors: {color_channels} channels on {color_meshes} meshes')
            try:
                bpy.ops.export_scene.gltf(filepath=os.fspath(destination), export_format='GLB', use_selection=False, export_apply=True, export_skins=False, export_animations=False, export_extras=True)
            finally:
                restore_color_export()
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
