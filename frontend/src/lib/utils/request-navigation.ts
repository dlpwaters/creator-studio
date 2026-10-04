export const NAVIGATION_REQUEST_EVENT = 'open-notebook:navigation-request'
export interface NavigationRequest {
  navigate: () => void
}

/** Dirty editors may cancel the request and offer to resume it after confirmation. */
export function requestNavigation(navigate: () => void): boolean {
  if (typeof window === 'undefined') {
    navigate()
    return true
  }
  const event = new CustomEvent<NavigationRequest>(NAVIGATION_REQUEST_EVENT, {
    cancelable: true,
    detail: { navigate }
  })
  const allowed = window.dispatchEvent(event)
  if (allowed) navigate()
  return allowed
}
