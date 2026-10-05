'use client'

import Link from 'next/link'
import { Check, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTranslation } from '@/lib/hooks/use-translation'
import type { StudioReadiness } from '@/lib/types/studio'
import { StudioWarnings } from './StudioPrimitives'

export function SourceSelection({
  readiness,
  selected,
  onChange
}: {
  readiness: StudioReadiness
  selected: string[]
  onChange: (ids: string[]) => void
}) {
  const { t } = useTranslation()
  const readyIds = [...readiness.sources, ...readiness.notes]
    .filter((item) => item.ready)
    .map((item) => item.id)
  function toggle(id: string) {
    onChange(
      selected.includes(id)
        ? selected.filter((value) => value !== id)
        : [...selected, id]
    )
  }
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-medium">{t('studio.sourceMaterial')}</h3>
        <span className="text-xs tabular-nums text-muted-foreground">
          {t('studio.selectedCount', { count: selected.length })}
        </span>
      </div>
      <p className="text-sm leading-relaxed text-muted-foreground">
        {t('studio.sourceHelp')}
      </p>
      <div className="flex gap-3 text-xs">
        <button
          type="button"
          className="text-primary underline-offset-4 hover:underline focus-visible:outline-ring"
          onClick={() => onChange(readyIds)}
        >
          {t('studio.selectAll')}
        </button>
        <button
          type="button"
          className="text-muted-foreground underline-offset-4 hover:underline focus-visible:outline-ring"
          onClick={() => onChange([])}
        >
          {t('studio.clearSelection')}
        </button>
      </div>
      {!readyIds.length && (
        <div className="rounded-lg bg-muted/60 p-4">
          <FileText className="mb-2 size-5 text-muted-foreground" />
          <p className="text-sm">{t('studio.noMaterial')}</p>
          <Button className="mt-3" variant="outline" size="sm" asChild>
            <Link
              href={`/notebooks/${encodeURIComponent(readiness.notebook_id)}`}
            >
              {t('studio.addSources')}
            </Link>
          </Button>
        </div>
      )}
      <div className="max-h-64 space-y-3 overflow-y-auto pr-1">
        {(
          [
            ['studio.sources', readiness.sources],
            ['studio.notes', readiness.notes]
          ] as const
        ).map(
          ([group, items]) =>
            items.length > 0 && (
              <fieldset key={group}>
                <legend className="mb-1 text-xs font-medium text-muted-foreground">
                  {t(group)}
                </legend>
                <div className="space-y-1">
                  {items.map((item) => (
                    <label
                      key={item.id}
                      className={`flex cursor-pointer items-start gap-3 rounded-md p-2 transition-colors hover:bg-muted ${!item.ready ? 'opacity-60' : selected.includes(item.id) ? 'bg-accent/50' : ''}`}
                    >
                      <input
                        type="checkbox"
                        className="mt-1 accent-primary"
                        checked={item.ready && selected.includes(item.id)}
                        disabled={!item.ready}
                        onChange={() => toggle(item.id)}
                      />
                      <span className="min-w-0 flex-1 text-sm">
                        <span className="block break-words">
                          {item.title || item.id}
                        </span>
                        {!item.ready && (
                          <span className="mt-0.5 block text-xs text-muted-foreground">
                            {'reason' in item && item.reason
                              ? item.reason
                              : t('studio.notReady')}
                          </span>
                        )}
                      </span>
                      {item.ready && selected.includes(item.id) && (
                        <Check className="mt-1 size-3 text-primary" />
                      )}
                    </label>
                  ))}
                </div>
              </fieldset>
            )
        )}
      </div>
      <StudioWarnings warnings={readiness.warnings} />
    </section>
  )
}
