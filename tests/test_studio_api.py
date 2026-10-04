"""Studio behavior using synthetic inputs, mocked providers, and isolated storage."""

import asyncio
import json
from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from api import studio_service as service
from api.routers.studio import router
from api.studio_models import StudioArtifactPatch, StudioGenerateRequest


@pytest.fixture
def studio(monkeypatch, tmp_path):
    source = SimpleNamespace(
        id="source:alpha",
        title="Alpha report",
        full_text="The trial involved 42 participants. Results remain preliminary.",
        asset=SimpleNamespace(url="https://example.org/report"),
        command=None,
    )
    empty = SimpleNamespace(
        id="source:empty",
        title="Pending PDF",
        full_text=None,
        asset=SimpleNamespace(url="javascript:alert(1)"),
        command="command:pending",
        get_status=AsyncMock(return_value="running"),
    )
    note = SimpleNamespace(
        id="note:beta",
        title="Research note",
        content="Compare the trial with the previous cohort.",
    )
    notebook = SimpleNamespace(
        id="notebook:one",
        get_sources=AsyncMock(return_value=[source, empty]),
        get_notes=AsyncMock(return_value=[note]),
    )
    monkeypatch.setattr(service.Notebook, "get", AsyncMock(return_value=notebook))
    monkeypatch.setattr(service.Notebook, "get_all", AsyncMock(return_value=[notebook]))
    monkeypatch.setattr(service, "DATA_FOLDER", str(tmp_path))
    provision = AsyncMock()
    monkeypatch.setattr(service, "provision_langchain_model", provision)
    app = FastAPI()
    app.include_router(router, prefix="/api")
    with TestClient(app) as client:
        yield SimpleNamespace(
            client=client,
            source=source,
            empty=empty,
            note=note,
            notebook=notebook,
            provision=provision,
            directory=tmp_path / "studio",
        )


def request(**changes):
    return {
        "notebook_id": "notebook:one",
        "kind": "slides",
        "topic": "Trial overview",
        "card_count": 3,
        "generation": "extractive",
        **changes,
    }


def create(studio, **changes):
    response = studio.client.post("/api/studio/artifacts", json=request(**changes))
    assert response.status_code == 201, response.text
    return response.json()


@pytest.mark.parametrize(
    "kind", ["slides", "video", "brief", "quiz", "flashcards", "mindmap", "timeline"]
)
def test_all_extractive_kinds_roundtrip_without_ai(studio, kind):
    artifact = create(studio, kind=kind)
    assert len(artifact["cards"]) == 3
    assert artifact["source_ids"] == ["source:alpha"]
    assert artifact["note_ids"] == ["note:beta"]
    assert artifact["model_id"] is None
    assert any("no AI synthesis" in warning for warning in artifact["warnings"])
    assert all(card["source_ids"] for card in artifact["cards"])
    assert (
        studio.client.get(f"/api/studio/artifacts/{artifact['id']}").json() == artifact
    )
    assert studio.client.get("/api/studio/artifacts").json() == [artifact]
    if kind in ("quiz", "flashcards"):
        assert all(
            card["answer"] == card["body"] and not card["options"]
            for card in artifact["cards"]
        )
    studio.provision.assert_not_called()
    studio.notebook.get_sources.assert_awaited_with(include_full_text=True)
    studio.notebook.get_notes.assert_awaited_with(include_content=True)


def test_readiness_and_reads_have_no_storage_side_effect(studio):
    data = studio.client.get("/api/studio/notebooks/notebook:one/readiness").json()
    assert data["ready_source_count"] == 1
    assert data["sources"][1]["ready"] is False
    assert data["sources"][1]["status"] == "running"
    assert data["sources"][1]["url"] is None
    assert "still being processed" in data["sources"][1]["reason"]
    assert studio.client.get("/api/studio/artifacts").json() == []
    assert not studio.directory.exists()
    studio.provision.assert_not_called()


def test_capabilities_use_registry_and_exporter_without_provider_call(
    studio, monkeypatch
):
    monkeypatch.setattr(
        service.Model,
        "get_models_by_type",
        AsyncMock(return_value=[SimpleNamespace(type="language")]),
    )
    response = studio.client.get("/api/studio/capabilities")
    assert response.status_code == 200
    assert response.json()["ai_available"] is True
    assert "narration_available" in response.json()
    assert len(response.json()["supported_kinds"]) == 7
    studio.provision.assert_not_called()
    assert not studio.directory.exists()


