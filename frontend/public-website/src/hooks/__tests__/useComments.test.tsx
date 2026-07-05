import { renderHook, waitFor, act } from '@testing-library/react';
import { api } from '../../services/api';
import { useComments, type Comment, type CreateCommentData } from '../useComments';

vi.mock('../../services/api', () => ({
  api: {
    getComments: vi.fn(),
    createComment: vi.fn(),
  },
}));

const mockedApi = vi.mocked(api);

const mockComments: Comment[] = [
  {
    id: 'comment-1',
    content_id: 'content-1',
    author_name: 'Jane Doe',
    comment_text: 'This is a great article.',
    status: 'approved',
    created_at: 1710000000,
    updated_at: 1710000000,
  },
  {
    id: 'comment-2',
    content_id: 'content-1',
    author_name: 'John Smith',
    comment_text: 'Thanks for sharing.',
    parent_id: 'comment-1',
    status: 'approved',
    created_at: 1710000100,
    updated_at: 1710000100,
  },
];

describe('useComments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches comments on mount for the given contentId', async () => {
    mockedApi.getComments.mockResolvedValue(mockComments);

    const { result } = renderHook(() => useComments('content-1'));

    await waitFor(() => {
      expect(mockedApi.getComments).toHaveBeenCalledWith('content-1');
    });

    await waitFor(() => {
      expect(result.current.comments).toEqual(mockComments);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  it('sets loading=true during fetch, false after', async () => {
    let resolveComments!: (comments: Comment[]) => void;
    const commentsPromise = new Promise<Comment[]>((resolve) => {
      resolveComments = resolve;
    });

    mockedApi.getComments.mockReturnValue(commentsPromise);

    const { result } = renderHook(() => useComments('content-1'));

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(mockedApi.getComments).toHaveBeenCalledWith('content-1');
    });

    expect(result.current.loading).toBe(true);

    await act(async () => {
      resolveComments(mockComments);
      await commentsPromise;
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.comments).toEqual(mockComments);
  });

  it('sets error on failed fetch', async () => {
    mockedApi.getComments.mockRejectedValue(new Error('Unable to load comments'));

    const { result } = renderHook(() => useComments('content-1'));

    await waitFor(() => {
      expect(result.current.error).toBe('Unable to load comments');
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.comments).toEqual([]);
  });

  it('createComment calls api.createComment and refetches list', async () => {
    const initialComments: Comment[] = [mockComments[0]];
    const refetchedComments: Comment[] = mockComments;
    const commentData: CreateCommentData = {
      author_name: 'New Author',
      author_email: 'author@example.com',
      comment_text: 'New comment text',
    };
    const createdComment: Comment = {
      id: 'comment-3',
      content_id: 'content-1',
      author_name: commentData.author_name,
      comment_text: commentData.comment_text,
      status: 'pending',
      created_at: 1710000200,
      updated_at: 1710000200,
    };

    mockedApi.getComments
      .mockResolvedValueOnce(initialComments)
      .mockResolvedValueOnce(refetchedComments);
    mockedApi.createComment.mockResolvedValue(createdComment);

    const { result } = renderHook(() => useComments('content-1'));

    await waitFor(() => {
      expect(result.current.comments).toEqual(initialComments);
    });

    let returnedComment: Comment | undefined;

    await act(async () => {
      returnedComment = await result.current.createComment(commentData);
    });

    expect(mockedApi.createComment).toHaveBeenCalledWith('content-1', commentData);
    expect(mockedApi.getComments).toHaveBeenCalledTimes(2);
    expect(mockedApi.getComments).toHaveBeenLastCalledWith('content-1');
    expect(returnedComment).toEqual(createdComment);

    await waitFor(() => {
      expect(result.current.comments).toEqual(refetchedComments);
    });
  });

  it('does not fetch when contentId is empty string', async () => {
    const { result } = renderHook(() => useComments(''));

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockedApi.getComments).not.toHaveBeenCalled();
    expect(result.current.loading).toBe(true);
    expect(result.current.comments).toEqual([]);
    expect(result.current.error).toBeNull();
  });
});
