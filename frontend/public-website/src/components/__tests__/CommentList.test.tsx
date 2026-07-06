import { render, screen } from '@testing-library/react';
import { CommentList } from '../CommentList';

const createComment = (overrides = {}) => ({
  id: '1',
  content_id: 'post-1',
  author_name: 'Alice',
  comment_text: 'Hello world',
  status: 'approved' as const,
  created_at: 1700000000,
  updated_at: 1700000000,
  ...overrides,
});

describe('CommentList', () => {
  it("renders each comment's author name and text", () => {
    render(
      <CommentList
        comments={[
          createComment({ id: '1', author_name: 'Alice', comment_text: 'First comment' }),
          createComment({ id: '2', author_name: 'Bob', comment_text: 'Second comment' }),
        ]}
      />
    );

    expect(screen.getByText('Alice')).toBeTruthy();
    expect(screen.getByText('First comment')).toBeTruthy();
    expect(screen.getByText('Bob')).toBeTruthy();
    expect(screen.getByText('Second comment')).toBeTruthy();
  });

  it('shows empty state when no comments', () => {
    render(<CommentList comments={[]} />);

    expect(screen.getByText('No comments yet. Be the first to comment!')).toBeTruthy();
  });

  it('renders nested replies with margin-left style', () => {
    render(
      <CommentList
        comments={[
          createComment({ id: '1', author_name: 'Alice', comment_text: 'Parent comment' }),
          createComment({
            id: '2',
            parent_id: '1',
            author_name: 'Bob',
            comment_text: 'Child reply',
          }),
        ]}
      />
    );

    const childComment = screen.getByText('Child reply').closest('.comment') as HTMLElement;

    expect(childComment.style.marginLeft).toBe('2rem');
  });

  it('shows reply button when onReply is provided and depth < 3', () => {
    const onReply = vi.fn();

    render(
      <CommentList
        onReply={onReply}
        comments={[
          createComment({ id: '1', comment_text: 'Depth 0' }),
          createComment({ id: '2', parent_id: '1', comment_text: 'Depth 1' }),
          createComment({ id: '3', parent_id: '2', comment_text: 'Depth 2' }),
          createComment({ id: '4', parent_id: '3', comment_text: 'Depth 3' }),
        ]}
      />
    );

    // Depth 0, 1, 2 get reply buttons (3 total); depth 3 does not
    expect(screen.getAllByRole('button', { name: 'Reply' })).toHaveLength(3);
  });
});
