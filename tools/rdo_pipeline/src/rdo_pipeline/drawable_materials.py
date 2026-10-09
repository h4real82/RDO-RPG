"""Read RDR3 OpenIV .ydr.full material bindings, without guessing shader semantics.

Layout references: Sage-of-Mirrors/librdr3 drawabledata.cpp, loddata.cpp;
citizenfx/fivem rage-formats-x/include/rmcDrawable.h (RDR3 parameter indices
are 8-bit, texture-reference name pointer at 0x28). No pixel decoding here.
"""
from __future__ import annotations

import struct
from pathlib import Path
from typing import Any


_TERRAIN_TEXTURE_PARAMETERS = (
    ('lookup', '0xc075f9b6'),
    ('layer0', '0xce7b968e'),
    ('layer1', '0xd883aa9e'),
    ('layer2', '0x32b9df09'),
    ('layer3', '0x3d10f3b7'),
)


def terrain_material_metadata(plan: dict[str, Any]) -> dict[str, str]:
    if plan.get('reason') is not None or not isinstance(plan.get('lookup'), str):
        return {}
    layers = plan.get('layers')
    if not isinstance(layers, list) or len(layers) != 4 or not all(isinstance(path, str) for path in layers):
        return {}
    metadata = {
        'rdo_material_status': 'terrain-four-layer-preview',
        'rdo_terrain_lookup': Path(plan['lookup']).name,
    }
    metadata.update({f'rdo_terrain_layer{index}': Path(path).name for index, path in enumerate(layers)})
    return metadata


def terrain_texture_plan(bindings: dict[str, Any], texture_files: dict[str, list[str]]) -> list[dict[str, Any]]:
    """Resolve the exact lookup and four diffuse references used by RDR terrain shaders."""
    def resolve(paths: list[str]) -> str | None:
        if len(paths) == 1:
            return paths[0]
        hd = [path for path in paths
              if Path(path).parent.name.lower().endswith(('+hi', '+hidr', '_hi', '_hidr'))]
        return hd[0] if len(hd) == 1 else None

    plan = []
    for shader in bindings['shaders']:
        resolved: dict[str, str] = {}
        valid = True
        for role, parameter_hash in _TERRAIN_TEXTURE_PARAMETERS:
            names = [entry['name'] for entry in shader['textures']
                     if entry['parameterHash'] == parameter_hash and entry['name']]
            paths = texture_files.get(names[0].lower(), []) if len(names) == 1 else []
            path = resolve(paths)
            if path is None:
                valid = False
                break
            resolved[role] = path
        plan.append({
            'shaderHash': shader['hash'],
            'lookup': resolved['lookup'] if valid else None,
            'layers': [resolved[f'layer{index}'] for index in range(4)] if valid else [],
            'reason': None if valid else 'unresolved-terrain-texture',
        })
    return plan


def diffuse_texture_plan(bindings: dict[str, Any], texture_files: dict[str, list[str]]) -> list[dict[str, Any]]:
    """Only resolve a single exact DiffuseTex parameter; no suffix inference."""
    plan = []
    for shader in bindings['shaders']:
        diffuse = [entry['name'] for entry in shader['textures']
                   if entry['parameterHash'] == '0xc8e8c282' and entry['name']]
        paths = texture_files.get(diffuse[0].lower(), []) if len(diffuse) == 1 else []
        reason = ('unsupported-diffuse-binding' if len(diffuse) != 1 else
                  'missing-texture' if not paths else 'ambiguous-texture' if len(paths) != 1 else None)
        plan.append({'path': paths[0] if reason is None else None, 'reason': reason,
                     'shaderHash': shader['hash'], 'sourceTextures': shader['textures']})
    return plan


