"""Provider diagnostics never serialize credential-bearing model objects."""

import asyncio
import subprocess
import sys
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock

import pytest
from esperanto.providers.llm.openai import OpenAILanguageModel
from loguru import logger

from open_notebook.ai import provision
from open_notebook.exceptions import ConfigurationError
from scripts.install_studio_overlay import install, sanitize_provision_source

SYNTHETIC_KEY = "synthetic-private-api-key-for-regression"
SYNTHETIC_CONTENT = "synthetic-private-source-content-for-regression"
ROOT = Path(__file__).resolve().parents[1]


@pytest.fixture
def diagnostics():
    messages = []
    handler = logger.add(messages.append, format="{message}", level="DEBUG")
    try:
        yield messages
    finally:
        logger.remove(handler)


@pytest.mark.parametrize("selection", ["explicit", "default", "large_context"])
def test_valid_provider_logs_safe_type_without_credentials_or_content(
    monkeypatch, diagnostics, selection
):
    # Bypass provider initialization completely. No clients, keys, or network are
    # needed to reproduce Esperanto's credential-bearing dataclass representation.
    model = object.__new__(OpenAILanguageModel)
    model.api_key = SYNTHETIC_KEY
    model._config = {"api_key": SYNTHETIC_KEY, "private_content": SYNTHETIC_CONTENT}
    model._client = None
    model._async_client = None
    model.to_langchain = Mock(return_value="synthetic-langchain-model")
    assert SYNTHETIC_KEY in str(model)
    manager = SimpleNamespace(
        get_model=AsyncMock(return_value=model),
        get_default_model=AsyncMock(return_value=model),
    )
    monkeypatch.setattr(provision, "model_manager", manager)
    monkeypatch.setattr(
        provision,
        "token_count",
        lambda _: 106_000 if selection == "large_context" else 100,
    )
    result = asyncio.run(
        provision.provision_langchain_model(
            SYNTHETIC_CONTENT,
            "model:synthetic" if selection == "explicit" else None,
            "transformation",
        )
    )
    assert result == "synthetic-langchain-model"
    transcript = "\n".join(str(message) for message in diagnostics)
    assert "OpenAILanguageModel" in transcript
    assert SYNTHETIC_KEY not in transcript
    assert SYNTHETIC_CONTENT not in transcript
    model.to_langchain.assert_called_once_with()


def test_invalid_provider_does_not_leak_object_repr_in_error_or_logs(
    monkeypatch, diagnostics
):
    class PrivateModel:
        def __repr__(self):
            return SYNTHETIC_KEY + SYNTHETIC_CONTENT

        __str__ = __repr__

    monkeypatch.setattr(
        provision,
        "model_manager",
        SimpleNamespace(get_model=AsyncMock(return_value=PrivateModel())),
    )
    monkeypatch.setattr(provision, "token_count", lambda _: 100)
    with pytest.raises(ConfigurationError) as error:
        asyncio.run(
            provision.provision_langchain_model(
                SYNTHETIC_CONTENT, "model:synthetic", "transformation"
            )
        )
    diagnostics_text = "\n".join(str(message) for message in diagnostics) + str(
        error.value
    )
    assert "PrivateModel" in diagnostics_text
    assert SYNTHETIC_KEY not in diagnostics_text
    assert SYNTHETIC_CONTENT not in diagnostics_text


@pytest.fixture
def safe_source():
    return (ROOT / "open_notebook/ai/provision.py").read_text()


@pytest.fixture
def unsafe_source(safe_source):
    return safe_source.replace(
        'logger.debug("Using model type: {}", type(model).__name__)',
        'logger.debug(f"Using model: {model}")',
    ).replace(
        'f"Model is not a LanguageModel: {type(model).__name__}. "',
        'f"Model is not a LanguageModel: {model}. "',
    )


def test_overlay_privacy_patch_is_narrow_and_idempotent(safe_source, unsafe_source):
    marker = "\n# Installed-version-specific code must survive the additive overlay.\n"
    updated = sanitize_provision_source(unsafe_source + marker)
    assert updated == safe_source + marker
    assert sanitize_provision_source(updated) == updated


