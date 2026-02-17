import { useEffect } from 'react';
import useComments from '../../hooks/useComments';
import CommentActions from './CommentActions';

function formatDistanceToNow(date: Date, options?: { addSuffix?: boolean }): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  
  if (seconds < 60) return options?.addSuffix ? 'just now' : 'now';
  if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    return options?.addSuffix ? `${minutes} minute${minutes > 1 ? 's' : ''} ago` : `${minutes} minute${minutes > 1 ? 's' : ''}`;
  }
  if (seconds < 86400) {
    const hours = Math.floor(seconds / 3600);
    return options?.addSuffix ? `${hours} hour${hours > 1 ? 's' : ''} ago` : `${hours} hour${hours > 1 ? 's' : ''}`;
  }
  const days = Math.floor(seconds / 86400);
  return options?.addSuffix ? `${days} day${days > 1 ? 's' : ''} ago` : `${days} day${days > 1 ? 's' : ''}`;
}

interface CommentTableProps {
  statusFilter: 'all' | 'pending' | 'approved' | 'rejected' | 'spam';
}

export default function CommentTable({ statusFilter }: CommentTableProps) {
  const { comments, loading, error, fetchComments, updateStatus, deleteComment } = useComments();

  useEffect(() => {
    fetchComments(statusFilter === 'all' ? undefined : statusFilter);
  }, [statusFilter, fetchComments]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
        Error loading comments: {error}
      </div>
    );
  }

  if (comments.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        No comments found
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Author
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Comment
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Content
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Date
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {comments.map((comment) => (
            <tr key={comment.id}>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-gray-900">{comment.author_name}</div>
              </td>
              <td className="px-6 py-4">
                <div className="text-sm text-gray-900 max-w-md truncate">
                  {comment.comment_text}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-500">{comment.content_id}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span
                  className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    comment.status === 'approved'
                      ? 'bg-green-100 text-green-800'
                      : comment.status === 'pending'
                      ? 'bg-yellow-100 text-yellow-800'
                      : comment.status === 'spam'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {comment.status}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {formatDistanceToNow(new Date(comment.created_at * 1000), { addSuffix: true })}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <CommentActions
                  comment={comment}
                  onUpdateStatus={updateStatus}
                  onDelete={deleteComment}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
