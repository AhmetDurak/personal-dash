import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { ReadingView } from '../ReadingView'
import { makeSession, SECRET_SOURCE_TEXT } from './fixtures'
import { useReadingSession } from '../../../../hooks/useReading'

vi.mock('../../../../hooks/useReading', async () => {
  const actual = await vi.importActual<typeof import('../../../../hooks/useReading')>('../../../../hooks/useReading')
  return { ...actual, useReadingSession: vi.fn() }
})

const mockUseReadingSession = vi.mocked(useReadingSession)

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/*" element={<ReadingView />} />
      </Routes>
    </MemoryRouter>
  )
}

describe('ReadingView stage-order enforcement (SessionWizard)', () => {
  it('renders the reading stage (with source) when status is "reading", not the summary form', () => {
    mockUseReadingSession.mockReturnValue({
      session: makeSession({ status: 'reading' }),
      goToRecall: vi.fn(), saveSourceDraft: vi.fn(), saveSummaryDraft: vi.fn(), advanceStage: vi.fn(),
      submitEvaluation: vi.fn(), saveImprovedDraft: vi.fn(), submitReflection: vi.fn(),
    })

    renderAt('/1')

    expect(screen.getByText(SECRET_SOURCE_TEXT)).toBeInTheDocument()
    expect(screen.queryByText(/main idea/i)).not.toBeInTheDocument()
  })

  it('renders SessionResult, not a stage form, when status is "completed"', () => {
    mockUseReadingSession.mockReturnValue({
      session: makeSession({ status: 'completed', totalScore: 21, summaryWordCount: 120 }),
      goToRecall: vi.fn(), saveSourceDraft: vi.fn(), saveSummaryDraft: vi.fn(), advanceStage: vi.fn(),
      submitEvaluation: vi.fn(), saveImprovedDraft: vi.fn(), submitReflection: vi.fn(),
    })

    renderAt('/1')

    expect(screen.getByText('21 / 25')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /ready to summarize/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /submit evaluation/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /complete session/i })).not.toBeInTheDocument()
  })

  it('renders the evaluation scorecard, not the reading source, when status is "evaluate"', () => {
    mockUseReadingSession.mockReturnValue({
      session: makeSession({ status: 'evaluate' }),
      goToRecall: vi.fn(), saveSourceDraft: vi.fn(), saveSummaryDraft: vi.fn(), advanceStage: vi.fn(),
      submitEvaluation: vi.fn(), saveImprovedDraft: vi.fn(), submitReflection: vi.fn(),
    })

    renderAt('/1')

    expect(screen.getByRole('button', { name: /submit evaluation/i })).toBeInTheDocument()
    expect(screen.queryByText(SECRET_SOURCE_TEXT)).not.toBeInTheDocument()
  })
})
