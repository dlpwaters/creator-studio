import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import { CommandPalette } from './CommandPalette'

const { push, pathname } = vi.hoisted(() => ({
  push: vi.fn(),
  pathname: { value: '/notebooks/notebook%3Aa%2Fb' }
}))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  usePathname: () => pathname.value
}))
vi.mock('@/lib/hooks/use-notebooks', () => ({
  useNotebooks: () => ({ data: [], isLoading: false })
}))
vi.mock('@/lib/stores/theme-store', () => ({
  useTheme: () => ({ setTheme: vi.fn() })
}))
vi.mock('@/components/ui/command', () => ({
  CommandDialog: ({
    open,
    children
  }: {
    open: boolean
    children: ReactNode
  }) => (open ? <div role="dialog">{children}</div> : null),
  CommandInput: ({
    onValueChange,
    value
  }: {
    onValueChange: (query: string) => void
    value: string
  }) => (
    <input
      aria-label="Command search"
      value={value}
      onChange={(event) => onValueChange(event.target.value)}
    />
  ),
  CommandList: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CommandGroup: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  CommandSeparator: () => <hr />,
  CommandItem: ({
    children,
    onSelect
  }: {
    children: ReactNode
    onSelect: () => void
  }) => <button onClick={onSelect}>{children}</button>
}))

describe('creation studio commands', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    pathname.value = '/notebooks/notebook%3Aa%2Fb'
  })

  it('opens the studio from navigation', async () => {
    render(<CommandPalette />)
    fireEvent(window, new Event('open-command-palette'))
    fireEvent.click(screen.getByRole('button', { name: 'workflows.studio' }))
    await waitFor(() => expect(push).toHaveBeenCalledWith('/studio'))
  })

  it('preserves the current notebook when choosing creation', async () => {
    render(<CommandPalette />)
    fireEvent(window, new Event('open-command-palette'))
    fireEvent.click(
      screen.getByRole('button', { name: 'workflows.createFromNotebook' })
    )
    await waitFor(() =>
      expect(push).toHaveBeenCalledWith('/studio?notebook=notebook%3Aa%2Fb')
    )
  })

  it('does not expose notebook-specific creation outside a notebook', () => {
    pathname.value = '/notebooks'
    render(<CommandPalette />)
    fireEvent(window, new Event('open-command-palette'))
    expect(
      screen.queryByRole('button', { name: 'workflows.createFromNotebook' })
    ).not.toBeInTheDocument()
  })

  it('ignores malformed notebook routes without throwing', () => {
    pathname.value = '/notebooks/%broken'
    render(<CommandPalette />)
    fireEvent(window, new Event('open-command-palette'))
    expect(
      screen.queryByRole('button', { name: 'workflows.createFromNotebook' })
    ).not.toBeInTheDocument()
  })
})