def test_selection_distinguishes_none_from_empty_and_scopes_membership(studio):
    note_only = create(studio, source_ids=[], note_ids=["note:beta"])
    assert note_only["source_ids"] == []
    assert all(card["source_ids"] == ["note:beta"] for card in note_only["cards"])
    for changes in (
        {"source_ids": [], "note_ids": []},
        {"source_ids": ["source:outside"]},
        {"note_ids": ["note:outside"]},
        {"source_ids": ["source:empty"], "note_ids": []},
    ):
        assert (
            studio.client.post(
                "/api/studio/artifacts", json=request(**changes)
            ).status_code
            == 400
        )
    studio.provision.assert_not_called()


def test_short_extractive_material_has_one_card_without_repetition(studio):
    artifact = create(studio, source_ids=[], note_ids=["note:beta"], card_count=6)
    assert len(artifact["cards"]) == 1
    assert artifact["cards"][0]["body"] == studio.note.content
    assert any("instead of 6" in warning for warning in artifact["warnings"])
    url = f"/api/studio/artifacts/{artifact['id']}"
    assert studio.client.get(url).json() == artifact
    assert (
        studio.client.patch(url, json={"cards": artifact["cards"]}).status_code == 200
    )
    studio.provision.assert_not_called()


def test_extractive_splits_sentences_without_fabricating_or_repeating(studio):
    studio.source.full_text = "First finding is preliminary. Second finding needs replication. Third finding remains uncertain."
    artifact = create(studio, source_ids=["source:alpha"], note_ids=[], card_count=6)
    bodies = [card["body"] for card in artifact["cards"]]
    assert bodies == [
        "First finding is preliminary.",
        "Second finding needs replication.",
        "Third finding remains uncertain.",
    ]
    assert len(set(bodies)) == 3
    assert " ".join(bodies) == studio.source.full_text


def test_extractive_long_passage_splits_at_word_boundaries(studio):
    studio.source.full_text = "preliminary " * 180
    artifact = create(studio, source_ids=["source:alpha"], note_ids=[], card_count=3)
    bodies = [card["body"] for card in artifact["cards"]]
    assert len(bodies) == 2
    assert all(len(body) <= 1400 for body in bodies)
    assert " ".join(bodies).split() == studio.source.full_text.split()


@pytest.mark.parametrize(
    "changes",
    [
        {"card_count": 2},
        {"card_count": 21},
        {"card_count": True},
        {"kind": "unknown"},
        {"topic": " "},
        {"topic": "t" * 301},
        {"generation": "magic"},
        {"extra": "ignored?"},
    ],
)
def test_request_bounds(studio, changes):
    assert (
        studio.client.post("/api/studio/artifacts", json=request(**changes)).status_code
        == 422
    )
    assert not studio.directory.exists()


def ai_draft():
    return {
        "title": "Study evidence",
        "cards": [
            {
                "id": f"card-{index}",
                "title": f"Finding {index}",
                "body": "The trial involved 42 participants.",
                "source_ids": ["source:alpha"],
                "duration_seconds": 15,
            }
            for index in range(3)
        ],
    }


def mock_ai(studio, monkeypatch, draft=None):
    monkeypatch.setattr(
        service.Model, "get", AsyncMock(return_value=SimpleNamespace(type="language"))
    )
    monkeypatch.setattr(
        service.DefaultModels,
        "get_instance",
        AsyncMock(
            return_value=SimpleNamespace(
                default_transformation_model="model:test", default_chat_model=None
            )
        ),
    )
    invocation = AsyncMock(return_value=ai_draft() if draft is None else draft)
    model = Mock()
    model.with_structured_output.return_value = SimpleNamespace(ainvoke=invocation)
    studio.provision.return_value = model
    return invocation


