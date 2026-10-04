import { describe, expect, it } from 'vitest'
import { consumeLoginRedirect, resolveLoginRedirect } from './login-redirect'

describe('authentication return navigation', () => {
  it('preserves notebook selection when returning to Studio', () => {
    const destination = '/studio?notebook=notebook%3Aexample#review'
    sessionStorage.setItem('redirectAfterLogin', destination)
    expect(consumeLoginRedirect()).toBe(destination)
    expect(sessionStorage.getItem('redirectAfterLogin')).toBeNull()
  })

  it.each([
    null,
    '',
    'https://outside.example',
    '//outside.example',
    '/\\outside.example',
    '/login?again=1'
  ])('rejects unsafe or looping return destinations: %s', (value) => {
    expect(resolveLoginRedirect(value)).toBe('/notebooks')
  })
})
