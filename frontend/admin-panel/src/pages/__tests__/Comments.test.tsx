import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import Comments from '../Comments';
import { api } from '../../services/api';
import { renderWithProviders } from '../../test/utils/renderWithProviders';

vi.mock('../../services/api', () => ({
  api: {
    getCommentsForModeration: vi.fn(),
    updateCommentStatus: vi.fn(),
    deleteComment: vi.fn(),
  },
}));

const mockComments = [
  {
    id: 'comment-1',
    content_id: 'content-001',
    author_name: 'Alice Reviewer',
    comment_text: 'This is a great article!',
    status: 'pending',
    created_at: Math.floor(Date.now() / 1000) - 3600,
  },
  {
    id: 'comment-2',
    content_id: 'content-002',
    author_name: 'Bob Commenter',
    comment_text: 'I disagree with the premise.',
    status: 'pending',
    created_at: Math.floor(Date.now() / 1000) - 7200,
  },
];

describe('Comments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.getCommentsForModeration).mockResolvedValue({ comments: mockComments });
    vi.mocked(api.updateCommentStatus).mockResolvedValue(undefined);
    vi.mocked(api.deleteComment).mockResolvedValue(undefined);
  });

  it('renders comments with author names and comment text after data loads', async () => {
    renderWithProviders(<Comments />, { authState: { isAuthenticated: true } });

    await waitFor(() => {
      expect(screen.getByText('Alice Reviewer')).toBeInTheDocument();
    });

    expect(screen.getByText('This is a great article!')).toBeInTheDocument();
    expect(screen.getByText('Bob Commenter')).toBeInTheDocument();
    expect(screen.getByText('I disagree with the premise.')).toBeInTheDocument();
  });

  it('shows moderation action buttons (approve, reject, spam, delete)', async () => {
    renderWithProviders(<Comments />, { authState: { isAuthenticated: true } });

    await waitFor(() => {
      expect(screen.getByText('Alice Reviewer')).toBeInTheDocument();
    });

    // Pending comments show approve, reject, spam, and delete buttons
    const approveButtons = screen.getAllByTitle('Approve');
    const rejectButtons = screen.getAllByTitle('Reject');
    const spamButtons = screen.getAllByTitle('Mark as Spam');
    const deleteButtons = screen.getAllByTitle('Delete');

    expect(approveButtons).toHaveLength(2);
    expect(rejectButtons).toHaveLength(2);
    expect(spamButtons).toHaveLength(2);
    expect(deleteButtons).toHaveLength(2);
  });
});
