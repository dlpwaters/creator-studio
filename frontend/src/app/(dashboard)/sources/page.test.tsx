import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import SourcesPage from './page'

const { list, push } = vi.hoisted(() => ({ list: vi.fn(), push: vi.fn() }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }))
vi.mock('@/lib/api/sources', () => ({ sourcesApi: { list } }))
vi.mock('@/components/layout/AppShell', () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

describe('source library recovery', () => {
  beforeEach(() => {
    list.mockReset()
    push.mockReset()
  })

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

  it('keeps table keyboard shortcuts scoped and preserves native controls', async () => {
    list.mockResolvedValueOnce([{
      id: 'source:first', title: 'First source', created: '2026-01-01T00:00:00Z',
      updated: '2026-01-01T00:00:00Z', embedded: false, insights_count: 0,
    }])
    render(<SourcesPage />)
    const link = await screen.findByRole('link', { name: 'First source' })
    expect(document.activeElement).not.toBe(screen.getByRole('table'))
    fireEvent.keyDown(window, { key: 'Enter' })
    fireEvent.keyDown(screen.getByRole('button', { name: 'common.delete: First source' }), { key: 'Enter' })
    fireEvent.keyDown(link, { key: 'Enter' })
    expect(push).not.toHaveBeenCalled()
    fireEvent.keyDown(screen.getByRole('table'), { key: 'Enter' })
    expect(push).toHaveBeenCalledWith('/sources/source:first')
  })

  it('keeps a stale pagination response out of a newly sorted list', async () => {
    const source = (id: string) => ({ id, title: id, created: '2026-01-01T00:00:00Z',
      updated: '2026-01-01T00:00:00Z', embedded: false, insights_count: 0 })
    let resolveOldPage!: (value: ReturnType<typeof source>[]) => void
    const oldPage = new Promise<ReturnType<typeof source>[]>(resolve => { resolveOldPage = resolve })
    list.mockResolvedValueOnce(Array.from({ length: 30 }, (_, i) => source(`Original ${i}`)))
      .mockReturnValueOnce(oldPage)
      .mockResolvedValueOnce([source('New sort')])
    render(<SourcesPage />)
    await screen.findByRole('link', { name: 'Original 0' })
    await waitFor(() => expect(list).toHaveBeenCalledTimes(2))
    fireEvent.click(screen.getByRole('button', { name: /common.created_label/ }))
    await screen.findByRole('link', { name: 'New sort' })
    await act(async () => { resolveOldPage([source('Stale page')]); await oldPage })
    expect(screen.queryByRole('link', { name: 'Stale page' })).toBeNull()
    expect(screen.getByRole('link', { name: 'New sort' })).toBeVisible()
  })
})
