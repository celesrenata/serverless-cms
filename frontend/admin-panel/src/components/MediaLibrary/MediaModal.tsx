import { useState, useEffect } from 'react';
import { Media, MediaUpdate } from '../../types/media';
import { useMedia } from '../../hooks/useMedia';

interface MediaModalProps {
  media: Media;
  isOpen: boolean;
  onClose: () => void;
  onSave?: () => void;
}

export const MediaModal: React.FC<MediaModalProps> = ({
  media,
  isOpen,
  onClose,
  onSave,
}) => {
  const [altText, setAltText] = useState(media.metadata.alt_text || '');
  const [caption, setCaption] = useState(media.metadata.caption || '');
  const { update, isUpdating } = useMedia();

  useEffect(() => {
    setAltText(media.metadata.alt_text || '');
    setCaption(media.metadata.caption || '');
  }, [media]);

  const handleSave = async () => {
    try {
      const updateData: MediaUpdate = {
        metadata: {
          ...media.metadata,
          alt_text: altText,
          caption: caption,
        },
      };

      await update({ id: media.id, data: updateData });
      onSave?.();
      onClose();
    } catch (error) {
      console.error('Failed to update media:', error);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  const isImage = media.mime_type.startsWith('image/');
  const previewUrl = media.thumbnails?.large || media.s3_url;
  const fileSize = (media.size / 1024).toFixed(2);
  const uploadDate = new Date(media.uploaded_at * 1000).toLocaleDateString();

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Edit Media</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Preview */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">Preview</h3>
              <div className="bg-gray-100 rounded-lg overflow-hidden">
                {isImage ? (
                  <img
                    src={previewUrl}
                    alt={media.metadata.alt_text || media.filename}
                    className="w-full h-auto"
                  />
                ) : (
                  <div className="aspect-video flex flex-col items-center justify-center text-gray-400">
                    <svg className="w-24 h-24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                      />
                    </svg>
                    <span className="text-sm mt-2">{media.mime_type}</span>
                  </div>
                )}
              </div>

              {/* File Info */}
              <div className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Filename:</span>
                  <span className="text-gray-900 font-medium">{media.filename}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">File size:</span>
                  <span className="text-gray-900">{fileSize} KB</span>
                </div>
                {media.dimensions && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Dimensions:</span>
                    <span className="text-gray-900">
                      {media.dimensions.width} × {media.dimensions.height}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600">Uploaded:</span>
                  <span className="text-gray-900">{uploadDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">URL:</span>
                  <a
                    href={media.s3_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-700 truncate max-w-xs"
                  >
                    View file
                  </a>
                </div>
              </div>
            </div>

            {/* Metadata Form */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">Metadata</h3>
              <div className="space-y-4">
                <div>
                  <label htmlFor="alt-text" className="block text-sm font-medium text-gray-700 mb-1">
                    Alt Text
                  </label>
                  <input
                    id="alt-text"
                    type="text"
                    value={altText}
                    onChange={(e) => setAltText(e.target.value)}
                    placeholder="Describe the image for accessibility"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Used for screen readers and when the image cannot be displayed
                  </p>
                </div>

                <div>
                  <label htmlFor="caption" className="block text-sm font-medium text-gray-700 mb-1">
                    Caption
                  </label>
                  <textarea
                    id="caption"
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="Add a caption for this media"
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Optional caption displayed with the media
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isUpdating}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors"
          >
            {isUpdating ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};
