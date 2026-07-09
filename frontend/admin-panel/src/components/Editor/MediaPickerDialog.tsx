import { useState, useEffect, useRef, useCallback } from 'react';
import { useInfiniteMediaQuery } from '../../hooks/useInfiniteMediaQuery';
import { useGalleriesQuery } from '../../hooks/useGalleriesQuery';
import { ScrollSentinel } from './ScrollSentinel';
import type { Media } from '../../types/media';
import type { Content } from '../../types/content';

interface MediaPickerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectMedia?: (media: Media) => void;
  onInsertGallery?: (directive: string) => void;
  defaultTab?: 'media' | 'galleries';
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

export const MediaPickerDialog: React.FC<MediaPickerDialogProps> = ({
  isOpen,
  onClose,
  onSelectMedia,
  onInsertGallery,
  defaultTab = 'media',
}) => {
  const [activeTab, setActiveTab] = useState<'media' | 'galleries'>(defaultTab);
  const [gallerySearch, setGallerySearch] = useState('');
  const [selectedGallery, setSelectedGallery] = useState<Content | null>(null);
  const [config, setConfig] = useState<EmbedConfig>(defaultConfig);

  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Hooks
  const {
    items: mediaItems,
    isLoading: mediaLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    search: mediaSearch,
    setSearch: setMediaSearch,
    error: mediaError,
    refetch: mediaRefetch,
  } = useInfiniteMediaQuery({ enabled: isOpen });

  const {
    galleries,
    isLoading: galleriesLoading,
  } = useGalleriesQuery({ enabled: isOpen });

  // Filter galleries client-side
  const filteredGalleries = galleries.filter((g) =>
    g.title.toLowerCase().includes(gallerySearch.toLowerCase())
  );

  // Focus trap and escape key
  useEffect(() => {
    if (!isOpen) return;

    previousFocusRef.current = document.activeElement as HTMLElement;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }

      if (e.key === 'Tab' && dialogRef.current) {
        const focusableElements = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    // Focus first focusable element
    requestAnimationFrame(() => {
      const firstFocusable = dialogRef.current?.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      firstFocusable?.focus();
    });

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previousFocusRef.current?.focus();
    };
  }, [isOpen, onClose]);

  // Reset gallery state when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setGallerySearch('');
      setSelectedGallery(null);
      setConfig(defaultConfig);
    }
  }, [isOpen]);

  // Tab keyboard navigation
  const handleTabKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      setActiveTab((prev) => (prev === 'media' ? 'galleries' : 'media'));
    }
  }, []);

  // Gallery confirm
  const handleGalleryConfirm = useCallback(() => {
    if (!selectedGallery) return;
    const directive = `::gallery[${selectedGallery.slug}]{layout=${config.layout} limit=${config.limit} showDescription=${config.showDescription} showTitle=${config.showTitle}}`;
    onInsertGallery?.(directive);
    onClose();
  }, [selectedGallery, config, onInsertGallery, onClose]);

  // Media item click
  const handleMediaSelect = useCallback((media: Media) => {
    onSelectMedia?.(media);
    onClose();
  }, [onSelectMedia, onClose]);

  const getImageCount = (gallery: Content): number => {
    return (gallery.metadata as Record<string, unknown>)?.media
      ? ((gallery.metadata as Record<string, unknown>).media as unknown[]).length
      : 0;
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="media-picker-title"
    >
      <div
        ref={dialogRef}
        className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 id="media-picker-title" className="text-xl font-semibold text-gray-900">
            Media Picker
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tab Bar */}
        <div
          className="flex border-b border-gray-200"
          role="tablist"
          aria-label="Media picker tabs"
          onKeyDown={handleTabKeyDown}
        >
          <button
            role="tab"
            id="tab-media"
            aria-selected={activeTab === 'media'}
            aria-controls="tabpanel-media"
            tabIndex={activeTab === 'media' ? 0 : -1}
            onClick={() => setActiveTab('media')}
            className={`px-6 py-3 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset ${
              activeTab === 'media'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Media Library
          </button>
          <button
            role="tab"
            id="tab-galleries"
            aria-selected={activeTab === 'galleries'}
            aria-controls="tabpanel-galleries"
            tabIndex={activeTab === 'galleries' ? 0 : -1}
            onClick={() => setActiveTab('galleries')}
            className={`px-6 py-3 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset ${
              activeTab === 'galleries'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Galleries
          </button>
        </div>

        {/* Media Library Tab Panel */}
        <div
          role="tabpanel"
          id="tabpanel-media"
          aria-labelledby="tab-media"
          style={{ display: activeTab === 'media' ? undefined : 'none' }}
          className="flex-1 flex flex-col overflow-hidden"
        >
          {/* Search */}
          <div className="p-4 border-b border-gray-200">
            <input
              type="text"
              placeholder="Search media..."
              value={mediaSearch}
              onChange={(e) => setMediaSearch(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Search media library"
            />
          </div>

          {/* Media Grid */}
          <div className="flex-1 overflow-y-auto p-4">
            {mediaError ? (
              <div className="flex flex-col items-center justify-center h-full gap-4">
                <p className="text-red-600">Failed to load media. Please try again.</p>
                <button
                  onClick={() => mediaRefetch()}
                  className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Retry
                </button>
              </div>
            ) : mediaLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="aspect-square rounded-lg bg-gray-200 animate-pulse" />
                ))}
              </div>
            ) : mediaItems.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-gray-500">No media found</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {mediaItems.map((media) => (
                    <MediaGridItem
                      key={media.id}
                      media={media}
                      onSelect={() => handleMediaSelect(media)}
                    />
                  ))}
                </div>
                <ScrollSentinel
                  onIntersect={fetchNextPage}
                  disabled={!hasNextPage || isFetchingNextPage}
                />
                {isFetchingNextPage && (
                  <div className="flex justify-center py-4">
                    <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </>
            )}
          </div>

          {/* ARIA live region */}
          <div aria-live="polite" className="sr-only">
            {mediaItems.length > 0 && `${mediaItems.length} media items loaded`}
          </div>
        </div>

        {/* Galleries Tab Panel */}
        <div
          role="tabpanel"
          id="tabpanel-galleries"
          aria-labelledby="tab-galleries"
          style={{ display: activeTab === 'galleries' ? undefined : 'none' }}
          className="flex-1 flex flex-col overflow-hidden"
        >
          {/* Gallery Search */}
          <div className="p-4 border-b border-gray-200">
            <input
              type="text"
              placeholder="Search galleries..."
              value={gallerySearch}
              onChange={(e) => setGallerySearch(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Search galleries"
            />
          </div>

          {/* Gallery Grid */}
          <div className="flex-1 overflow-y-auto p-4">
            {galleriesLoading ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-gray-500">Loading galleries...</p>
              </div>
            ) : filteredGalleries.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-gray-500">
                  {gallerySearch ? 'No galleries found matching your search' : 'No published galleries available'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {filteredGalleries.map((gallery) => (
                  <button
                    key={gallery.id}
                    onClick={() => setSelectedGallery(gallery)}
                    className={`group relative rounded-lg overflow-hidden border-2 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      selectedGallery?.id === gallery.id
                        ? 'border-blue-500'
                        : 'border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    <div className="aspect-square">
                      {gallery.featured_image ? (
                        <img
                          src={gallery.featured_image}
                          alt={gallery.title}
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
                      <p className="text-sm font-medium text-gray-900 truncate">{gallery.title}</p>
                      <p className="text-xs text-gray-500">{getImageCount(gallery)} images</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Gallery Config Panel */}
          {selectedGallery && (
            <div className="p-4 border-t border-gray-200 bg-gray-50">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">
                Configure embed for: {selectedGallery.title}
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
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
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="mpd-showDescription"
                    checked={config.showDescription}
                    onChange={(e) => setConfig({ ...config, showDescription: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="mpd-showDescription" className="text-xs font-medium text-gray-600">
                    Show Description
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="mpd-showTitle"
                    checked={config.showTitle}
                    onChange={(e) => setConfig({ ...config, showTitle: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="mpd-showTitle" className="text-xs font-medium text-gray-600">
                    Show Title
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          {activeTab === 'galleries' && (
            <button
              onClick={handleGalleryConfirm}
              disabled={!selectedGallery}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                selectedGallery
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              Insert Gallery
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// Media Grid Item sub-component
interface MediaGridItemProps {
  media: Media;
  onSelect: () => void;
}

const MediaGridItem: React.FC<MediaGridItemProps> = ({ media, onSelect }) => {
  const thumbnailUrl = media.thumbnails?.small || media.s3_url;
  const isImage = media.mime_type.startsWith('image/');

  return (
    <button
      onClick={onSelect}
      className="group relative aspect-square rounded-lg overflow-hidden border-2 border-gray-200 hover:border-blue-500 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
      aria-label={`Select ${media.filename}`}
    >
      {isImage ? (
        <img
          src={thumbnailUrl}
          alt={media.metadata?.alt_text || media.filename}
          loading="lazy"
          width={media.dimensions?.width}
          height={media.dimensions?.height}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gray-100">
          <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        </div>
      )}

      {/* Hover overlay with filename */}
      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-opacity flex items-end">
        <div className="w-full p-2 text-white text-xs truncate opacity-0 group-hover:opacity-100 transition-opacity">
          {media.filename}
        </div>
      </div>
    </button>
  );
};
