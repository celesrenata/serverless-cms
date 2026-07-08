import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../services/api';
import { Content } from '../../types/content';

interface AlbumPickerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (directive: string) => void;
}

interface EmbedConfig {
  layout: 'grid' | 'carousel' | 'masonry';
  limit: number;
  showDescription: boolean;
  showTitle: boolean;
}

const defaultConfig: EmbedConfig = {
  layout: 'grid',
  limit: 0,
  showDescription: true,
  showTitle: true,
};

export const AlbumPickerDialog: React.FC<AlbumPickerDialogProps> = ({ isOpen, onClose, onConfirm }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAlbum, setSelectedAlbum] = useState<Content | null>(null);
  const [config, setConfig] = useState<EmbedConfig>(defaultConfig);

  const { data: albumsData, isLoading } = useQuery({
    queryKey: ['content', 'gallery-albums'],
    queryFn: () => api.listContent({ type: 'gallery', status: 'published' }),
    enabled: isOpen,
  });

  // Filter albums by search query
  const filteredAlbums = albumsData?.items.filter((album) =>
    album.title.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setSelectedAlbum(null);
      setConfig(defaultConfig);
    }
  }, [isOpen]);

  const handleConfirm = () => {
    if (!selectedAlbum) return;
    const directive = `::gallery[${selectedAlbum.slug}]{layout=${config.layout} limit=${config.limit} showDescription=${config.showDescription} showTitle=${config.showTitle}}`;
    onConfirm(directive);
  };

  const getImageCount = (album: Content): number => {
    return (album.metadata as Record<string, unknown>)?.media
      ? ((album.metadata as Record<string, unknown>).media as unknown[]).length
      : 0;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Select Album</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            title="Close"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-gray-200">
          <input
            type="text"
            placeholder="Search albums..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Album Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-gray-500">Loading albums...</div>
            </div>
          ) : filteredAlbums.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-gray-500">
                {searchQuery ? 'No albums found matching your search' : 'No published albums available'}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {filteredAlbums.map((album) => (
                <button
                  key={album.id}
                  onClick={() => setSelectedAlbum(album)}
                  className={`group relative rounded-lg overflow-hidden border-2 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    selectedAlbum?.id === album.id
                      ? 'border-blue-500'
                      : 'border-gray-200 hover:border-blue-300'
                  }`}
                >
                  <div className="aspect-square">
                    {album.featured_image ? (
                      <img
                        src={album.featured_image}
                        alt={album.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-100">
                        <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="p-2 bg-white">
                    <p className="text-sm font-medium text-gray-900 truncate">{album.title}</p>
                    <p className="text-xs text-gray-500">{getImageCount(album)} images</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Configuration Panel */}
        {selectedAlbum && (
          <div className="p-4 border-t border-gray-200 bg-gray-50">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">
              Configure embed for: {selectedAlbum.title}
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {/* Layout */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Layout</label>
                <select
                  value={config.layout}
                  onChange={(e) => setConfig({ ...config, layout: e.target.value as EmbedConfig['layout'] })}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="grid">Grid</option>
                  <option value="carousel">Carousel</option>
                  <option value="masonry">Masonry</option>
                </select>
              </div>

              {/* Limit */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Limit (0 = all)</label>
                <input
                  type="number"
                  min={0}
                  value={config.limit}
                  onChange={(e) => setConfig({ ...config, limit: Math.max(0, parseInt(e.target.value) || 0) })}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Show Description */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="showDescription"
                  checked={config.showDescription}
                  onChange={(e) => setConfig({ ...config, showDescription: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="showDescription" className="text-xs font-medium text-gray-600">
                  Show Description
                </label>
              </div>

              {/* Show Title */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="showTitle"
                  checked={config.showTitle}
                  onChange={(e) => setConfig({ ...config, showTitle: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="showTitle" className="text-xs font-medium text-gray-600">
                  Show Title
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selectedAlbum}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              selectedAlbum
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            Insert Gallery
          </button>
        </div>
      </div>
    </div>
  );
};
