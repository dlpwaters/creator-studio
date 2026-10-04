"""Studio routes; authentication is provided by the application's middleware."""

from fastapi import APIRouter, HTTPException, Query, Response

from api import studio_service
from api.studio_models import (
    StudioArtifact,
    StudioArtifactPatch,
    StudioCapabilities,
    StudioGenerateRequest,
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


@router.get("/artifacts", response_model=list[StudioArtifact])
async def artifacts(notebook_id: str | None = Query(default=None, max_length=200)):
    return await _call(studio_service.list_artifacts(notebook_id))


@router.post("/artifacts", response_model=StudioArtifact, status_code=201)
async def generate(request: StudioGenerateRequest):
    return await _call(studio_service.generate_artifact(request))


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
