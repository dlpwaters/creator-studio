import {
  BookOpen,
  Film,
  Layers,
  ListChecks,
  Network,
  Presentation,
  Clock
} from 'lucide-react'

export const studioFormats = [
  {
    kind: 'slides',
    icon: Presentation,
    label: 'studio.slides',
    description: 'studio.slidesDescription'
  },
  {
    kind: 'video',
    icon: Film,
    label: 'studio.video',
    description: 'studio.videoDescription'
  },
  {
    kind: 'brief',
    icon: BookOpen,
    label: 'studio.brief',
    description: 'studio.briefDescription'
  },
  {
    kind: 'quiz',
    icon: ListChecks,
    label: 'studio.quiz',
    description: 'studio.quizDescription'
  },
  {
    kind: 'flashcards',
    icon: Layers,
    label: 'studio.flashcards',
    description: 'studio.flashcardsDescription'
  },
  {
    kind: 'mindmap',
    icon: Network,
    label: 'studio.mindmap',
    description: 'studio.mindmapDescription'
  },
  {
    kind: 'timeline',
    icon: Clock,
    label: 'studio.timeline',
    description: 'studio.timelineDescription'
  }
] as const
export const studioGeneration = {
  extractive: { label: 'studio.extractive', help: 'studio.extractiveHelp' },
  ai: { label: 'studio.ai', help: 'studio.aiHelp' }
} as const
export const studioStyles = {
  editorial: 'studio.editorial',
  chalkboard: 'studio.chalkboard',
  minimal: 'studio.minimal'
} as const
export const studioExports = {
  html: 'studio.html',
  markdown: 'studio.markdown',
  json: 'studio.json'
} as const
