import importlib.util
import struct

import pytest


def fixture_drawable():
    data = bytearray(1024)
    def pointer(offset, target):
        struct.pack_into('<Q', data, offset, 0x50000000 | target)
    pointer(16, 0x100)
    pointer(0x110, 0x140)
    struct.pack_into('<H', data, 0x118, 1)
    pointer(0x140, 0x180)
    struct.pack_into('<I', data, 0x180, 0x12345678)
    pointer(0x190, 0x240)
    pointer(0x1a0, 0x200)
    data[0x201] = 1
    struct.pack_into('<I', data, 0x204, 1)
    struct.pack_into('<II', data, 0x208, 0xc8e8c282, 0)
    pointer(0x240, 0x280)
    pointer(0x2a8, 0x300)
    data[0x300:0x30b] = b'fixture_al\0'
    pointer(80, 0x340)
    pointer(0x340, 0x360)
    struct.pack_into('<H', data, 0x348, 1)
    pointer(0x360, 0x380)
    struct.pack_into('<H', data, 0x390, 2)
    pointer(0x3a0, 0x3c0)
    struct.pack_into('<H', data, 0x3b6, 2)
    return data


def decoder():
    assert importlib.util.find_spec('rdo_pipeline.drawable_materials') is not None
    from rdo_pipeline.drawable_materials import decode_drawable_materials
    return decode_drawable_materials


def test_decodes_exact_geometry_shader_texture_parameter_binding():
    result = decoder()(fixture_drawable())
    assert result['shaders'] == [{'hash': '0x12345678', 'drawBucket': 0, 'drawBucketMask': 0, 'textures': [
        {'parameterHash': '0xc8e8c282', 'slot': 0, 'name': 'fixture_al'},
    ]}]
    assert result['geometries'] == [
        {'lod': 0, 'model': 0, 'geometry': 0, 'shader': 0},
        {'lod': 0, 'model': 0, 'geometry': 1, 'shader': 0},
    ]


def test_reads_model_render_mask_separately_from_shader_bucket():
    data = fixture_drawable()
    data[0x380 + 52] = 0xe0
    result = decoder()(data)
    assert result.get('models') == [{'lod': 0, 'model': 0, 'renderMask': 224}]


def test_rejects_out_of_bounds_resource_pointer():
    data = fixture_drawable()
    struct.pack_into('<Q', data, 16, 0x50002000)
    with pytest.raises(ValueError, match='bounds'):
        decoder()(data)


def test_preserves_rdr3_shader_render_bucket_without_inventing_visibility():
    data = fixture_drawable()
    data[0x180 + 57] = 7
    struct.pack_into('<I', data, 0x180 + 60, 0xff80)
    shader = decoder()(data)['shaders'][0]
    assert shader.get('drawBucket') == 7
    assert shader.get('drawBucketMask') == 0xff80


def test_rejects_geometry_shader_index_outside_shader_table():
    data = fixture_drawable()
    struct.pack_into('<H', data, 0x3c0, 1)
    with pytest.raises(ValueError, match='shader index'):
        decoder()(data)


def test_diffuse_plan_uses_parameter_hash_and_rejects_ambiguous_files():
    from rdo_pipeline import drawable_materials
    assert callable(getattr(drawable_materials, 'diffuse_texture_plan', None))
    bindings = {'shaders': [
        {'hash': '0x12345678', 'textures': [{'parameterHash': '0xc8e8c282', 'slot': 0, 'name': 'wall_al'}]},
        {'hash': '0x12345678', 'textures': [{'parameterHash': '0x00000001', 'slot': 0, 'name': 'wall_al'}]},
    ]}
    plan = drawable_materials.diffuse_texture_plan(bindings, {'wall_al': ['wall.png']})
    assert plan[0]['path'] == 'wall.png'
    assert plan[1]['path'] is None
    ambiguous = drawable_materials.diffuse_texture_plan(bindings, {'wall_al': ['one.png', 'two.png']})
    assert ambiguous[0]['path'] is None
    assert ambiguous[0]['reason'] == 'ambiguous-texture'
