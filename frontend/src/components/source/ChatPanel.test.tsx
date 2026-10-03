import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ChatPanel } from './ChatPanel'

describe('chat starters', () => {
  it('puts a suggestion into an editable draft without sending a model request', () => {
    HTMLElement.prototype.scrollIntoView = vi.fn()
    const onSendMessage = vi.fn()
    render(
      <ChatPanel
        messages={[]}
        isStreaming={false}
        contextIndicators={null}
        onSendMessage={onSendMessage}
      />,
    )
    fireEvent.click(
      screen.getByRole('button', { name: 'workspace.promptSummary' }),
    )
    const input = screen.getByRole('textbox', { name: 'chat.sendPlaceholder' })
    expect(input).toHaveValue('workspace.promptSummary')
    expect(input).toHaveFocus()
    expect(onSendMessage).not.toHaveBeenCalled()
    fireEvent.change(input, { target: { value: 'My own question' } })
    fireEvent.click(
      screen.getByRole('button', { name: 'workspace.sendMessage' }),
    )
    expect(onSendMessage).toHaveBeenCalledWith('My own question', undefined)
  })
})
