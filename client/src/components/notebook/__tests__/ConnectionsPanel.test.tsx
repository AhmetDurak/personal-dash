import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ConnectionsPanel } from '../ConnectionsPanel'
import { useLinks } from '../../../hooks/useLinks'
import { useNotes } from '../../../hooks/useNotebook'

vi.mock('../../../hooks/useLinks', () => ({ useLinks: vi.fn() }))
vi.mock('../../../hooks/useNotebook', async () => {
  const actual = await vi.importActual<typeof import('../../../hooks/useNotebook')>('../../../hooks/useNotebook')
  return { ...actual, useNotes: vi.fn() }
})

const mockUseLinks = vi.mocked(useLinks)
const mockUseNotes = vi.mocked(useNotes)

const NOTES = [
  { id: 1, title: 'Current Note', content: '', folder: null, created_at: '', updated_at: '' },
  { id: 2, title: 'Other Note A', content: '', folder: null, created_at: '', updated_at: '' },
  { id: 3, title: 'Other Note B', content: '', folder: null, created_at: '', updated_at: '' },
]

function baseNotesMock() {
  mockUseNotes.mockReturnValue({
    notes: NOTES, isLoading: false,
    createNote: vi.fn(), saveNote: vi.fn(), moveNoteToFolder: vi.fn(),
    deleteNote: vi.fn(), renameFolder: vi.fn(), deleteFolder: vi.fn(),
  } as unknown as ReturnType<typeof useNotes>)
}

async function expandPanel() {
  const user = userEvent.setup()
  await user.click(screen.getByRole('button', { name: /connections/i }))
  return user
}

describe('ConnectionsPanel', () => {
  it('resolves the linked note title when the current note is on side A', async () => {
    baseNotesMock()
    mockUseLinks.mockReturnValue({
      links: [{ id: 10, aType: 'note', aId: '1', bType: 'note', bId: '2', note: null, createdBy: 'user', createdAt: '' }],
      isLoading: false, createLink: vi.fn(), deleteLink: vi.fn(),
    })
    render(<ConnectionsPanel noteId={1} onSelect={vi.fn()} />)
    await expandPanel()
    expect(screen.getByText('Other Note A')).toBeInTheDocument()
  })

  it('resolves the linked note title when the current note is on side B', async () => {
    baseNotesMock()
    mockUseLinks.mockReturnValue({
      links: [{ id: 11, aType: 'note', aId: '2', bType: 'note', bId: '1', note: null, createdBy: 'user', createdAt: '' }],
      isLoading: false, createLink: vi.fn(), deleteLink: vi.fn(),
    })
    render(<ConnectionsPanel noteId={1} onSelect={vi.fn()} />)
    await expandPanel()
    expect(screen.getByText('Other Note A')).toBeInTheDocument()
  })

  it('shows the AI badge only for AI-created links', async () => {
    baseNotesMock()
    mockUseLinks.mockReturnValue({
      links: [
        { id: 10, aType: 'note', aId: '1', bType: 'note', bId: '2', note: null, createdBy: 'ai', createdAt: '' },
        { id: 11, aType: 'note', aId: '1', bType: 'note', bId: '3', note: null, createdBy: 'user', createdAt: '' },
      ],
      isLoading: false, createLink: vi.fn(), deleteLink: vi.fn(),
    })
    render(<ConnectionsPanel noteId={1} onSelect={vi.fn()} />)
    await expandPanel()
    expect(screen.getAllByText('AI')).toHaveLength(1)
  })

  it('shows the empty state when there are no links', async () => {
    baseNotesMock()
    mockUseLinks.mockReturnValue({ links: [], isLoading: false, createLink: vi.fn(), deleteLink: vi.fn() })
    render(<ConnectionsPanel noteId={1} onSelect={vi.fn()} />)
    await expandPanel()
    expect(screen.getByText('No connections yet.')).toBeInTheDocument()
  })

  it('calls createLink with the selected note, and deleteLink with the right link id', async () => {
    baseNotesMock()
    const createLink = vi.fn()
    const deleteLink = vi.fn()
    mockUseLinks.mockReturnValue({
      links: [{ id: 10, aType: 'note', aId: '1', bType: 'note', bId: '2', note: null, createdBy: 'user', createdAt: '' }],
      isLoading: false, createLink, deleteLink,
    })
    render(<ConnectionsPanel noteId={1} onSelect={vi.fn()} />)
    const user = await expandPanel()

    // Delete the existing link
    await user.click(screen.getByRole('button', { name: /remove connection/i }))
    expect(deleteLink).toHaveBeenCalledWith(10)

    // Add a new link via search
    await user.click(screen.getByRole('button', { name: /link a note/i }))
    await user.type(screen.getByPlaceholderText(/search notes to link/i), 'Other Note B')
    await user.click(screen.getByText('Other Note B'))
    expect(createLink).toHaveBeenCalledWith('note', 3)
  })
})
