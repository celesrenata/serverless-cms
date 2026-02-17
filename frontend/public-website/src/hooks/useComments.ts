import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';

export interface Comment {
  id: string;
  content_id: string;
  author_name: string;
  comment_text: string;
  parent_id?: string;
  status: 'pending' | 'approved' | 'rejected' | 'spam';
  created_at: number;
  updated_at: number;
}

export interface CreateCommentData {
  author_name: string;
  author_email: string;
  comment_text: string;
  parent_id?: string;
}

export const useComments = (contentId: string) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchComments = useCallback(async () => {
    if (!contentId) return;
    
    try {
      setLoading(true);
      setError(null);
      const data = await api.getComments(contentId);
      setComments(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load comments');
    } finally {
      setLoading(false);
    }
  }, [contentId]);

  const createComment = async (commentData: CreateCommentData) => {
    const newComment = await api.createComment(contentId, commentData);
    await fetchComments();
    return newComment;
  };

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  return {
    comments,
    loading,
    error,
    createComment,
    refetch: fetchComments,
  };
};
