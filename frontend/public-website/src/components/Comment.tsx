import React from 'react';
import type { Comment as CommentType } from '../hooks/useComments';

interface CommentProps {
  comment: CommentType;
  onReply?: (commentId: string) => void;
  depth?: number;
}

export const Comment: React.FC<CommentProps> = ({ comment, onReply, depth = 0 }) => {
  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div 
      className="comment" 
      style={{ marginLeft: depth > 0 ? '2rem' : '0' }}
    >
      <div className="comment-header">
        <strong className="comment-author">{comment.author_name}</strong>
        <span className="comment-date">{formatDate(comment.created_at)}</span>
      </div>
      <div className="comment-text">
        {comment.comment_text}
      </div>
      {onReply && depth < 3 && (
        <button 
          className="comment-reply-btn"
          onClick={() => onReply(comment.id)}
        >
          Reply
        </button>
      )}
    </div>
  );
};
