'use client'

import { AlertCircle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTranslation } from '@/lib/hooks/use-translation'
import { formatApiError } from '@/lib/utils/error-handler'

export const studioFieldClass =
  'w-full min-w-0 rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50'
export function StudioError({
  error,
  title,
  retry
}: {
  error: unknown
  title: string
  retry?: () => void
}) {
  const { t } = useTranslation()
  return (
    <div
      role="alert"
      className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm"
    >
      <div className="flex items-start gap-2">
        <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
        <div className="min-w-0">
          <p className="font-medium">{title}</p>
          <p className="mt-1 break-words text-muted-foreground">
            {formatApiError(error)}
          </p>
        </div>
      </div>
      {retry && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-3"
          onClick={retry}
        >
          <RefreshCw className="size-3" />
          {t('studio.retry')}
        </Button>
      )}
    </div>
  )
}
export function StudioSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true">
      <div className="h-7 w-1/3 animate-pulse rounded bg-muted motion-reduce:animate-none" />
      <div className="h-32 animate-pulse rounded-xl bg-muted motion-reduce:animate-none" />
      <div className="h-24 animate-pulse rounded-xl bg-muted motion-reduce:animate-none" />
    </div>
  )
}
export function StudioWarnings({ warnings }: { warnings: string[] }) {
  const { t } = useTranslation()
  if (!warnings.length) return null
  return (
    <details
      open
      className="rounded-lg border border-primary/20 bg-accent/40 p-3 text-sm"
    >
      <summary className="cursor-pointer font-medium focus-visible:outline-ring">
        {t('studio.warnings')} ({warnings.length})
      </summary>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
        {warnings.map((warning, i) => (
          <li key={i}>{warning}</li>
        ))}
      </ul>
    </details>
  )
}
export function safeSourceUrl(url?: string | null) {
  if (!url) return undefined
  try {
    const parsed = new URL(url)
    return ['http:', 'https:'].includes(parsed.protocol) &&
      !parsed.username &&
      !parsed.password
      ? parsed.href
      : undefined
  } catch {
    return undefined
  }
}
