from pathlib import Path

import pytest

from rdo_pipeline.cli import approved_runtime_root


def test_cli_rejects_runtime_output_outside_repository_runtime_directory(tmp_path: Path) -> None:
    with pytest.raises(ValueError, match='data/runtime'):
        approved_runtime_root(tmp_path)
