import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EvaluationStage } from '../EvaluationStage'

describe('EvaluationStage running total', () => {
  it('starts at 0 / 25', () => {
    render(<EvaluationStage onSubmit={vi.fn()} />)
    expect(screen.getByText('0 / 25')).toBeInTheDocument()
  })

  it('updates live as criteria scores are picked', async () => {
    const user = userEvent.setup()
    render(<EvaluationStage onSubmit={vi.fn()} />)

    // First criterion row: click the "5" button
    const fives = screen.getAllByRole('button', { name: '5' })
    await user.click(fives[0])
    expect(screen.getByText('5 / 25')).toBeInTheDocument()

    // Second criterion row: click the "3" button
    const threes = screen.getAllByRole('button', { name: '3' })
    await user.click(threes[1])
    expect(screen.getByText('8 / 25')).toBeInTheDocument()
  })

  it('calls onSubmit with the full scorecard and selected weakness', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<EvaluationStage onSubmit={onSubmit} />)

    const fives = screen.getAllByRole('button', { name: '5' })
    for (const btn of fives) await user.click(btn)

    await user.click(screen.getByText(/too vague/i))
    await user.click(screen.getByRole('button', { name: /submit evaluation/i }))

    expect(onSubmit).toHaveBeenCalledTimes(1)
    const [scores, weakness] = onSubmit.mock.calls[0]
    expect(weakness).toBe('too_vague')
    expect(Object.values(scores).every((s: any) => s.score === 5)).toBe(true)
  })
})
