import { useState, useMemo } from 'react';
import { useMediaList, useMedia } from '../hooks/useMedia';
import { MediaUpload } from '../components/MediaLibrary/MediaUpload';
import { MediaItem } from '../components/MediaLibrary/MediaItem';
import { MediaModal } from '../components/MediaLibrary/MediaModal';
import { Media } from '../types/media';

export const MediaLibrary: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [selectedMedia, setSelectedMedia] = useState<Media | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showUpload, setShowUpload] = useState(false);

  const { data, isLoading, error, refetch } = useMediaList();
  const { delete: deleteMedia } = useMedia();

  // Filter and search media
  const filteredMedia = useMemo(() => {
    if (!data?.items) return [];

    let filtered = data.items;

    // Filter by type
    if (filterType !== 'all') {
      filtered = filtered.filter((media: Media) => {
        if (filterType === 'image') return media.mime_type.startsWith('image/');
        if (filterType === 'video') return media.mime_type.startsWith('video/');
        if (filterType === 'document') return media.mime_type.startsWith('application/');
        return true;
      });
    }

    // Search by filename or alt text
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (media: Media) =>
          media.filename.toLowerCase().includes(query) ||
          media.metadata.alt_text?.toLowerCase().includes(query) ||
          media.metadata.caption?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [data?.items, filterType, searchQuery]);

  const handleEdit = (media: Media) => {
    setSelectedMedia(media);
    setIsModalOpen(true);
  };

  const handleDelete = async (media: Media) => {
    try {
      await deleteMedia(media.id);
      refetch();
    } catch (error) {
      console.error('Failed to delete media:', error);
    }
  };

  const handleUploadComplete = () => {
    refetch();
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedMedia(null);
  };

  const handleModalSave = () => {
    refetch();
  };

  // Calculate statistics
  const stats = useMemo(() => {
    if (!data?.items) return { total: 0, images: 0, videos: 0, documents: 0 };

    return {
      total: data.items.length,
      images: data.items.filter((m: Media) => m.mime_type.startsWith('image/')).length,
      videos: data.items.filter((m: Media) => m.mime_type.startsWith('video/')).length,
      documents: data.items.filter((m: Media) => m.mime_type.startsWith('application/')).length,
    };
  }, [data?.items]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Media Library</h1>
          <p className="text-gray-600 mt-1">
            Manage your images, videos, and documents
          </p>
        </div>
        <button
          onClick={() => setShowUpload(!showUpload)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          {showUpload ? 'Hide Upload' : 'Upload Media'}
        </button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Total Files</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Images</div>
          <div className="text-2xl font-bold text-blue-600 mt-1">{stats.images}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Videos</div>
          <div className="text-2xl font-bold text-purple-600 mt-1">{stats.videos}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Documents</div>
          <div className="text-2xl font-bold text-green-600 mt-1">{stats.documents}</div>
        </div>
      </div>

      {/* Upload Section */}
      {showUpload && (
        <div className="bg-white rounded-lg shadow p-6">
          <MediaUpload onUploadComplete={handleUploadComplete} />
        </div>
      )}

      {/* Search and Filter */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <input
                type="text"
                placeholder="Search by filename, alt text, or caption..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <svg
                className="absolute left-3 top-2.5 w-5 h-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
          </div>

          {/* Filter */}
          <div className="flex gap-2">
            <button
              onClick={() => setFilterType('all')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                filterType === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterType('image')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                filterType === 'image'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Images
            </button>
            <button
              onClick={() => setFilterType('video')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                filterType === 'video'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Videos
            </button>
            <button
              onClick={() => setFilterType('document')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                filterType === 'document'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Documents
            </button>
          </div>
        </div>
      </div>

      {/* Media Grid */}
      <div className="bg-white rounded-lg shadow p-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-600 mt-4">Loading media...</p>
            </div>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <svg
              className="w-12 h-12 text-red-500 mx-auto mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-gray-900 font-medium">Failed to load media</p>
            <p className="text-gray-600 mt-1">Please try again later</p>
          </div>
        ) : filteredMedia.length === 0 ? (
          <div className="text-center py-12">
            <svg
              className="w-12 h-12 text-gray-400 mx-auto mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <p className="text-gray-900 font-medium">No media found</p>
            <p className="text-gray-600 mt-1">
              {searchQuery || filterType !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Upload your first media file to get started'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filteredMedia.map((media: Media) => (
              <MediaItem
                key={media.id}
                media={media}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {selectedMedia && (
        <MediaModal
          media={selectedMedia}
          isOpen={isModalOpen}
          onClose={handleModalClose}
          onSave={handleModalSave}
        />
      )}
    </div>
  );
};
