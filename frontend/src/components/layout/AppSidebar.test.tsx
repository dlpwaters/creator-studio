/* eslint-disable @typescript-eslint/no-explicit-any */
import { render, screen, fireEvent } from '@testing-library/react'
import { beforeEach, describe, it, expect, vi } from 'vitest'
import { usePathname } from 'next/navigation'
import { AppSidebar } from './AppSidebar'
import { useSidebarStore } from '@/lib/stores/sidebar-store'

vi.mock('next/navigation', () => ({ usePathname: vi.fn(() => '/notebooks') }))

// Mock Tooltip components to avoid Radix UI async issues in tests
vi.mock('@/components/ui/tooltip', () => ({
  TooltipProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

describe('AppSidebar', () => {
  beforeEach(() => {
    vi.mocked(useSidebarStore).mockReturnValue({ isCollapsed: false, toggleCollapse: vi.fn() } as any)
    vi.mocked(usePathname).mockReturnValue('/notebooks')
  })
  it('renders correctly when expanded', () => {
    render(<AppSidebar />)

    // With mocked t() returning keys, check for translation key strings
    expect(screen.getByText('common.appName')).toBeDefined()
    expect(screen.getByText('navigation.sources')).toBeDefined()
    expect(screen.getByText('navigation.notebooks')).toBeDefined()
  })

  it('toggles collapse state when clicking handle', () => {
    const toggleCollapse = vi.fn()
    vi.mocked(useSidebarStore).mockReturnValue({
      isCollapsed: false,
      toggleCollapse,
    } as any)

    render(<AppSidebar />)

    fireEvent.click(screen.getByTestId('sidebar-toggle'))

    expect(toggleCollapse).toHaveBeenCalled()
  })

  it('shows collapsed view when isCollapsed is true', () => {
    vi.mocked(useSidebarStore).mockReturnValue({
      isCollapsed: true,
      toggleCollapse: vi.fn(),
    } as any)

    render(<AppSidebar />)

    // In collapsed mode, app name shouldn't be visible (as text)
    expect(screen.queryByText('common.appName')).toBeNull()
  })

  it('marks only the most specific settings route as current', () => {
    vi.mocked(usePathname).mockReturnValue('/settings/api-keys')
    render(<AppSidebar />)
    expect(screen.getByRole('link', { name: 'navigation.models' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'navigation.settings' })).not.toHaveAttribute('aria-current')
    expect(document.querySelectorAll('[aria-current="page"]')).toHaveLength(1)
    expect(document.querySelector('a button, button a')).toBeNull()
  })

  it('keeps collapsed navigation and expansion accessible by name', () => {
    vi.mocked(useSidebarStore).mockReturnValue({ isCollapsed: true, toggleCollapse: vi.fn() } as any)
    render(<AppSidebar />)
    expect(screen.getByRole('link', { name: 'navigation.notebooks' })).toHaveAttribute('href', '/notebooks')
    expect(screen.getByRole('button', { name: 'workspace.expandSidebar' })).toBeVisible()
  })

  it('opens mobile navigation expanded and closes it when a route is selected', () => {
    const onNavigate = vi.fn()
    vi.mocked(useSidebarStore).mockReturnValue({ isCollapsed: true, toggleCollapse: vi.fn() } as any)
    render(<AppSidebar mobile onNavigate={onNavigate} />)
    expect(screen.getByText('common.appName')).toBeVisible()
    const sourceLink = screen.getByRole('link', { name: 'navigation.sources' })
    sourceLink.addEventListener('click', event => event.preventDefault())
    fireEvent.click(sourceLink)
    expect(onNavigate).toHaveBeenCalledOnce()
  })
})