def test_ai_makes_one_structured_call_with_bounded_input(studio, monkeypatch):
    studio.source.full_text = "x" * 90_000
    invocation = mock_ai(studio, monkeypatch)
    artifact = create(studio, generation="ai")
    studio.provision.assert_awaited_once()
    invocation.assert_awaited_once()
    content, model_id, default_type = studio.provision.call_args.args
    assert model_id == "model:test" and default_type == "transformation"
    assert len(json.loads(content)["evidence"][0]["text"]) == service.MAX_ITEM_CHARS
    assert studio.provision.call_args.kwargs["max_retries"] == 0
    assert artifact["model_id"] == "model:test"
    assert any("Truncated" in warning for warning in artifact["warnings"])


def test_video_request_separates_visible_content_from_spoken_notes(studio, monkeypatch):
    invocation = mock_ai(studio, monkeypatch)
    create(studio, generation="ai", kind="video")
    messages = invocation.call_args.args[0]
    system = messages[0][1]
    assert "title, body and bullets as the visible scene content" in system
    assert "Video notes must contain only words to speak aloud" in system
    assert "no scene directions" in system


@pytest.mark.parametrize(
    "bad",
    [
        "foreign_citation",
        "missing_citation",
        "wrong_count",
        "duplicate_id",
        "missing_study_answer",
        "invalid_answer_index",
    ],
)
def test_ai_rejects_invalid_output_without_saving_or_retry(studio, monkeypatch, bad):
    draft = ai_draft()
    kind = "slides"
    if bad == "foreign_citation":
        draft["cards"][0]["source_ids"] = ["source:outside"]
    elif bad == "missing_citation":
        draft["cards"][0]["source_ids"] = []
    elif bad == "wrong_count":
        draft["cards"].append({**draft["cards"][0], "id": "extra"})
    elif bad == "duplicate_id":
        draft["cards"][1]["id"] = draft["cards"][0]["id"]
    elif bad == "missing_study_answer":
        kind = "quiz"
    else:
        draft["cards"][0].update(options=["one"], correct_option=5)
    invocation = mock_ai(studio, monkeypatch, draft)
    response = studio.client.post(
        "/api/studio/artifacts", json=request(generation="ai", kind=kind)
    )
    assert response.status_code == 502
    invocation.assert_awaited_once()
    assert not studio.directory.exists()


def test_provider_and_database_errors_never_leak_raw_payload(studio, monkeypatch):
    invocation = mock_ai(studio, monkeypatch)
    invocation.side_effect = RuntimeError("sk-private-key and private provider payload")
    response = studio.client.post(
        "/api/studio/artifacts", json=request(generation="ai")
    )
    assert response.status_code == 502
    assert "private" not in response.text and "sk-" not in response.text
    invocation.assert_awaited_once()
    monkeypatch.setattr(
        service.Notebook,
        "get",
        AsyncMock(side_effect=RuntimeError("private database contents")),
    )
    response = studio.client.get("/api/studio/notebooks/notebook:one/readiness")
    assert response.status_code == 500 and "private" not in response.text


def test_patch_conflicts_citation_validation_and_delete(studio):
    artifact = create(studio)
    url = f"/api/studio/artifacts/{artifact['id']}"
    first = studio.client.patch(
        url,
        json={"title": "Reviewed title", "expected_updated_at": artifact["updated_at"]},
    )
    assert first.status_code == 200
    assert first.json()["updated_at"] != artifact["updated_at"]
    assert (
        studio.client.patch(
            url,
            json={"title": "Stale edit", "expected_updated_at": artifact["updated_at"]},
        ).status_code
        == 409
    )
    cards = first.json()["cards"]
    cards[0]["source_ids"] = ["source:outside"]
    assert studio.client.patch(url, json={"cards": cards}).status_code == 400
    assert studio.client.get(url).json()["title"] == "Reviewed title"
    assert studio.client.delete(url).status_code == 204
    assert studio.client.get(url).status_code == 404


