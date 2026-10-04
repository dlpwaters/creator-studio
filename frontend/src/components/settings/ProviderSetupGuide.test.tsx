import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ProviderSetupGuide } from './ProviderSetupGuide'
import { workflowTranslations } from '@/lib/locales/workflows'

vi.mock('@/lib/hooks/use-translation', () => ({
  useTranslation: () => ({
    t: (key: string) =>
      workflowTranslations[
        key.replace('workflows.', '') as keyof typeof workflowTranslations
      ] || key
  })
}))

describe('ProviderSetupGuide', () => {
  it('shows actionable API setup and billing boundaries to a new user', () => {
    render(<ProviderSetupGuide hasCredentials={false} />)
    expect(
      screen.getByText('Connect a model, then create').closest('details')
    ).toHaveAttribute('open')
    expect(
      screen.getByText(/ChatGPT subscriptions and API billing are separate/)
    ).toBeVisible()
    expect(
      screen.getByRole('link', { name: 'Open OpenAI API keys' })
    ).toHaveAttribute('href', 'https://platform.openai.com/api-keys')
    expect(
      screen.getByRole('link', { name: 'Read API authentication guidance' })
    ).toHaveAttribute(
      'href',
      'https://developers.openai.com/api/reference/overview#authentication'
    )
    expect(
      screen.getByRole('link', { name: 'Configure OpenAI' })
    ).toHaveAttribute('href', '#provider-openai')
    expect(
      screen.getByRole('link', { name: 'Go to default models' })
    ).toHaveAttribute('href', '#default-models')
  })

  it('keeps setup help compact once a provider is configured', () => {
    render(<ProviderSetupGuide hasCredentials />)
    expect(
      screen.getByText('Connect a model, then create').closest('details')
    ).not.toHaveAttribute('open')
  })
})
