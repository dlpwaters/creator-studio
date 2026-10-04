'use client'

import { Suspense } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { StudioWorkspace } from '@/components/studio/StudioWorkspace'
import { StudioSkeleton } from '@/components/studio/StudioPrimitives'

export default function StudioPage() {
  return (
    <AppShell>
      <Suspense
        fallback={
          <div className="p-8">
            <StudioSkeleton />
          </div>
        }
      >
        <StudioWorkspace />
      </Suspense>
    </AppShell>
  )
}
