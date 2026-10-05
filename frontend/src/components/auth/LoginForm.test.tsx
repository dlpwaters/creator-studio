import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor
} from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LoginForm } from './LoginForm'
import { useAuthStore } from '@/lib/stores/auth-store'

vi.unmock('@/lib/hooks/use-auth')
const storage = vi.hoisted(() => {
  const createStorage = () => {
    const values = new Map<string, string>()
    return {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => {
        values.set(key, value)
      },
      removeItem: (key: string) => {
        values.delete(key)
      },
      clear: () => values.clear()
    }
  }
  const local = createStorage(),
    session = createStorage()
  vi.stubGlobal('localStorage', local)
  vi.stubGlobal('sessionStorage', session)
  return { local, session }
})
const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }))
vi.mock('next/navigation', () => ({ useRouter: () => router }))
vi.mock('@/lib/config', () => ({
  getApiUrl: vi.fn().mockResolvedValue(''),
  getConfig: vi
    .fn()
    .mockResolvedValue({
      apiUrl: '',
      version: 'test',
      buildTime: '2026-10-04T00:00:00Z'
    })
}))
const response = (data: unknown) =>
  new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json' }
  })
beforeEach(() => {
  vi.stubGlobal('localStorage', storage.local)
  vi.stubGlobal('sessionStorage', storage.session)
  vi.clearAllMocks()
  localStorage.clear()
  sessionStorage.clear()
  useAuthStore.setState({
    isAuthenticated: false,
    token: null,
    isLoading: false,
    error: null,
    lastAuthCheck: null,
    isCheckingAuth: false,
    hasHydrated: true,
    authRequired: null
  })
  vi.stubGlobal('fetch', vi.fn())
  vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})
describe('LoginForm auth discovery and Studio return', () => {
  it('does not show a password form or redirect while auth status is unknown', async () => {
    vi.mocked(fetch).mockReturnValue(new Promise(() => {}))
    render(<LoginForm />)
    await waitFor(() => expect(fetch).toHaveBeenCalled())
    expect(
      screen.queryByPlaceholderText('auth.passwordPlaceholder')
    ).not.toBeInTheDocument()
    expect(screen.queryByText('common.connectionError')).not.toBeInTheDocument()
    expect(router.replace).not.toHaveBeenCalled()
    expect(router.push).not.toHaveBeenCalled()
  })
  it('preserves the Studio destination when authentication is disabled', async () => {
    sessionStorage.setItem(
      'redirectAfterLogin',
      '/studio?notebook=notebook%3Aone'
    )
    vi.mocked(fetch).mockImplementation(async () =>
      response({ auth_enabled: false })
    )
    render(<LoginForm />)
    await waitFor(() =>
      expect(router.replace).toHaveBeenCalledWith(
        '/studio?notebook=notebook%3Aone'
      )
    )
    expect(
      router.replace.mock.calls.every(
        ([destination]) => destination === '/studio?notebook=notebook%3Aone'
      )
    ).toBe(true)
    expect(sessionStorage.getItem('redirectAfterLogin')).toBeNull()
    expect(router.push).not.toHaveBeenCalled()
  })
  it('offers recovery after connection failure and keeps the intended route through login', async () => {
    sessionStorage.setItem(
      'redirectAfterLogin',
      '/studio?notebook=notebook%3Aone'
    )
    vi.mocked(fetch).mockRejectedValue(new TypeError('Failed to fetch'))
    render(<LoginForm />)
    await screen.findByText('common.connectionError')
    expect(
      screen.getByRole('button', { name: 'common.retryConnection' })
    ).toBeEnabled()
    expect(router.replace).not.toHaveBeenCalled()
    expect(sessionStorage.getItem('redirectAfterLogin')).toBe(
      '/studio?notebook=notebook%3Aone'
    )
    vi.mocked(fetch).mockImplementation(async (input) =>
      response(
        String(input).endsWith('/auth/status') ? { auth_enabled: true } : []
      )
    )
    await act(async () => {
      await useAuthStore.getState().checkAuthRequired()
    })
    const password = await screen.findByPlaceholderText(
      'auth.passwordPlaceholder'
    )
    fireEvent.change(password, { target: { value: 'test-password' } })
    fireEvent.click(screen.getByRole('button', { name: 'auth.signIn' }))
    await waitFor(() =>
      expect(router.push).toHaveBeenCalledWith(
        '/studio?notebook=notebook%3Aone'
      )
    )
    expect(sessionStorage.getItem('redirectAfterLogin')).toBeNull()
  })
})
