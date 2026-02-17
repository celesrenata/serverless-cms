import { useState } from 'react';
import CommentTable from '../components/Comments/CommentTable';

type CommentStatus = 'all' | 'pending' | 'approved' | 'rejected' | 'spam';

export default function Comments() {
  const [statusFilter, setStatusFilter] = useState<CommentStatus>('all');

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Comment Moderation</h1>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="mb-6 flex gap-2">
          {(['all', 'pending', 'approved', 'rejected', 'spam'] as CommentStatus[]).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                statusFilter === status
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>

        <CommentTable statusFilter={statusFilter} />
      </div>
    </div>
  );
}