def test_concurrent_updates_allow_only_one_expected_version(studio):
    artifact = create(studio)

    async def edit():
        return await asyncio.gather(
            *(
                service.patch_artifact(
                    artifact["id"],
                    StudioArtifactPatch(
                        title=f"Edit {index}",
                        expected_updated_at=artifact["updated_at"],
                    ),
                )
                for index in range(6)
            ),
            return_exceptions=True,
        )

    results = asyncio.run(edit())
    assert sum(not isinstance(result, Exception) for result in results) == 1
    conflicts = [
        result for result in results if isinstance(result, service.StudioError)
    ]
    assert len(conflicts) == 5 and all(error.status_code == 409 for error in conflicts)
    assert json.loads((studio.directory / f"{artifact['id']}.json").read_text())[
        "title"
    ].startswith("Edit ")
    assert not list(studio.directory.glob(".artifact-*"))


def test_path_traversal_corruption_and_orphaned_artifacts(studio, monkeypatch):
    artifact = create(studio)
    assert studio.client.get("/api/studio/artifacts/not-a-valid-id").status_code == 404
    monkeypatch.setattr(service.Notebook, "get_all", AsyncMock(return_value=[]))
    assert studio.client.get("/api/studio/artifacts").json() == []
    path = studio.directory / f"{artifact['id']}.json"
    path.write_text("corrupt JSON")
    assert (
        studio.client.get(f"/api/studio/artifacts/{artifact['id']}").status_code == 500
    )


def test_storage_limits_and_safe_urls(studio, monkeypatch):
    studio.source.asset.url = "https://user:password@example.org/private"
    artifact = create(studio)
    assert artifact["sources"][0]["url"] is None
    assert (studio.directory / f"{artifact['id']}.json").stat().st_mode & 0o777 == 0o600
    monkeypatch.setattr(service, "MAX_ARTIFACTS", 1)
    response = studio.client.post("/api/studio/artifacts", json=request())
    assert response.status_code == 409


def test_total_input_limit_and_provenance_match_included_text(studio):
    sources = [
        SimpleNamespace(
            id=f"source:{index}",
            title=f"Source {index}",
            full_text="x" * 20_000,
            asset=None,
        )
        for index in range(8)
    ]
    selected, warnings = service._select_inputs(
        StudioGenerateRequest(**request()), sources, []
    )
    assert sum(len(text) for _, text, _ in selected) == service.MAX_INPUT_CHARS
    assert len(selected) == 5
    assert any("Total input limit" in warning for warning in warnings)


def test_langchain_provider_retries_are_disabled_without_network():
    from langchain_openai import ChatOpenAI

    original = ChatOpenAI(
        api_key="synthetic-not-a-key", model="synthetic", max_retries=2
    )
    bounded = service._disable_provider_retries(original)
    assert bounded.max_retries == 0
    assert bounded.root_client.max_retries == 0
    assert bounded.root_async_client.max_retries == 0
    assert original.max_retries == 2


def test_ai_concurrent_slots_reject_excess_and_release(studio, monkeypatch):
    invocation = mock_ai(studio, monkeypatch)

    async def exercise():
        gate = asyncio.Event()

        async def pause(*args, **kwargs):
            await gate.wait()
            return ai_draft()

        invocation.side_effect = pause
        inputs, _ = service._select_inputs(
            StudioGenerateRequest(**request()), [studio.source], []
        )
        generation = StudioGenerateRequest(**request(generation="ai"))
        pending = [
            asyncio.create_task(service._generate_ai(generation, inputs))
            for _ in range(service.MAX_CONCURRENT_AI)
        ]
        # Let each slot reach its synthetic provider call.
        for _ in range(4):
            await asyncio.sleep(0)
        with pytest.raises(service.StudioError) as error:
            await service._generate_ai(generation, inputs)
        assert error.value.status_code == 429
        gate.set()
        await asyncio.gather(*pending)
        await service._generate_ai(generation, inputs)

    asyncio.run(exercise())
    assert invocation.await_count == service.MAX_CONCURRENT_AI + 1


def test_symlinks_and_oversized_files_are_rejected(studio):
    artifact = create(studio)
    path = studio.directory / f"{artifact['id']}.json"
    target = studio.directory / "external-copy"
    path.rename(target)
    path.symlink_to(target)
    response = studio.client.get(f"/api/studio/artifacts/{artifact['id']}")
    assert response.status_code == 500
    path.unlink()
    path.write_bytes(b"x" * (service.MAX_ARTIFACT_BYTES + 1))
    assert (
        studio.client.get(f"/api/studio/artifacts/{artifact['id']}").status_code == 500
    )
