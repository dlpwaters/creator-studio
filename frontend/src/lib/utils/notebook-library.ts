import type { NotebookResponse } from '@/lib/types/api'

export type NotebookSort = 'updated' | 'name'

export function getVisibleNotebooks(
  notebooks: NotebookResponse[] | undefined,
  query: string,
  sort: NotebookSort,
  language: string,
) {
  if (!notebooks) return undefined
  const normalized = query.trim().toLocaleLowerCase(language)
  return notebooks
    .filter((notebook) =>
      `${notebook.name} ${notebook.description ?? ''}`
        .toLocaleLowerCase(language)
        .includes(normalized),
    )
    .sort((a, b) =>
      sort === 'name'
        ? a.name.localeCompare(b.name, language, {
            numeric: true,
            sensitivity: 'base',
          })
        : new Date(b.updated).getTime() - new Date(a.updated).getTime(),
    )
}
