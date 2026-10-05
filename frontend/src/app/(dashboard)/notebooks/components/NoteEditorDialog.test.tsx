import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NoteEditorDialog } from './NoteEditorDialog'

const { noteQuery, updateNote, createNote, t } = vi.hoisted(() => ({
  noteQuery: { data: undefined as undefined | { id: string; title: string; content: string }, isLoading: false },
  updateNote: vi.fn().mockResolvedValue({}),
  createNote: vi.fn().mockResolvedValue({}),
  t: (key: string) => key,
}))
vi.mock('@/lib/hooks/use-translation', () => ({ useTranslation: () => ({ t }) }))
vi.mock('@/lib/hooks/use-notes', () => ({
  useNote: () => ({ ...noteQuery }),
  useCreateNote: () => ({ mutateAsync: createNote, isPending: false }),
  useUpdateNote: () => ({ mutateAsync: updateNote, isPending: false }),
}))
vi.mock('@/components/ui/markdown-editor', () => ({
  MarkdownEditor: ({ value, onChange }: { value: string; onChange: (value: string) => void }) => <textarea aria-label="Note content" value={value} onChange={event => onChange(event.target.value)} />,
}))
vi.mock('@/components/common/InlineEdit', () => ({
  InlineEdit: ({ value, onSave }: { value: string; onSave: (value: string) => void }) => <input aria-label="Note title" value={value} onChange={event => onSave(event.target.value)} />,
}))
vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ open, children }: { open: boolean; children: ReactNode }) => open ? <div>{children}</div> : null,
  DialogContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: ReactNode }) => <h1>{children}</h1>,
}))

const cached = { id: 'note:one', title: 'Cached title', content: 'Cached content' }
const refreshed = { ...cached, title: 'Refreshed title', content: 'Refreshed content' }
const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>

describe('note draft ownership', () => {
  beforeEach(() => { vi.clearAllMocks(); noteQuery.data = cached; noteQuery.isLoading = false })

  it('preserves and saves a dirty cached-note draft when background data arrives', async () => {
    const onOpenChange = vi.fn()
    const props = { open: true, onOpenChange, notebookId: 'notebook:one', note: cached }
    const { rerender } = render(<NoteEditorDialog {...props} />, { wrapper })
    fireEvent.change(screen.getByRole('textbox', { name: 'Note content' }), { target: { value: 'My unsaved draft' } })
    noteQuery.data = refreshed
    rerender(<NoteEditorDialog {...props} note={{ ...cached }} />)
    expect(screen.getByRole('textbox', { name: 'Note content' })).toHaveValue('My unsaved draft')
    fireEvent.click(screen.getByRole('button', { name: 'sources.saveNote' }))
    await waitFor(() => expect(updateNote).toHaveBeenCalledWith({ id: 'note:one', data: { title: 'Cached title', content: 'My unsaved draft' } }))
  })

  it('accepts refreshed cached content while the form is still clean', () => {
    const props = { open: true, onOpenChange: vi.fn(), notebookId: 'notebook:one', note: cached }
    const { rerender } = render(<NoteEditorDialog {...props} />, { wrapper })
    noteQuery.data = refreshed
    rerender(<NoteEditorDialog {...props} />)
    expect(screen.getByRole('textbox', { name: 'Note content' })).toHaveValue('Refreshed content')
    expect(screen.getByRole('textbox', { name: 'Note title' })).toHaveValue('Refreshed title')
  })

  it('treats inline title changes as a draft', () => {
    const props = { open: true, onOpenChange: vi.fn(), notebookId: 'notebook:one', note: cached }
    const { rerender } = render(<NoteEditorDialog {...props} />, { wrapper })
    fireEvent.change(screen.getByRole('textbox', { name: 'Note title' }), { target: { value: 'My draft title' } })
    noteQuery.data = refreshed
    rerender(<NoteEditorDialog {...props} />)
    expect(screen.getByRole('textbox', { name: 'Note title' })).toHaveValue('My draft title')
    expect(screen.getByRole('textbox', { name: 'Note content' })).toHaveValue('Cached content')
  })

  it('loads a deliberately selected different note even when the previous note was dirty', () => {
    const props = { open: true, onOpenChange: vi.fn(), notebookId: 'notebook:one', note: cached }
    const { rerender } = render(<NoteEditorDialog {...props} />, { wrapper })
    fireEvent.change(screen.getByRole('textbox', { name: 'Note content' }), { target: { value: 'Draft for the first note' } })
    const second = { id: 'note:two', title: 'Second title', content: 'Second content' }
    noteQuery.data = second
    rerender(<NoteEditorDialog {...props} note={second} />)
    expect(screen.getByRole('textbox', { name: 'Note content' })).toHaveValue('Second content')
  })
})
