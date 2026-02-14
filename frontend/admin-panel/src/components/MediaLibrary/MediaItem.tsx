import { Media } from '../../types/media';

interface MediaItemProps {
  media: Media;
  onSelect?: (media: Media) => void;
  onEdit?: (media: Media) => void;
  onDelete?: (media: Media) => void;
  isSelected?: boolean;
}

export const MediaItem: React.FC<MediaItemProps> = ({
  media,
  onSelect,
  onEdit,
  onDelete,
  isSelected = false,
}) => {
  const isImage = media.mime_type.startsWith('image/');
  const thumbnailUrl = media.thumbnails?.medium || media.s3_url;
  const fileSize = (media.size / 1024).toFixed(2);

  return (
    <div
      className={`relative group rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
        isSelected ? 'border-blue-500 shadow-lg' : 'border-gray-200 hover:border-gray-300'
      }`}
      onClick={() => onSelect?.(media)}
    >
      {/* Media Preview */}
      <div className="aspect-square bg-gray-100 flex items-center justify-center">
        {isImage ? (
          <img
            src={thumbnailUrl}
            alt={media.metadata.alt_text || media.filename}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-gray-400">
            <svg
              className="w-16 h-16"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
              />
            </svg>
            <span className="text-xs mt-2">{media.mime_type.split('/')[1].toUpperCase()}</span>
          </div>
        )}
      </div>

      {/* Media Info */}
      <div className="p-3 bg-white">
        <p className="text-sm font-medium text-gray-900 truncate" title={media.filename}>
          {media.filename}
        </p>
        <p className="text-xs text-gray-500 mt-1">
          {fileSize} KB
          {media.dimensions && ` • ${media.dimensions.width}×${media.dimensions.height}`}
        </p>
      </div>

      {/* Action Buttons (shown on hover) */}
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
        {onEdit && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(media);
            }}
            className="p-2 bg-white rounded-full shadow-lg hover:bg-gray-100 transition-colors"
            title="Edit metadata"
          >
            <svg
              className="w-4 h-4 text-gray-700"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
          </button>
        )}
        {onDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (confirm(`Delete ${media.filename}?`)) {
                onDelete(media);
              }
            }}
            className="p-2 bg-white rounded-full shadow-lg hover:bg-red-50 transition-colors"
            title="Delete"
          >
            <svg
              className="w-4 h-4 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        )}
      </div>

      {/* Selection Indicator */}
      {isSelected && (
        <div className="absolute top-2 left-2">
          <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
            <svg
              className="w-4 h-4 text-white"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        </div>
      )}
    </div>
  );
};
