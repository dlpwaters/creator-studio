import { describe, expect, it } from 'vitest'
import type { NotebookResponse } from '@/lib/types/api'
import { getVisibleNotebooks } from './notebook-library'

const notebooks: NotebookResponse[] = [
  {
    id: 'notebook:2',
    name: 'Project 10',
    description: 'Coastal ecology',
    archived: false,
    created: '2026-01-01',
    updated: '2026-02-01',
    source_count: 2,
    note_count: 1,
  },
  {
    id: 'notebook:1',
    name: 'Project 2',
    description: 'Forest research',
    archived: false,
    created: '2026-01-01',
    updated: '2026-03-01',
    source_count: 1,
    note_count: 0,
  },
]

describe('notebook library', () => {
  it('finds descriptions as well as names, ignoring whitespace and case', () => {
    expect(
      getVisibleNotebooks(notebooks, '  COASTAL ', 'updated', 'en-US')?.map(
        (item) => item.id,
      ),
    ).toEqual(['notebook:2'])
    expect(
      getVisibleNotebooks(notebooks, 'PROJECT', 'updated', 'en-US'),
    ).toHaveLength(2)
  })

  it('sorts most recently updated first without changing cached data', () => {
    const originalOrder = notebooks.map((item) => item.id)
    expect(
      getVisibleNotebooks(notebooks, '', 'updated', 'en-US')?.map(
        (item) => item.id,
      ),
    ).toEqual(['notebook:1', 'notebook:2'])
    expect(notebooks.map((item) => item.id)).toEqual(originalOrder)
  })

  it('uses natural alphabetical sorting for numbered notebook names', () => {
    expect(
      getVisibleNotebooks(notebooks, '', 'name', 'en-US')?.map(
        (item) => item.name,
      ),
    ).toEqual(['Project 2', 'Project 10'])
  })

  it('uses the selected language for case matching', () => {
    const turkish = [{ ...notebooks[0], name: 'IŞIK', description: '' }]
    expect(getVisibleNotebooks(turkish, 'ışık', 'name', 'tr-TR')).toHaveLength(
      1,
    )
  })

  it('distinguishes data that has not loaded from an empty result', () => {
    expect(
      getVisibleNotebooks(undefined, '', 'updated', 'en-US'),
    ).toBeUndefined()
    expect(
      getVisibleNotebooks(notebooks, 'no matches', 'updated', 'en-US'),
    ).toEqual([])
  })
})
