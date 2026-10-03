'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import type { TFunction } from 'i18next'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/hooks/use-auth'
import { useSidebarStore } from '@/lib/stores/sidebar-store'
import { useCreateDialogs } from '@/lib/hooks/use-create-dialogs'
import { useTranslation } from '@/lib/hooks/use-translation'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ThemeToggle } from '@/components/common/ThemeToggle'
import { LanguageToggle } from '@/components/common/LanguageToggle'
import {
  Book,
  Search,
  Mic,
  Bot,
  Shuffle,
  Settings,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  FileText,
  Plus,
  Wrench,
  Command,
} from 'lucide-react'

const getNavigation = (t: TFunction) => [
  {
    title: t('navigation.process'),
    items: [
      { name: t('navigation.notebooks'), href: '/notebooks', icon: Book },
      { name: t('navigation.askAndSearch'), href: '/search', icon: Search },
    ],
  },
  {
    title: t('navigation.collect'),
    items: [
      { name: t('navigation.sources'), href: '/sources', icon: FileText },
    ],
  },
  {
    title: t('navigation.create'),
    items: [{ name: t('navigation.podcasts'), href: '/podcasts', icon: Mic }],
  },
  {
    title: t('navigation.manage'),
    items: [
      { name: t('navigation.models'), href: '/settings/api-keys', icon: Bot },
      {
        name: t('navigation.transformations'),
        href: '/transformations',
        icon: Shuffle,
      },
      { name: t('navigation.settings'), href: '/settings', icon: Settings },
      { name: t('navigation.advanced'), href: '/advanced', icon: Wrench },
    ],
  },
]

interface AppSidebarProps {
  mobile?: boolean
  onNavigate?: () => void
}

