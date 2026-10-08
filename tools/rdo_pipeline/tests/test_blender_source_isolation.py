"""Exercise the exporter with real files; Blender itself is an external boundary."""
import importlib.util
import sys
from pathlib import Path
from types import SimpleNamespace

import pytest


@pytest.mark.parametrize("import_fails", [False, True])
def test_full_drawable_import_never_writes_in_raw_directory(tmp_path, monkeypatch, import_fails):
    raw = tmp_path / "raw"
    model = raw / "val_bank_ydr"
    model.mkdir(parents=True)
    source = model / "val_bank.ydr.full"
    source.write_bytes(b"drawable fixture")
    # A pre-existing file with the historical temporary name belongs to the user.
    sentinel = raw / "_temp_rdo_fallback.ydr"
    sentinel.write_bytes(b"preserve me")
    before = {p.relative_to(raw): p.read_bytes() for p in raw.rglob("*") if p.is_file()}
    imported = []

    def import_drawable(*, filepath):
        path = Path(filepath)
        imported.append(path)
        assert path.read_bytes() == b"drawable fixture"
        assert not path.is_relative_to(raw)
        if import_fails:
            raise RuntimeError("fixture import failure")

    def export_drawable(*, filepath, **kwargs):
        Path(filepath).write_bytes(b"GLB fixture")

    empty = []
    bpy = SimpleNamespace(
        ops=SimpleNamespace(
            preferences=SimpleNamespace(addon_enable=lambda **kwargs: None),
            object=SimpleNamespace(select_all=lambda **kwargs: None, delete=lambda **kwargs: None),
            import_mesh=SimpleNamespace(ydr=import_drawable),
            export_scene=SimpleNamespace(gltf=export_drawable),
        ),
        data=SimpleNamespace(meshes=empty, armatures=empty, materials=empty, objects=empty),
    )
    monkeypatch.setitem(sys.modules, "bpy", bpy)
    script = Path(__file__).resolve().parents[2] / "convert_models_blender.py"
    spec = importlib.util.spec_from_file_location("blender_export_isolation", script)
    exporter = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(exporter)
    output = tmp_path / "processed"
    monkeypatch.setattr(sys, "argv", [str(script), "--", "--input-dir", str(raw), "--output-dir", str(output), "--only", "val_bank"])
    assert exporter.main() == (1 if import_fails else 0)
    assert len(imported) == 1
    assert not imported[0].exists()
    assert {p.relative_to(raw): p.read_bytes() for p in raw.rglob("*") if p.is_file()} == before
    assert (output / "val_bank.glb").exists() is not import_fails
