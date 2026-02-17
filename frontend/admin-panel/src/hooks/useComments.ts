import { useState, useCallback } from 'react';
import { api } from '../services/api';

interface Comment {
  id: string;
  content_id: string;
  author_name: string;
  comment_text: string;
  status: string;
  created_at: number;
  parent_id?: string;
}

export default function useComments() {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchComments = useCallback(async (status?: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getCommentsForModeration(status);
      setComments(data.comments || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch comments');
    } finally {
      setLoading(false);
    }
  }, []);

  const updateStatus = useCallback(async (id: string, status: string) => {
    try {
      await api.updateCommentStatus(id, status);
      setComments((prev) =>
        prev.map((comment) =>
          comment.id === id ? { ...comment, status } : comment
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update comment');
      throw err;
    }
  }, []);

  const deleteComment = useCallback(async (id: string) => {
    try {
      await api.deleteComment(id);
      setComments((prev) => prev.filter((comment) => comment.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete comment');
      throw err;
    }
  }, []);

  return {
    comments,
    loading,
    error,
    fetchComments,
    updateStatus,
    deleteComment,
  };
}
