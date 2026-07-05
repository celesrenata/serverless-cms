import { renderHook, act, waitFor } from '@testing-library/react';
import useComments from '../useComments';
import { api } from '../../services/api';

vi.mock('../../services/api', () => ({
  api: {
    getCommentsForModeration: vi.fn(),
    updateCommentStatus: vi.fn(),
    deleteComment: vi.fn(),
  },
}));

interface Comment {
  id: string;
  content_id: string;
  author_name: string;
  comment_text: string;
  status: string;
  created_at: number;
  parent_id?: string;
}

const mockComments: Comment[] = [
  {
    id: 'comment-1',
    content_id: 'content-1',
    author_name: 'Alice',
    comment_text: 'First comment',
    status: 'pending',
    created_at: 1710000000,
  },
  {
    id: 'comment-2',
    content_id: 'content-2',
    author_name: 'Bob',
    comment_text: 'Second comment',
    status: 'pending',
    created_at: 1710000001,
  },
];

describe('useComments', () => {
  const getCommentsForModerationMock = vi.mocked(api.getCommentsForModeration);
  const updateCommentStatusMock = vi.mocked(api.updateCommentStatus);
  const deleteCommentMock = vi.mocked(api.deleteComment);

  beforeEach(() => {
    vi.resetAllMocks();
  });

  const setupHookWithComments = async (comments: Comment[] = mockComments) => {
    getCommentsForModerationMock.mockResolvedValueOnce({ comments });

    const rendered = renderHook(() => useComments());

    await act(async () => {
      await rendered.result.current.fetchComments();
    });

    await waitFor(() => {
      expect(rendered.result.current.comments).toEqual(comments);
    });

    return rendered;
  };

  it('initial state has empty comments array, loading=false, error=null', () => {
    const { result } = renderHook(() => useComments());

    expect(result.current.comments).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('fetchComments() fetches comments and sets state', async () => {
    getCommentsForModerationMock.mockResolvedValueOnce({
      comments: mockComments,
    });

    const { result } = renderHook(() => useComments());

    await act(async () => {
      await result.current.fetchComments();
    });

    expect(getCommentsForModerationMock).toHaveBeenCalledTimes(1);
    expect(getCommentsForModerationMock).toHaveBeenCalledWith(undefined);

    await waitFor(() => {
      expect(result.current.comments).toEqual(mockComments);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  it("fetchComments('pending') passes status filter to API", async () => {
    getCommentsForModerationMock.mockResolvedValueOnce({
      comments: mockComments,
    });

    const { result } = renderHook(() => useComments());

    await act(async () => {
      await result.current.fetchComments('pending');
    });

    expect(getCommentsForModerationMock).toHaveBeenCalledTimes(1);
    expect(getCommentsForModerationMock).toHaveBeenCalledWith('pending');

    await waitFor(() => {
      expect(result.current.comments).toEqual(mockComments);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  it('fetchComments() sets error on API failure', async () => {
    getCommentsForModerationMock.mockRejectedValueOnce(
      new Error('Failed to load comments')
    );

    const { result } = renderHook(() => useComments());

    await act(async () => {
      await result.current.fetchComments();
    });

    expect(getCommentsForModerationMock).toHaveBeenCalledTimes(1);
    expect(getCommentsForModerationMock).toHaveBeenCalledWith(undefined);

    await waitFor(() => {
      expect(result.current.error).toBe('Failed to load comments');
      expect(result.current.loading).toBe(false);
      expect(result.current.comments).toEqual([]);
    });
  });

  it("updateStatus(id, 'approved') calls API and updates local state", async () => {
    updateCommentStatusMock.mockResolvedValueOnce(undefined);

    const { result } = await setupHookWithComments();

    await act(async () => {
      await result.current.updateStatus('comment-1', 'approved');
    });

    expect(updateCommentStatusMock).toHaveBeenCalledTimes(1);
    expect(updateCommentStatusMock).toHaveBeenCalledWith(
      'comment-1',
      'approved'
    );

    await waitFor(() => {
      expect(
        result.current.comments.find((c) => c.id === 'comment-1')?.status
      ).toBe('approved');
      expect(
        result.current.comments.find((c) => c.id === 'comment-2')?.status
      ).toBe('pending');
      expect(result.current.error).toBeNull();
    });
  });

  it("updateStatus(id, 'rejected') calls API and updates local state", async () => {
    updateCommentStatusMock.mockResolvedValueOnce(undefined);

    const { result } = await setupHookWithComments();

    await act(async () => {
      await result.current.updateStatus('comment-1', 'rejected');
    });

    expect(updateCommentStatusMock).toHaveBeenCalledTimes(1);
    expect(updateCommentStatusMock).toHaveBeenCalledWith(
      'comment-1',
      'rejected'
    );

    await waitFor(() => {
      expect(
        result.current.comments.find((c) => c.id === 'comment-1')?.status
      ).toBe('rejected');
      expect(
        result.current.comments.find((c) => c.id === 'comment-2')?.status
      ).toBe('pending');
      expect(result.current.error).toBeNull();
    });
  });

  it("updateStatus(id, 'spam') calls API and updates local state", async () => {
    updateCommentStatusMock.mockResolvedValueOnce(undefined);

    const { result } = await setupHookWithComments();

    await act(async () => {
      await result.current.updateStatus('comment-1', 'spam');
    });

    expect(updateCommentStatusMock).toHaveBeenCalledTimes(1);
    expect(updateCommentStatusMock).toHaveBeenCalledWith('comment-1', 'spam');

    await waitFor(() => {
      expect(
        result.current.comments.find((c) => c.id === 'comment-1')?.status
      ).toBe('spam');
      expect(
        result.current.comments.find((c) => c.id === 'comment-2')?.status
      ).toBe('pending');
      expect(result.current.error).toBeNull();
    });
  });

  it('deleteComment(id) calls API and removes from local state', async () => {
    deleteCommentMock.mockResolvedValueOnce(undefined);

    const { result } = await setupHookWithComments();

    await act(async () => {
      await result.current.deleteComment('comment-1');
    });

    expect(deleteCommentMock).toHaveBeenCalledTimes(1);
    expect(deleteCommentMock).toHaveBeenCalledWith('comment-1');

    await waitFor(() => {
      expect(result.current.comments).toEqual([mockComments[1]]);
      expect(
        result.current.comments.find((c) => c.id === 'comment-1')
      ).toBeUndefined();
      expect(result.current.error).toBeNull();
    });
  });
});
