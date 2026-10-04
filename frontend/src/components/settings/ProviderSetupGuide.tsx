'use client'

import { ArrowUpRight } from 'lucide-react'
import { useTranslation } from '@/lib/hooks/use-translation'

interface ProviderSetupGuideProps {
  hasCredentials: boolean
}

export function ProviderSetupGuide({
  hasCredentials
}: ProviderSetupGuideProps) {
  const { t } = useTranslation()
  const linkClass =
    'inline-flex items-center gap-1 rounded-sm text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

  return (
    <details
      className="rounded-lg border bg-muted/20 px-5 py-4"
      open={!hasCredentials}
    >
      <summary className="cursor-pointer text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        {t('workflows.providerTitle')}
      </summary>
      <p className="mt-3 max-w-3xl text-sm text-muted-foreground">
        {t('workflows.providerDescription')}
      </p>
      <ol className="mt-5 grid gap-5 text-sm md:grid-cols-2">
        <li className="space-y-2">
          <h2 className="font-medium">1. {t('workflows.openaiKeyStep')}</h2>
          <p className="max-w-prose text-muted-foreground">
            {t('workflows.openaiBilling')}
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            <a
              href="https://platform.openai.com/api-keys"
              target="_blank"
              rel="noopener noreferrer"
              className={linkClass}
            >
              {t('workflows.openaiApiKeys')}
              <ArrowUpRight className="size-3.5" aria-hidden="true" />
            </a>
            <a
              href="https://developers.openai.com/api/reference/overview#authentication"
              target="_blank"
              rel="noopener noreferrer"
              className={linkClass}
            >
              {t('workflows.openaiAuthDocs')}
              <ArrowUpRight className="size-3.5" aria-hidden="true" />
            </a>
          </div>
        </li>
        <li className="space-y-2">
          <h2 className="font-medium">2. {t('workflows.saveKeyStep')}</h2>
          <p className="max-w-prose text-muted-foreground">
            {t('workflows.saveKeyDescription')}
          </p>
          <a href="#provider-openai" className={linkClass}>
            {t('workflows.configureOpenAI')}
          </a>
        </li>
        <li className="space-y-2">
          <h2 className="font-medium">3. {t('workflows.testStep')}</h2>
          <p className="max-w-prose text-muted-foreground">
            {t('workflows.testDescription')}
          </p>
        </li>
        <li className="space-y-2">
          <h2 className="font-medium">4. {t('workflows.defaultsStep')}</h2>
          <p className="max-w-prose text-muted-foreground">
            {t('workflows.defaultsDescription')}
          </p>
          <a href="#default-models" className={linkClass}>
            {t('workflows.chooseDefaults')}
          </a>
        </li>
      </ol>
    </details>
  )
}
