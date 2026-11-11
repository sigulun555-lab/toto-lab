from __future__ import annotations

import hashlib
import subprocess
import sys
from pathlib import Path

import pytest

SCRIPT_DIR = Path(__file__).resolve().parents[1] / "research" / "goal3_k6_k10_2026-11-10"
sys.path.insert(0, str(SCRIPT_DIR))
import analysis  # noqa: E402


def test_cli_requires_explicit_input_and_output_paths():
    with pytest.raises(SystemExit):
        analysis.parse_args([])
    args = analysis.parse_args([
        "--mod-dir", "/tmp/mod", "--history", "/tmp/history.json",
        "--aliases", "/tmp/aliases.json", "--csv", "/tmp/2025.csv",
        "--out-dir", "/tmp/goal3-research",
    ])
    assert args.seed == 1
    assert args.replicates == 10_000


def test_model_module_is_loaded_from_explicit_directory(tmp_path):
    (tmp_path / "nested_validation.py").write_text(
        "PORTABLE_SENTINEL = 'explicit-directory'\n", encoding="utf-8"
    )
    sys.modules.pop("nested_validation", None)
    module = analysis.load_nv(tmp_path)
    assert module.PORTABLE_SENTINEL == "explicit-directory"
    assert Path(module.__file__).resolve().parent == tmp_path.resolve()
    sys.modules.pop("nested_validation", None)


def test_model_module_missing_fails_closed(tmp_path):
    with pytest.raises(FileNotFoundError):
        analysis.load_nv(tmp_path)


def test_sha256_and_pinned_hash_guard(tmp_path):
    path = tmp_path / "input.bin"
    path.write_bytes(b"goal3-research-only")
    expected = hashlib.sha256(b"goal3-research-only").hexdigest()
    assert analysis.sha256_file(path) == expected
    assert analysis.verify_sha256(path, expected, "fixture") == expected
    with pytest.raises(ValueError, match="SHA-256 mismatch"):
        analysis.verify_sha256(path, "0" * 64, "fixture")


def test_legacy_percentile_indices_are_explicit():
    assert analysis.percentile_indices(list(range(10_000))) == (250.0, 9749.0)


def test_bootstrap_rejects_too_few_replicates():
    with pytest.raises(SystemExit):
        analysis.parse_args([
            "--mod-dir", "/tmp/mod", "--history", "/tmp/history.json",
            "--aliases", "/tmp/aliases.json", "--csv", "/tmp/2025.csv",
            "--out-dir", "/tmp/out", "--replicates", "999",
        ])


def test_no_claude_workspace_absolute_paths_remain():
    source = (SCRIPT_DIR / "analysis.py").read_text(encoding="utf-8")
    assert "/home/claude/work/" not in source


def test_entrypoint_runs_in_python_isolated_mode():
    result = subprocess.run(
        [sys.executable, "-I", str(SCRIPT_DIR / "analysis.py"), "--help"],
        capture_output=True, text=True, check=False,
    )
    assert result.returncode == 0
    assert "--mod-dir" in result.stdout
    assert "--out-dir" in result.stdout
