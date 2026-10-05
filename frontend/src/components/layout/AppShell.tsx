'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { Menu, Search, ChevronRight, BookOpen } from 'lucide-react'
import { AppSidebar } from './AppSidebar'
import { SetupBanner } from './SetupBanner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { useTranslation } from '@/lib/hooks/use-translation'

interface AppShellProps {
  children: React.ReactNode
}

export function AppShell({ children }: AppShellProps) {
  const { t } = useTranslation()
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const routes = [
    ['/notebooks', 'navigation.notebooks'],
    ['/sources', 'navigation.sources'],
    ['/search', 'navigation.askAndSearch'],
    ['/podcasts', 'navigation.podcasts'],
    ['/studio', 'workflows.studio'],
    ['/settings/api-keys', 'navigation.models'],
    ['/settings', 'navigation.settings'],
    ['/transformations', 'navigation.transformations'],
    ['/advanced', 'navigation.advanced'],
  ]
  const current = routes.find(
    ([path]) => pathname === path || pathname?.startsWith(`${path}/`),
  )

  return (
    <div className="flex h-dvh overflow-hidden">
      <a
        href="#main-content"
        className="fixed left-4 top-4 z-50 -translate-y-24 rounded-md bg-primary px-4 py-2 text-primary-foreground focus:translate-y-0"
      >
        {t('workspace.skipToContent')}
      </a>
      <div className="hidden h-full lg:block">
        <AppSidebar />
      </div>
      <main
        id="main-content"
        tabIndex={-1}
        className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden outline-none"
      >
        <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3 text-sm">
            <Dialog open={mobileOpen} onOpenChange={setMobileOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="lg:hidden"
                  aria-label={t('workspace.openNavigation')}
                >
                  <Menu />
                </Button>
              </DialogTrigger>
              <DialogContent className="left-0 top-0 flex h-dvh w-72 max-w-[calc(100%-3rem)] translate-x-0 translate-y-0 flex-col gap-0 rounded-none p-0 sm:max-w-72">
                <DialogTitle className="sr-only">
                  {t('navigation.nav')}
                </DialogTitle>
                <AppSidebar mobile onNavigate={() => setMobileOpen(false)} />
              </DialogContent>
            </Dialog>
            <BookOpen className="hidden size-4 text-muted-foreground sm:block" />
            <span className="hidden text-muted-foreground sm:inline">
              {t('workspace.researchWorkspace')}
            </span>
            <ChevronRight className="hidden size-3 text-muted-foreground sm:block" />
            <span className="truncate font-medium">
              {current ? t(current[1]) : t('common.appName')}
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            aria-label={t('common.quickActions')}
            className="text-muted-foreground"
            onClick={() =>
              window.dispatchEvent(new Event('open-command-palette'))
            }
          >
            <Search className="size-4" />
            <span className="hidden sm:inline">{t('common.quickActions')}</span>
          </Button>
        </header>
        <SetupBanner />
        {children}
      </main>
    </div>
  )
}
