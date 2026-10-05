"""Studio routes; authentication is provided by the application's middleware."""

from typing import Literal

from fastapi import APIRouter, HTTPException, Query, Request, Response
from pydantic import ValidationError

from api import studio_service
from api.studio_models import (
    StudioArtifact,
    StudioArtifactPatch,
    StudioCapabilities,
    StudioCopyRequest,
    StudioGenerateRequest,
    StudioImportRequest,
    StudioKind,
    StudioLibrary,
    StudioReadiness,
)

router = APIRouter(prefix="/studio", tags=["studio"])


async def _call(operation):
    try:
        return await operation
    except studio_service.StudioError as error:
        raise HTTPException(
            status_code=error.status_code, detail=error.message
        ) from None
    except Exception:
        # Provider and database exception text may contain private content or keys.
        raise HTTPException(
            status_code=500,
            detail="The studio could not complete this request. Check service availability and try again.",
        ) from None


@router.get("/capabilities", response_model=StudioCapabilities)
async def capabilities():
    return await _call(studio_service.get_capabilities())


@router.get("/notebooks/{notebook_id}/readiness", response_model=StudioReadiness)
async def readiness(notebook_id: str):
    return await _call(studio_service.get_readiness(notebook_id))


@router.get("/library", response_model=StudioLibrary)
async def library(
    notebook_id: str | None = Query(default=None, max_length=200),
    scope: Literal["notebook", "orphaned"] = "notebook",
    query: str = Query(default="", max_length=200),
    kind: StudioKind | None = None,
    sort: Literal["updated", "title", "created"] = "updated",
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=12, ge=1, le=50),
):
    return await _call(
        studio_service.get_library(
            notebook_id, scope, query, kind, sort, page, page_size
        )
    )


@router.get("/artifacts", response_model=list[StudioArtifact])
async def artifacts(notebook_id: str | None = Query(default=None, max_length=200)):
    return await _call(studio_service.list_artifacts(notebook_id))


@router.post("/artifacts", response_model=StudioArtifact, status_code=201)
async def generate(request: StudioGenerateRequest):
    return await _call(studio_service.generate_artifact(request))


@router.post("/artifacts/import", response_model=StudioArtifact, status_code=201)
async def import_artifact(request: Request):
    payload = bytearray()
    try:
        async for chunk in request.stream():
            if len(payload) + len(chunk) >= studio_service.MAX_IMPORT_BYTES:
                raise HTTPException(
                    status_code=413,
                    detail="The import file exceeds the 1 MB request limit.",
                )
            payload.extend(chunk)
        data = StudioImportRequest.model_validate_json(bytes(payload))
    except HTTPException:
        raise
    except (ValidationError, ValueError, TypeError):
        raise HTTPException(
            status_code=400,
            detail="Invalid studio import. Use a version 1 JSON artifact with complete metadata.",
        ) from None
    except Exception:
        raise HTTPException(
            status_code=400, detail="The studio import could not be read safely."
        ) from None
    return await _call(studio_service.import_artifact(data))


@router.post(
    "/artifacts/{artifact_id}/copy", response_model=StudioArtifact, status_code=201
)
async def copy_artifact(artifact_id: str, request: StudioCopyRequest):
    return await _call(studio_service.copy_artifact(artifact_id, request))


@router.get("/artifacts/{artifact_id}", response_model=StudioArtifact)
async def artifact(artifact_id: str):
    return await _call(studio_service.get_artifact(artifact_id))


@router.patch("/artifacts/{artifact_id}", response_model=StudioArtifact)
async def patch(artifact_id: str, request: StudioArtifactPatch):
    return await _call(studio_service.patch_artifact(artifact_id, request))


@router.delete("/artifacts/{artifact_id}", status_code=204)
async def delete(artifact_id: str):
    await _call(studio_service.delete_artifact(artifact_id))
    return Response(status_code=204)
