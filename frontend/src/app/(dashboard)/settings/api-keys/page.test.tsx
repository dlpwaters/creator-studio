import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ApiKeysPage from './page'
import type { ModelDefaults } from '@/lib/types/models'

const {
  refetchCredentials,
  refetchModels,
  refetchDefaults,
  refetchStatus,
  status,
  credentials,
  modelDefaults,
  updateDefaults
} = vi.hoisted(() => ({
  refetchCredentials: vi.fn(),
  refetchModels: vi.fn(),
  refetchDefaults: vi.fn(),
  refetchStatus: vi.fn(),
  status: {
    data: undefined as
      | undefined
      | { encryption_configured: boolean; source: Record<string, string> },
    isError: false,
    isPending: true
  },
  credentials: { isError: false },
  modelDefaults: { data: null as ModelDefaults | null },
  updateDefaults: vi.fn()
}))
vi.mock('@/components/layout/AppShell', () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => <>{children}</>
}))
vi.mock('@/components/settings', () => ({
  MigrationBanner: () => null,
  ModelTestResultDialog: () => null
}))
vi.mock('@/lib/hooks/use-credentials', () => ({
  useCredentials: () => ({
    data: [],
    isLoading: false,
    isError: credentials.isError,
    refetch: refetchCredentials
  }),
  useCredentialStatus: () => ({ ...status, refetch: refetchStatus }),
  useEnvStatus: () => ({ data: {} })
}))
vi.mock('@/lib/hooks/use-models', () => ({
  useModels: () => ({
    data: [],
    isLoading: false,
    isError: false,
    refetch: refetchModels
  }),
  useModelDefaults: () => ({
    data: modelDefaults.data,
    isLoading: false,
    isError: false,
    refetch: refetchDefaults
  }),
  useUpdateModelDefaults: () => ({ mutate: updateDefaults }),
  useAutoAssignDefaults: () => ({ mutate: vi.fn(), isPending: false })
}))

describe('provider setup readiness', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    status.data = undefined
    status.isError = false
    status.isPending = true
    credentials.isError = false
    modelDefaults.data = null
  })

  it('waits for confirmed encryption before allowing credentials to be added', () => {
    render(<ApiKeysPage />)
    expect(screen.getByText('workflows.encryptionPending')).toBeVisible()
    screen
      .getAllByRole('button', { name: 'apiKeys.addConfig' })
      .forEach((button) => expect(button).toBeDisabled())
  })

  it('offers a retry when provider or encryption status cannot be loaded', () => {
    status.isError = true
    status.isPending = false
    credentials.isError = true
    render(<ApiKeysPage />)
    expect(screen.getByText('workflows.providerLoadError')).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'workflows.retry' }))
    expect(refetchCredentials).toHaveBeenCalledOnce()
    expect(refetchModels).toHaveBeenCalledOnce()
    expect(refetchDefaults).toHaveBeenCalledOnce()
    expect(refetchStatus).toHaveBeenCalledOnce()
  })

  it('enables provider configuration once server encryption is confirmed', () => {
    status.data = { encryption_configured: true, source: {} }
    status.isPending = false
    render(<ApiKeysPage />)
    screen
      .getAllByRole('button', { name: 'apiKeys.addConfig' })
      .forEach((button) => expect(button).toBeEnabled())
    expect(document.getElementById('provider-openai')).toBeInTheDocument()
    expect(document.getElementById('default-models')).toBeInTheDocument()
  })

  it('names each optional default removal and clears only the chosen assignment', () => {
    modelDefaults.data = {
      default_text_to_speech_model: 'model:tts',
      default_speech_to_text_model: 'model:stt',
      default_tools_model: 'model:language',
      large_context_model: 'model:language'
    }
    render(<ApiKeysPage />)
    const assignments = [
      ['models.ttsModelLabel', 'default_text_to_speech_model'],
      ['models.sttModelLabel', 'default_speech_to_text_model'],
      ['models.toolsModelLabel', 'default_tools_model'],
      ['models.largeContextModelLabel', 'large_context_model']
    ] as const
    for (const [label, key] of assignments) {
      fireEvent.click(screen.getByRole('button', { name: `common.remove: ${label}` }))
      expect(updateDefaults).toHaveBeenLastCalledWith({ [key]: null })
    }
    expect(updateDefaults).toHaveBeenCalledTimes(4)
  })

  it('keeps unconfigured provider text and inactive modality badges at full opacity', () => {
    render(<ApiKeysPage />)
    const provider = document.getElementById('provider-openai')!
    expect(provider.className).not.toMatch(/opacity-/)
    const modalities = provider.querySelectorAll('[data-slot="badge"].bg-muted')
    expect(modalities).toHaveLength(4)
    modalities.forEach(badge => {
      expect(badge).toHaveClass('text-muted-foreground')
      expect(badge.className).not.toMatch(/opacity-/)
    })
  })
})
