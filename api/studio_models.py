"""Bounded schemas shared by studio generation, editing, and exporters."""

from typing import Annotated, Literal
from urllib.parse import urlsplit

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    StringConstraints,
    field_validator,
    model_validator,
)

StudioKind = Literal[
    "slides", "video", "brief", "quiz", "flashcards", "mindmap", "timeline"
]
RecordId = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)
]
ShortText = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=1, max_length=300)
]
Bullet = Annotated[str, StringConstraints(max_length=600)]


class StudioBase(BaseModel):
    model_config = ConfigDict(extra="forbid")


class StudioGenerateRequest(StudioBase):
    notebook_id: RecordId
    kind: StudioKind
    topic: ShortText
    audience: ShortText = "General reader"
    style: Literal["editorial", "chalkboard", "minimal"] = "editorial"
    language: Annotated[
        str, StringConstraints(strip_whitespace=True, min_length=1, max_length=80)
    ] = "English"
    card_count: int = Field(default=6, ge=3, le=20, strict=True)
    source_ids: list[RecordId] | None = Field(default=None, max_length=150)
    note_ids: list[RecordId] | None = Field(default=None, max_length=150)
    model_id: RecordId | None = None
    generation: Literal["ai", "extractive"] = "extractive"


class StudioCard(StudioBase):
    id: RecordId
    title: ShortText
    body: str = Field(default="", max_length=6000)
    bullets: list[Bullet] = Field(default_factory=list, max_length=16)
    notes: str = Field(default="", max_length=6000)
    # Citation IDs may identify a selected source or note.
    source_ids: list[RecordId] = Field(default_factory=list, max_length=150)
    duration_seconds: int = Field(default=15, ge=5, le=60, strict=True)
    question: str | None = Field(default=None, max_length=2000)
    answer: str | None = Field(default=None, max_length=6000)
    options: list[Bullet] = Field(default_factory=list, max_length=8)
    correct_option: int | None = Field(default=None, ge=0, le=7, strict=True)

    @model_validator(mode="after")
    def valid_answer_index(self):
        if self.correct_option is not None and self.correct_option >= len(self.options):
            raise ValueError("correct_option must refer to an existing option")
        return self


class StudioSource(StudioBase):
    id: RecordId
    title: ShortText
    url: str | None = Field(default=None, max_length=2000)

    @field_validator("url")
    @classmethod
    def only_safe_links(cls, value):
        if value is None:
            return None
        try:
            parsed = urlsplit(value)
            if (
                parsed.scheme in ("http", "https")
                and parsed.hostname
                and not parsed.username
                and not parsed.password
                and not any(c.isspace() for c in value)
            ):
                return value
        except ValueError:
            pass
        return None


class StudioDraft(StudioBase):
    title: ShortText
    cards: list[StudioCard] = Field(min_length=1, max_length=20)


class StudioArtifact(StudioDraft):
    id: str = Field(pattern=r"^[0-9a-f]{32}$")
    notebook_id: RecordId
    kind: StudioKind
    audience: ShortText
    style: Literal["editorial", "chalkboard", "minimal"]
    language: str = Field(min_length=1, max_length=80)
    created_at: str
    updated_at: str
    source_ids: list[RecordId] = Field(max_length=150)
    note_ids: list[RecordId] = Field(max_length=150)
    sources: list[StudioSource] = Field(max_length=150)
    warnings: list[str] = Field(default_factory=list, max_length=200)
    generation: Literal["ai", "extractive"]
    model_id: RecordId | None = None


class StudioArtifactPatch(StudioBase):
    title: ShortText | None = None
    cards: list[StudioCard] | None = Field(default=None, min_length=1, max_length=20)
    expected_updated_at: str | None = Field(default=None, max_length=100)

    @model_validator(mode="after")
    def has_edit(self):
        if self.title is None and self.cards is None:
            raise ValueError("Provide a title or cards to edit")
        return self


class StudioReadinessItem(StudioSource):
    ready: bool
    reason: str | None = None
    status: str | None = None


class StudioReadiness(StudioBase):
    notebook_id: RecordId
    sources: list[StudioReadinessItem]
    notes: list[StudioReadinessItem]
    ready_source_count: int
    warnings: list[str]


class StudioCapabilities(StudioBase):
    ai_available: bool
    pptx_available: bool
    video_available: bool
    supported_kinds: list[str]
    narration_available: bool = False
    video_audio: str = "optional_local"
    video_caption_note: str = "Captioned local video; review exported text."
