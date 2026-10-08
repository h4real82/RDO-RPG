from pathlib import Path

from rdo_pipeline.texture_references import build_texture_reference_report


def test_texture_reference_report_keeps_only_exported_source_textures(tmp_path: Path) -> None:
    models = tmp_path / 'models'
    textures = tmp_path / 'textures'
    model = models / 'val_test_ydr' / 'val_test.ydr.full'
    model.parent.mkdir(parents=True)
    model.write_bytes(b'prefix\x00val_wall_wood_ab\x00val_wall_wood_nm\x00missing_texture_ab\x00')
    textures.mkdir()
    (textures / 'val_wall_wood_ab.png').write_bytes(b'albedo')
    (textures / 'val_wall_wood_nm.png').write_bytes(b'normal')

    report = build_texture_reference_report(models, textures, {'val_test'})

    assert report == {
        'version': 1,
        'models': [{
            'model': 'val_test',
            'referencedTextures': ['missing_texture_ab', 'val_wall_wood_ab', 'val_wall_wood_nm'],
            'availableTextures': ['val_wall_wood_ab.png', 'val_wall_wood_nm.png'],
            'missingTextures': ['missing_texture_ab'],
        }],
        'summary': {
            'modelCount': 1,
            'referencedTextureCount': 3,
            'availableTextureCount': 2,
            'missingTextureCount': 1,
        },
    }


def test_texture_reference_report_ignores_unrelated_binary_words(tmp_path: Path) -> None:
    models = tmp_path / 'models'
    textures = tmp_path / 'textures'
    model = models / 'val_test_ydr' / 'val_test.ydr.full'
    model.parent.mkdir(parents=True)
    model.write_bytes(b'hello\x00short\x00texture_name_without_map_suffix\x00valid_al\x00')
    textures.mkdir()
    (textures / 'valid_al.png').write_bytes(b'albedo')

    report = build_texture_reference_report(models, textures, {'val_test'})

    assert report['models'][0]['referencedTextures'] == ['valid_al']
