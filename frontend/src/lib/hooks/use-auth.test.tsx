import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuth } from './use-auth'
import { NAVIGATION_REQUEST_EVENT } from '@/lib/utils/request-navigation'
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
vi.mock('@/lib/config', () => ({ getApiUrl: vi.fn().mockResolvedValue('') }))
const response = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
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
describe('useAuth readiness and return route', () => {
  it('lets a dirty editor defer sign-out until its navigation is approved', () => {
    useAuthStore.setState({
      authRequired: true,
      isAuthenticated: true,
      token: 'test-password',
      lastAuthCheck: Date.now()
    })
    const { result } = renderHook(() => useAuth())
    let resume!: () => void
    const guard = (event: Event) => {
      event.preventDefault()
      resume = (event as CustomEvent<{ navigate: () => void }>).detail.navigate
    }
    window.addEventListener(NAVIGATION_REQUEST_EVENT, guard)
    try {
      act(() => {
        result.current.logout()
      })
      expect(useAuthStore.getState().isAuthenticated).toBe(true)
      expect(router.push).not.toHaveBeenCalled()
      act(() => {
        resume()
      })
      expect(useAuthStore.getState().isAuthenticated).toBe(false)
      expect(router.push).toHaveBeenCalledWith('/login')
    } finally {
      window.removeEventListener(NAVIGATION_REQUEST_EVENT, guard)
    }
  })

  it('waits for hydration without making an auth request or navigating', () => {
    useAuthStore.setState({ hasHydrated: false })
    const { result } = renderHook(() => useAuth())
    expect(result.current.isLoading).toBe(true)
    expect(fetch).not.toHaveBeenCalled()
    expect(router.push).not.toHaveBeenCalled()
  })
  it('keeps unknown auth status loading until the server resolves it', async () => {
    let resolveStatus!: (value: Response) => void
    vi.mocked(fetch).mockReturnValue(
      new Promise((resolve) => {
        resolveStatus = resolve
      })
    )
    const { result } = renderHook(() => useAuth())
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1))
    expect(result.current.isLoading).toBe(true)
    expect(result.current.isAuthenticated).toBe(false)
    expect(router.push).not.toHaveBeenCalled()
    await act(async () => {
      resolveStatus(response({ auth_enabled: false }))
    })
    await waitFor(() => expect(result.current.isAuthenticated).toBe(true))
    expect(result.current.isLoading).toBe(false)
  })
  it('exposes a connection failure without trapping recovery behind loading', async () => {
    vi.mocked(fetch).mockRejectedValue(new TypeError('Failed to fetch'))
    const { result } = renderHook(() => useAuth())
    await waitFor(() =>
      expect(result.current.error).toContain('Unable to connect')
    )
    expect(useAuthStore.getState().authRequired).toBeNull()
    expect(result.current.isLoading).toBe(false)
    expect(router.push).not.toHaveBeenCalled()
    vi.mocked(fetch).mockResolvedValue(response({ auth_enabled: false }))
    await act(async () => {
      await useAuthStore.getState().checkAuthRequired()
    })
    await waitFor(() => expect(result.current.isAuthenticated).toBe(true))
    expect(result.current.isLoading).toBe(false)
  })
  it('returns a successful login to the exact safe Studio notebook destination', async () => {
    useAuthStore.setState({ authRequired: true })
    sessionStorage.setItem(
      'redirectAfterLogin',
      '/studio?notebook=notebook%3Aone#review'
    )
    vi.mocked(fetch).mockResolvedValue(response([]))
    const { result } = renderHook(() => useAuth())
    await act(async () => {
      expect(await result.current.login('test-password')).toBe(true)
    })
    expect(router.push).toHaveBeenCalledWith(
      '/studio?notebook=notebook%3Aone#review'
    )
    expect(sessionStorage.getItem('redirectAfterLogin')).toBeNull()
    expect(result.current.isAuthenticated).toBe(true)
  })
  it('retains the destination after invalid credentials for an explicit retry', async () => {
    useAuthStore.setState({ authRequired: true })
    sessionStorage.setItem(
      'redirectAfterLogin',
      '/studio?notebook=notebook%3Aone'
    )
    vi.mocked(fetch).mockResolvedValue(response({}, 401))
    const { result } = renderHook(() => useAuth())
    await act(async () => {
      expect(await result.current.login('test-password')).toBe(false)
    })
    expect(router.push).not.toHaveBeenCalled()
    expect(sessionStorage.getItem('redirectAfterLogin')).toBe(
      '/studio?notebook=notebook%3Aone'
    )
    expect(result.current.error).toContain('Invalid password')
  })
})
