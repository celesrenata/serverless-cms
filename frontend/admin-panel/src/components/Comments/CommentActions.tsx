import { useState } from 'react';

interface Comment {
  id: string;
  status: string;
  author_name: string;
  comment_text: string;
}

interface CommentActionsProps {
  comment: Comment;
  onUpdateStatus: (id: string, status: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export default function CommentActions({ comment, onUpdateStatus, onDelete }: CommentActionsProps) {
  const [loading, setLoading] = useState(false);

  const handleStatusChange = async (status: string) => {
    if (loading) return;
    setLoading(true);
    try {
      await onUpdateStatus(comment.id, status);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (loading) return;
    if (!confirm(`Delete comment from ${comment.author_name}?`)) return;
    
    setLoading(true);
    try {
      await onDelete(comment.id);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex gap-2">
      {comment.status !== 'approved' && (
        <button
          onClick={() => handleStatusChange('approved')}
          disabled={loading}
          className="text-green-600 hover:text-green-900 disabled:opacity-50"
          title="Approve"
        >
          ✓
        </button>
      )}
      {comment.status !== 'rejected' && (
        <button
          onClick={() => handleStatusChange('rejected')}
          disabled={loading}
          className="text-gray-600 hover:text-gray-900 disabled:opacity-50"
          title="Reject"
        >
          ✗
        </button>
      )}
      {comment.status !== 'spam' && (
        <button
          onClick={() => handleStatusChange('spam')}
          disabled={loading}
          className="text-red-600 hover:text-red-900 disabled:opacity-50"
          title="Mark as Spam"
        >
          🚫
        </button>
      )}
      <button
        onClick={handleDelete}
        disabled={loading}
        className="text-red-600 hover:text-red-900 disabled:opacity-50"
        title="Delete"
      >
        🗑️
      </button>
    </div>
  );
}
