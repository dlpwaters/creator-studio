/** Keep authentication returns within this app, including notebook query state. */
export function resolveLoginRedirect(value: string | null): string {
  if (!value?.startsWith('/')) return '/notebooks'
  try {
    const base = 'https://notebook.invalid'
    const destination = new URL(value, base)
    if (destination.origin !== base || destination.pathname === '/login')
      return '/notebooks'
    return destination.pathname + destination.search + destination.hash
  } catch {
    return '/notebooks'
  }
}

export function consumeLoginRedirect(): string {
  const destination = resolveLoginRedirect(
    sessionStorage.getItem('redirectAfterLogin')
  )
  sessionStorage.removeItem('redirectAfterLogin')
  return destination
}
