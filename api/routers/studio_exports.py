"""Authenticated Studio download routes; mount under the existing /api middleware."""

import asyncio
from typing import Literal

from fastapi import APIRouter, HTTPException
from starlette.background import BackgroundTask
from starlette.concurrency import run_in_threadpool
from starlette.responses import FileResponse, Response

from api.studio_exports import FORMATS, ExportError, export_artifact
from api.studio_service import StudioError, get_artifact

router = APIRouter()
# Bound concurrent expensive exports without holding the application event loop.
_render_slots = asyncio.Semaphore(2)


@router.get("/studio/artifacts/{artifact_id}/export/{format}")
async def download_artifact(
    artifact_id: str, format: str, narration: Literal["none", "local"] = "none"
):
    if format not in FORMATS:
        raise HTTPException(status_code=404, detail="Unsupported export format.")
    try:
        artifact = await get_artifact(artifact_id)
        if format in {"mp4", "pptx"} or narration == "local":
            async with _render_slots:
                download = await run_in_threadpool(
                    export_artifact, artifact, format, narration
                )
        else:
            download = await run_in_threadpool(
                export_artifact, artifact, format, narration
            )
    except (StudioError, ExportError) as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail="Export failed. Review the artifact and server export capabilities.",
        ) from exc
    headers = {
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
    }
    if download.path:
        return FileResponse(
            download.path,
            media_type=download.media_type,
            filename=download.filename,
            headers=headers,
            background=BackgroundTask(download.cleanup),
        )
    headers["Content-Disposition"] = f'attachment; filename="{download.filename}"'
    return Response(download.data, media_type=download.media_type, headers=headers)
