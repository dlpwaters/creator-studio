import { apiClient } from './client'
import type {
  StudioArtifact,
  StudioCapabilities,
  StudioCopyRequest,
  StudioExport,
  StudioGenerateRequest,
  StudioImportRequest,
  StudioLibraryPage,
  StudioLibraryQuery,
  StudioReadiness,
  StudioUpdateRequest
} from '@/lib/types/studio'

const artifactPath = (id: string) =>
  `/studio/artifacts/${encodeURIComponent(id)}`
export const studioApi = {
  library: async (notebookId: string, options: StudioLibraryQuery = {}) =>
    (
      await apiClient.get<StudioLibraryPage>('/studio/library', {
        params: { notebook_id: notebookId, ...options }
      })
    ).data,
  import: async (data: StudioImportRequest) =>
    (await apiClient.post<StudioArtifact>('/studio/artifacts/import', data))
      .data,
  copy: async (id: string, data: StudioCopyRequest = {}) =>
    (await apiClient.post<StudioArtifact>(`${artifactPath(id)}/copy`, data))
      .data,
  capabilities: async () =>
    (await apiClient.get<StudioCapabilities>('/studio/capabilities')).data,
  readiness: async (id: string) =>
    (
      await apiClient.get<StudioReadiness>(
        `/studio/notebooks/${encodeURIComponent(id)}/readiness`
      )
    ).data,
  list: async (notebookId?: string) =>
    (
      await apiClient.get<StudioArtifact[]>('/studio/artifacts', {
        params: notebookId ? { notebook_id: notebookId } : {}
      })
    ).data,
  get: async (id: string) =>
    (await apiClient.get<StudioArtifact>(artifactPath(id), { timeout: 30_000 }))
      .data,
  generate: async (data: StudioGenerateRequest) =>
    (await apiClient.post<StudioArtifact>('/studio/artifacts', data)).data,
  update: async (id: string, data: StudioUpdateRequest) =>
    (await apiClient.patch<StudioArtifact>(artifactPath(id), data)).data,
  delete: async (id: string) => {
    await apiClient.delete(artifactPath(id))
  },
  export: async (id: string, format: StudioExport, narration?: 'local') =>
    (
      await apiClient.get<Blob>(`${artifactPath(id)}/export/${format}`, {
        responseType: 'blob',
        params: narration ? { narration } : undefined
      })
    ).data
}