export function AppSidebar({ mobile = false, onNavigate }: AppSidebarProps) {
  const { t } = useTranslation()
  const pathname = usePathname()
  const { logout } = useAuth()
  const { isCollapsed: storedCollapsed, toggleCollapse } = useSidebarStore()
  const isCollapsed = !mobile && storedCollapsed
  const { openSourceDialog, openNotebookDialog, openPodcastDialog } =
    useCreateDialogs()
  const [createMenuOpen, setCreateMenuOpen] = useState(false)
  const [isMac, setIsMac] = useState(false)
  const navigation = getNavigation(t)
  // Match the longest path so Models and Settings cannot both be active.
  const activeHref = navigation
    .flatMap((group) => group.items)
    .filter(
      (link) => pathname === link.href || pathname?.startsWith(`${link.href}/`),
    )
    .sort((a, b) => b.href.length - a.href.length)[0]?.href

  useEffect(() => {
    setIsMac(navigator.platform.toLowerCase().includes('mac'))
  }, [])

  const createItems = [
    { name: t('common.newNotebook'), icon: Book, action: openNotebookDialog },
    { name: t('common.newSource'), icon: FileText, action: openSourceDialog },
    { name: t('common.podcast'), icon: Mic, action: openPodcastDialog },
  ]

  return (
    <TooltipProvider delayDuration={100}>
      <aside
        className={cn(
          'app-sidebar flex h-full min-h-0 shrink-0 flex-col border-r',
          isCollapsed ? 'w-16' : 'w-60',
          mobile && 'w-full border-0',
        )}
      >
        <div
          className={cn(
            'flex h-16 shrink-0 items-center gap-2',
            isCollapsed ? 'justify-center px-2' : 'px-4',
          )}
        >
          {!isCollapsed && (
            <Link
              href="/notebooks"
              onClick={onNavigate}
              className="flex min-w-0 flex-1 items-center gap-2.5 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Image src="/logo.svg" alt="" width={26} height={26} />
              <span className="text-sm font-semibold tracking-tight">
                {t('common.appName')}
              </span>
            </Link>
          )}
          {!mobile && (
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleCollapse}
              data-testid="sidebar-toggle"
              aria-label={t(
                isCollapsed
                  ? 'workspace.expandSidebar'
                  : 'workspace.collapseSidebar',
              )}
              className="size-8 text-muted-foreground"
            >
              {isCollapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
            </Button>
          )}
        </div>

        <div className={cn('shrink-0 pb-3', isCollapsed ? 'px-2' : 'px-4')}>
          <DropdownMenu open={createMenuOpen} onOpenChange={setCreateMenuOpen}>
            <DropdownMenuTrigger asChild>
              <Button
                className={cn('h-10 w-full', !isCollapsed && 'justify-start')}
                aria-label={t('common.create')}
              >
                <Plus />
                {!isCollapsed && t('common.create')}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              side={isCollapsed ? 'right' : 'bottom'}
              align="start"
              className="w-52"
            >
              {createItems.map((item) => (
                <DropdownMenuItem
                  key={item.name}
                  className="gap-2"
                  onSelect={() => {
                    setCreateMenuOpen(false)
                    onNavigate?.()
                    // Let the mobile navigation dialog return focus before opening a form.
                    setTimeout(item.action, 0)
                  }}
                >
                  <item.icon className="size-4" />
                  {item.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <nav
          aria-label={t('navigation.nav')}
          className={cn(
            'min-h-0 flex-1 overflow-y-auto pb-4',
            isCollapsed ? 'px-2' : 'px-3',
          )}
        >
          {navigation.map((section, index) => (
            <div key={section.title} className={cn(index > 0 && 'mt-4')}>
              {!isCollapsed && (
                <h3 className="mb-1.5 px-3 text-xs font-medium text-muted-foreground">
                  {section.title}
                </h3>
              )}
              <div className="space-y-1">
                {section.items.map((item) => {
                  const isActive = item.href === activeHref
                  const link = (
                    <Button
                      asChild
                      variant="ghost"
                      className={cn(
                        'sidebar-menu-item h-10 w-full gap-3 font-normal',
                        isCollapsed
                          ? 'justify-center px-2'
                          : 'justify-start px-3',
                        isActive &&
                          'bg-sidebar-accent font-medium text-sidebar-accent-foreground',
                      )}
                    >
                      <Link
                        href={item.href}
                        onClick={onNavigate}
                        aria-current={isActive ? 'page' : undefined}
                        aria-label={isCollapsed ? item.name : undefined}
                      >
                        <item.icon className="size-4" />
                        {!isCollapsed && <span>{item.name}</span>}
                      </Link>
                    </Button>
                  )
                  return isCollapsed ? (
                    <Tooltip key={item.href}>
                      <TooltipTrigger asChild>{link}</TooltipTrigger>
                      <TooltipContent side="right">{item.name}</TooltipContent>
                    </Tooltip>
                  ) : (
                    <div key={item.href}>{link}</div>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        <div
          className={cn(
            'shrink-0 space-y-2 border-t py-3',
            isCollapsed ? 'px-2' : 'px-3',
          )}
        >
          <Button
            variant="ghost"
            aria-label={t('common.quickActions')}
            className={cn(
              'w-full text-muted-foreground',
              !isCollapsed && 'justify-between px-3',
            )}
            onClick={() => {
              onNavigate?.()
              setTimeout(
                () => window.dispatchEvent(new Event('open-command-palette')),
                0,
              )
            }}
          >
            <span className="flex items-center gap-2">
              <Command className="size-4" />
              {!isCollapsed && (
                <span className="text-xs">{t('common.quickActions')}</span>
              )}
            </span>
            {!isCollapsed && (
              <kbd className="rounded border px-1.5 py-0.5 font-mono text-[10px]">
                {isMac ? '⌘' : 'Ctrl+'}K
              </kbd>
            )}
          </Button>
          <div
            className={cn(
              'flex gap-1',
              isCollapsed
                ? 'flex-col items-center'
                : 'items-center justify-between px-2',
            )}
          >
            <ThemeToggle iconOnly />
            <LanguageToggle iconOnly />
            {!isCollapsed && (
              <Button
                variant="ghost"
                size="icon"
                onClick={logout}
                aria-label={t('common.signOut')}
                className="text-muted-foreground"
              >
                <LogOut />
              </Button>
            )}
          </div>
          {isCollapsed && (
            <Button
              variant="ghost"
              size="icon"
              onClick={logout}
              aria-label={t('common.signOut')}
              className="w-full text-muted-foreground"
            >
              <LogOut />
            </Button>
          )}
        </div>
      </aside>
    </TooltipProvider>
  )
}
