export type StudioKind =
  | 'slides'
  | 'video'
  | 'brief'
  | 'quiz'
  | 'flashcards'
  | 'mindmap'
  | 'timeline'
export type StudioStyle = 'editorial' | 'chalkboard' | 'minimal'
export type StudioExport = 'json' | 'markdown' | 'html' | 'pptx' | 'mp4' | 'srt'
export interface StudioCapabilities {
  ai_available: boolean
  pptx_available: boolean
  video_available: boolean
  narration_available?: boolean
  supported_kinds: StudioKind[]
}
export interface StudioReadiness {
  notebook_id: string
  sources: {
    id: string
    title: string
    ready: boolean
    reason?: string
    url?: string
    status?: string
  }[]
  notes: { id: string; title: string; ready: boolean }[]
  ready_source_count: number
  warnings: string[]
}
export interface StudioGenerateRequest {
  notebook_id: string
  kind: StudioKind
  topic: string
  audience: string
  style: StudioStyle
  language: string
  card_count: number
  source_ids?: string[] | null
  note_ids?: string[] | null
  model_id?: string | null
  generation: 'ai' | 'extractive'
}
export interface StudioCard {
  id: string
  title: string
  body: string
  bullets: string[]
  notes: string
  source_ids: string[]
  duration_seconds: number
  question?: string | null
  answer?: string | null
  options?: string[]
  correct_option?: number | null
}
export interface StudioArtifact {
  id: string
  notebook_id: string
  kind: StudioKind
  title: string
  audience: string
  style: string
  language: string
  created_at: string
  updated_at: string
  source_ids: string[]
  note_ids: string[]
  sources: { id: string; title: string; url?: string | null }[]
  cards: StudioCard[]
  warnings: string[]
  generation: 'ai' | 'extractive'
  model_id?: string | null
}
export interface StudioUpdateRequest {
  title?: string
  cards?: StudioCard[]
  expected_updated_at?: string
}
