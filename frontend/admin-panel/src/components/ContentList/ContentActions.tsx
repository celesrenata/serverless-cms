interface ContentActionsProps {
  selectedCount: number;
  onBulkDelete: () => void;
  onBulkPublish: () => void;
  onBulkArchive: () => void;
  onBulkDraft: () => void;
}

export function ContentActions({
  selectedCount,
  onBulkDelete,
  onBulkPublish,
  onBulkArchive,
  onBulkDraft,
}: ContentActionsProps) {
  if (selectedCount === 0) {
    return null;
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium text-blue-900">
          {selectedCount} item{selectedCount !== 1 ? 's' : ''} selected
        </div>
        <div className="flex gap-2">
          <button
            onClick={onBulkPublish}
            className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            Publish
          </button>
          <button
            onClick={onBulkDraft}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-yellow-100 rounded-md hover:bg-yellow-200 focus:outline-none focus:ring-2 focus:ring-yellow-500"
          >
            Set to Draft
          </button>
          <button
            onClick={onBulkArchive}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            Archive
          </button>
          <button
            onClick={onBulkDelete}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
