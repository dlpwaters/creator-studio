"""Register additive Studio routes without replacing an installed backend."""

import argparse
import ast
from pathlib import Path

REGISTRATION = """\n# Source-grounded research creation studio (additive overlay).
from api.routers import studio as studio_router
from api.routers import studio_exports as studio_exports_router

app.include_router(studio_router.router, prefix="/api")
app.include_router(studio_exports_router.router, prefix="/api")
"""


def _register_routes(original: str) -> str:
    tree = ast.parse(original)
    if not any(
        isinstance(node, ast.Assign)
        and any(
            isinstance(target, ast.Name) and target.id == "app"
            for target in node.targets
        )
        for node in tree.body
    ):
        raise SystemExit(
            "The installed API does not define a FastAPI app; overlay refused."
        )
    if "studio_router.router" in original or "studio.router" in original:
        if (
            "studio_exports_router.router" in original
            or "studio_exports.router" in original
        ):
            return original
        raise SystemExit(
            "Partial Studio registration found; review the installed API before updating."
        )
    updated = original.rstrip() + "\n" + REGISTRATION
    ast.parse(updated)
    return updated


def sanitize_provision_source(original: str) -> str:
    """Replace only the two reviewed credential-bearing model representations."""
    tree = ast.parse(original)
    function = next(
        (
            node
            for node in tree.body
            if isinstance(node, ast.AsyncFunctionDef)
            and node.name == "provision_langchain_model"
        ),
        None,
    )
    if function is None:
        raise SystemExit(
            "The installed provider provisioning function is unrecognized; privacy patch refused."
        )
    replacements = (
        (
            'logger.debug(f"Using model: {model}")',
            'logger.debug("Using model type: {}", type(model).__name__)',
        ),
        (
            'f"Model is not a LanguageModel: {model}. "',
            'f"Model is not a LanguageModel: {type(model).__name__}. "',
        ),
    )
    updated = original
    for unsafe, safe in replacements:
        if updated.count(unsafe) == 1 and safe not in updated:
            updated = updated.replace(unsafe, safe, 1)
        elif unsafe not in updated and updated.count(safe) == 1:
            continue
        else:
            raise SystemExit(
                "The installed provider diagnostics differ from the reviewed implementation; privacy patch refused."
            )

    safe_type = ast.parse("type(model).__name__", mode="eval").body

    def references_model(node):
        if ast.dump(node) == ast.dump(safe_type):
            return False
        if isinstance(node, ast.Name) and node.id == "model":
            return True
        return any(references_model(child) for child in ast.iter_child_nodes(node))

    # Refuse future versions that introduce a different raw model diagnostic.
    # The complete installed function stays intact except the reviewed strings.
    patched_tree = ast.parse(updated)
    patched_function = next(
        node
        for node in patched_tree.body
        if isinstance(node, ast.AsyncFunctionDef) and node.name == function.name
    )
    for node in ast.walk(patched_function):
        if not isinstance(node, ast.Call):
            continue
        diagnostic = (
            isinstance(node.func, ast.Attribute)
            and any(
                isinstance(part, ast.Name) and part.id == "logger"
                for part in ast.walk(node.func.value)
            )
        ) or (isinstance(node.func, ast.Name) and node.func.id == "ConfigurationError")
        if diagnostic and any(
            references_model(argument)
            for argument in [*node.args, *(keyword.value for keyword in node.keywords)]
        ):
            raise SystemExit(
                "An unrecognized model-bearing provider diagnostic remains; privacy patch refused."
            )
    return updated


def install(path: Path, provision_path: Path | None = None) -> None:
    original = path.read_text()
    updated = _register_routes(original)
    provision_original = provision_path.read_text() if provision_path else None
    provision_updated = (
        sanitize_provision_source(provision_original)
        if provision_original is not None
        else None
    )
    # Validate both changes before touching either installed source file.
    if updated != original:
        path.write_text(updated)
    if provision_path and provision_updated != provision_original:
        provision_path.write_text(provision_updated)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("api_main", type=Path)
    parser.add_argument(
        "--provision",
        type=Path,
        help="Patch reviewed provider diagnostics while preserving the installed implementation",
    )
    arguments = parser.parse_args()
    install(arguments.api_main, arguments.provision)