@pytest.mark.parametrize(
    "change",
    [
        "changed_log",
        "extra_raw_log",
        "extra_raw_opt_log",
        "extra_raw_error",
        "duplicate_log",
        "missing_function",
    ],
)
def test_overlay_refuses_unreviewed_provider_diagnostics(unsafe_source, change):
    if change == "changed_log":
        source = unsafe_source.replace(
            'logger.debug(f"Using model: {model}")',
            'logger.debug(f"Provider model: {model}")',
        )
    elif change == "extra_raw_log":
        source = unsafe_source.replace(
            'logger.debug(f"Using model: {model}")',
            'logger.debug(f"Using model: {model}")\n    logger.warning("Provider config: {}", model)',
        )
    elif change == "extra_raw_opt_log":
        source = unsafe_source.replace(
            'logger.debug(f"Using model: {model}")',
            'logger.debug(f"Using model: {model}")\n    logger.opt().warning("Provider config: {}", model)',
        )
    elif change == "extra_raw_error":
        source = unsafe_source.replace(
            "return model.to_langchain()",
            'raise ConfigurationError("Provider config: {}".format(model))',
        )
    elif change == "duplicate_log":
        source = unsafe_source.replace(
            'logger.debug(f"Using model: {model}")',
            'logger.debug(f"Using model: {model}")\n    logger.debug(f"Using model: {model}")',
        )
    else:
        source = unsafe_source.replace(
            "async def provision_langchain_model", "async def unrecognized_provision"
        )
    with pytest.raises(SystemExit, match="refused"):
        sanitize_provision_source(source)


def test_installer_patches_routes_and_provider_without_changing_unrelated_code(
    tmp_path, safe_source, unsafe_source
):
    main = tmp_path / "main.py"
    provider = tmp_path / "provision.py"
    original_main = (
        "from fastapi import FastAPI\napp = FastAPI()\n# existing routes and startup\n"
    )
    main.write_text(original_main)
    provider.write_text(unsafe_source)
    install(main, provider)
    assert main.read_text().startswith(original_main)
    assert main.read_text().count("app.include_router(studio_router.router") == 1
    assert provider.read_text() == safe_source
    first_main = main.read_text()
    install(main, provider)
    assert main.read_text() == first_main
    assert provider.read_text() == safe_source


def test_installer_validates_both_files_before_mutation(tmp_path, unsafe_source):
    main = tmp_path / "main.py"
    provider = tmp_path / "provision.py"
    original_main = "app = object()\n"
    bad_provider = unsafe_source.replace(
        'logger.debug(f"Using model: {model}")',
        'logger.debug(f"Changed provider: {model}")',
    )
    main.write_text(original_main)
    provider.write_text(bad_provider)
    with pytest.raises(SystemExit, match="refused"):
        install(main, provider)
    assert main.read_text() == original_main
    assert provider.read_text() == bad_provider


def test_installer_refuses_partial_router_registration(tmp_path):
    main = tmp_path / "main.py"
    main.write_text(
        'app = object()\napp.include_router(studio_router.router, prefix="/api")\n'
    )
    original = main.read_text()
    with pytest.raises(SystemExit, match="Partial Studio registration"):
        install(main)
    assert main.read_text() == original


def test_installer_cli_accepts_optional_provider_path(
    tmp_path, safe_source, unsafe_source
):
    main = tmp_path / "main.py"
    provider = tmp_path / "provision.py"
    main.write_text("app = object()\n")
    provider.write_text(unsafe_source)
    result = subprocess.run(
        [
            sys.executable,
            str(ROOT / "scripts/install_studio_overlay.py"),
            str(main),
            "--provision",
            str(provider),
        ],
        capture_output=True,
        text=True,
        timeout=10,
    )
    assert result.returncode == 0, result.stderr
    assert provider.read_text() == safe_source
