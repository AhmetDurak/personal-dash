import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SummaryStage } from '../SummaryStage'
import { ReadingStage } from '../ReadingStage'
import { makeSession, SECRET_SOURCE_TEXT } from './fixtures'

describe('SummaryStage source-hiding', () => {
  it('never renders the source content, even when passed a full session object', () => {
    // Pass a full ReadingSession (which includes sourceContent) — SummaryStage's
    // narrower prop type doesn't stop this at the type level (structural typing),
    // so this is a real runtime regression guard against a future edit that
    // accidentally reads session.sourceContent inside SummaryStage's JSX.
    const session = makeSession({ status: 'recall' })
    render(<SummaryStage session={session} onSave={vi.fn()} onContinue={vi.fn()} />)
    expect(screen.queryByText(SECRET_SOURCE_TEXT)).not.toBeInTheDocument()
  })

  it('does not render the reading-stage source panel or its "ready" button', () => {
    const session = makeSession({ status: 'recall' })
    render(<SummaryStage session={session} onSave={vi.fn()} onContinue={vi.fn()} />)
    expect(screen.queryByRole('button', { name: /ready to summarize/i })).not.toBeInTheDocument()
  })
})

describe('ReadingStage does show the source (sanity check for the contrast above)', () => {
  it('renders the source content during the reading stage', () => {
    const session = makeSession({ status: 'reading' })
    render(<ReadingStage session={session} onSave={vi.fn()} onReady={vi.fn()} />)
    expect(screen.getByText(SECRET_SOURCE_TEXT)).toBeInTheDocument()
  })

  it('does not render the summary form fields during the reading stage', () => {
    const session = makeSession({ status: 'reading' })
    render(<ReadingStage session={session} onSave={vi.fn()} onReady={vi.fn()} />)
    expect(screen.queryByText(/main idea/i)).not.toBeInTheDocument()
  })
})

describe('ReadingStage edit toggle', () => {
  it('shows read-only content by default, with no editable fields', () => {
    const session = makeSession({ status: 'reading' })
    render(<ReadingStage session={session} onSave={vi.fn()} onReady={vi.fn()} />)
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  })

  it('switches to editable fields after clicking Edit, and back after clicking Done', async () => {
    const user = userEvent.setup()
    const session = makeSession({ status: 'reading' })
    render(<ReadingStage session={session} onSave={vi.fn()} onReady={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: 'Edit' }))
    expect(screen.getAllByRole('textbox').length).toBeGreaterThan(0)
    expect(screen.getByDisplayValue(SECRET_SOURCE_TEXT)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Done editing' }))
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    expect(screen.getByText(SECRET_SOURCE_TEXT)).toBeInTheDocument()
  })
})

describe('SummaryStage live word count', () => {
  it('updates the word count as the user types', async () => {
    const user = userEvent.setup()
    const session = makeSession({ status: 'recall' })
    render(<SummaryStage session={session} onSave={vi.fn()} onContinue={vi.fn()} />)

    expect(screen.getByText(/^0 words/)).toBeInTheDocument()

    const textareas = screen.getAllByRole('textbox')
    await user.type(textareas[0], 'the main idea here')

    expect(screen.getByText(/^4 words/)).toBeInTheDocument()
  })

  it('debounce-autosaves the field via onSave', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    const session = makeSession({ status: 'recall' })
    render(<SummaryStage session={session} onSave={onSave} onContinue={vi.fn()} />)

    const textareas = screen.getAllByRole('textbox')
    await user.type(textareas[0], 'x')

    expect(onSave).toHaveBeenCalled()
  })
})
