import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import SourcesPage from './page'

const { list } = vi.hoisted(() => ({ list: vi.fn() }))
vi.mock('@/lib/api/sources', () => ({ sourcesApi: { list } }))
vi.mock('@/components/layout/AppShell', () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

describe('source library recovery', () => {
  it('clears a failed request on retry and offers an action in the empty library', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    list.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce([])
    render(<SourcesPage />)
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'sources.failedToLoad',
    )
    fireEvent.click(screen.getByRole('button', { name: 'common.retry' }))
    expect(await screen.findByText('sources.noSourcesYet')).toBeVisible()
    expect(screen.queryByRole('alert')).toBeNull()
    expect(screen.getByRole('button', { name: 'sources.add' })).toBeVisible()
    expect(list).toHaveBeenCalledTimes(2)
    log.mockRestore()
  })
})
