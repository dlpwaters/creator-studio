import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ApiKeysPage from './page'

const {
  refetchCredentials,
  refetchModels,
  refetchDefaults,
  refetchStatus,
  status,
  credentials
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
  credentials: { isError: false }
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
    data: null,
    isLoading: false,
    isError: false,
    refetch: refetchDefaults
  })
}))

describe('provider setup readiness', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    status.data = undefined
    status.isError = false
    status.isPending = true
    credentials.isError = false
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
})
