import { apiClient } from './client'
import type {
  StudioArtifact,
  StudioCapabilities,
  StudioExport,
  StudioGenerateRequest,
  StudioReadiness,
  StudioUpdateRequest
} from '@/lib/types/studio'

const artifactPath = (id: string) =>
  `/studio/artifacts/${encodeURIComponent(id)}`
export const studioApi = {
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
    (await apiClient.get<StudioArtifact>(artifactPath(id))).data,
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
