import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { studioApi } from '@/lib/api/studio'
import type {
  StudioGenerateRequest,
  StudioCopyRequest,
  StudioImportRequest,
  StudioLibraryQuery,
  StudioUpdateRequest
} from '@/lib/types/studio'

export const studioKeys = {
  all: ['studio'] as const,
  capabilities: ['studio', 'capabilities'] as const,
  readiness: (id: string) => ['studio', 'readiness', id] as const,
  artifacts: (id?: string) => ['studio', 'artifacts', id ?? 'all'] as const
}
export function useStudioLibrary(id: string, options: StudioLibraryQuery = {}) {
  return useQuery({
    queryKey: ['studio', 'library', id, options] as const,
    queryFn: () => studioApi.library(id, options),
    enabled: !!id
  })
}
export function useStudioImport() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (data: StudioImportRequest) => studioApi.import(data),
    retry: false,
    onSuccess: () =>
      Promise.all([
        client.invalidateQueries({ queryKey: ['studio', 'artifacts'] }),
        client.invalidateQueries({ queryKey: ['studio', 'library'] })
      ])
  })
}
export function useStudioCopy() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data?: StudioCopyRequest }) =>
      studioApi.copy(id, data),
    retry: false,
    onSuccess: () =>
      Promise.all([
        client.invalidateQueries({ queryKey: ['studio', 'artifacts'] }),
        client.invalidateQueries({ queryKey: ['studio', 'library'] })
      ])
  })
}
export function useStudioCapabilities() {
  return useQuery({
    queryKey: studioKeys.capabilities,
    queryFn: studioApi.capabilities
  })
}
export function useStudioReadiness(id: string) {
  return useQuery({
    queryKey: studioKeys.readiness(id),
    queryFn: () => studioApi.readiness(id),
    enabled: !!id,
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchInterval: (query) =>
      query.state.data?.sources.some(
        (source) =>
          !source.ready &&
          ['new', 'pending', 'queued', 'running', 'processing'].includes(
            source.status ?? ''
          )
      )
        ? 5000
        : false
  })
}
export function useStudioArtifacts(id?: string) {
  return useQuery({
    queryKey: studioKeys.artifacts(id),
    queryFn: () => studioApi.list(id),
    enabled: !!id
  })
}
export function useStudioGenerate() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (data: StudioGenerateRequest) => studioApi.generate(data),
    retry: false,
    onSuccess: () =>
      Promise.all([
        client.invalidateQueries({ queryKey: ['studio', 'artifacts'] }),
        client.invalidateQueries({ queryKey: ['studio', 'library'] })
      ])
  })
}
export function useStudioUpdate() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: StudioUpdateRequest }) =>
      studioApi.update(id, data),
    retry: false,
    onSuccess: () =>
      Promise.all([
        client.invalidateQueries({ queryKey: ['studio', 'artifacts'] }),
        client.invalidateQueries({ queryKey: ['studio', 'library'] })
      ])
  })
}
export function useStudioDelete() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: studioApi.delete,
    retry: false,
    onSuccess: () =>
      Promise.all([
        client.invalidateQueries({ queryKey: ['studio', 'artifacts'] }),
        client.invalidateQueries({ queryKey: ['studio', 'library'] })
      ])
  })
}