def decode_drawable_materials(data: bytes) -> dict[str, Any]:
    def read(fmt: str, offset: int):
        size = struct.calcsize(fmt)
        if offset < 0 or offset + size > len(data):
            raise ValueError('drawable read outside resource bounds')
        return struct.unpack_from(fmt, data, offset)[0]

    def pointer(offset: int, *, nullable: bool = False) -> int:
        raw = read('<Q', offset)
        if raw == 0 and nullable:
            return 0
        if raw >> 28 != 5:
            raise ValueError('expected a system resource pointer')
        target = raw & 0x0fffffff
        if target == 0 or target >= len(data):
            raise ValueError('drawable pointer outside resource bounds')
        return target

    def name(texture: int) -> str | None:
        if texture == 0:
            return None
        start = pointer(texture + 40)
        end = data.find(b'\0', start, min(len(data), start + 256))
        if end == -1:
            raise ValueError('unterminated texture name')
        value = data[start:end].decode('ascii')
        if not value or any(ord(char) < 32 or ord(char) > 126 for char in value):
            raise ValueError('invalid texture name')
        return value

    group = pointer(16)
    shader_count = read('<H', group + 24)
    shader_array = pointer(group + 16, nullable=shader_count == 0)
    shaders = []
    for index in range(shader_count):
        shader = pointer(shader_array + index * 8)
        parameters = pointer(shader + 32)
        texture_count = read('<B', parameters + 1)
        buffer_count = read('<B', parameters)
        buffer_array = pointer(shader + 8, nullable=buffer_count == 0)
        texture_array = pointer(shader + 16, nullable=texture_count == 0)
        parameter_count = read('<I', parameters + 4)
        if parameter_count > (len(data) - parameters - 8) // 8:
            raise ValueError('shader parameter array outside resource bounds')
        textures = []
        constants = []
        for parameter_index in range(parameter_count):
            parameter = parameters + 8 + parameter_index * 8
            packed = read('<I', parameter + 4)
            if packed & 3 == 3:
                # Cfx sgaShaderParamName: 2-bit class, 6-bit cbuffer,
                # 12-bit byte offset and 12-bit byte length. No type guessing.
                buffer_index = (packed >> 2) & 63
                if buffer_index >= buffer_count:
                    raise ValueError('constant buffer index outside shader table')
                start = pointer(buffer_array + buffer_index * 8)
                offset = (packed >> 8) & 4095
                length = packed >> 20
                if start + offset + length > len(data):
                    raise ValueError('constant bytes outside resource bounds')
                constants.append({'parameterHash': f"0x{read('<I', parameter):08x}",
                                  'buffer': buffer_index, 'offset': offset,
                                  'bytes': data[start + offset:start + offset + length].hex()})
                continue
            if packed & 3 != 0:
                continue
            slot = (packed >> 2) & 255
            if slot >= texture_count:
                raise ValueError('texture slot outside shader texture table')
            texture = pointer(texture_array + slot * 8, nullable=True)
            textures.append({'parameterHash': f"0x{read('<I', parameter):08x}",
                             'slot': slot, 'name': name(texture)})
        # RDR3 grcInstanceData layout, not GTA V's shader layout.
        # Preserve raw bucket metadata; it alone does not prove visibility.
        shaders.append({'hash': f"0x{read('<I', shader):08x}", 'textures': textures,
                        'constants': constants,
                        'drawBucket': read('<B', shader + 57),
                        'drawBucketMask': read('<I', shader + 60)})

    geometries = []
    models = []
    for lod_index in range(4):
        lod = pointer(80 + lod_index * 8, nullable=True)
        if not lod:
            continue
        model_count = read('<H', lod + 8)
        model_array = pointer(lod, nullable=model_count == 0)
        for model_index in range(model_count):
            model = pointer(model_array + model_index * 8)
            # grmModel's mask byte is distinct from the material draw bucket.
            models.append({'lod': lod_index, 'model': model_index,
                           'renderMask': read('<B', model + 52)})
            geometry_count = read('<H', model + 16)
            index_count = read('<H', model + 54)
            if index_count != geometry_count:
                raise ValueError('geometry and shader index counts differ')
            indices = pointer(model + 32, nullable=index_count == 0)
            for geometry_index in range(geometry_count):
                shader_index = read('<H', indices + geometry_index * 2)
                if shader_index >= shader_count:
                    raise ValueError('geometry shader index outside shader table')
                geometries.append({'lod': lod_index, 'model': model_index,
                                   'geometry': geometry_index, 'shader': shader_index})
    return {'shaders': shaders, 'geometries': geometries, 'models': models}
