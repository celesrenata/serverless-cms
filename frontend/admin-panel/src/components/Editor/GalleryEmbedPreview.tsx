import { useQuery } from '@tanstack/react-query';
import { api } from '../../services/api';

interface GalleryEmbedPreviewProps {
  albumId: string;
  layout: string;
  limit: string;
  showDescription: string;
  showTitle: string;
}

export const GalleryEmbedPreview: React.FC<GalleryEmbedPreviewProps> = ({
  albumId,
  layout,
}) => {
  const { data: album, isLoading, isError } = useQuery({
    queryKey: ['content', 'gallery-preview', albumId],
    queryFn: () => api.getContentBySlug(albumId),
    enabled: !!albumId,
    retry: false,
  });

  const getImageCount = (): number => {
    if (!album) return 0;
    const media = (album.metadata as Record<string, unknown>)?.media;
    return Array.isArray(media) ? media.length : 0;
  };

  const formatLayout = (l: string): string => {
    if (!l) return 'Grid';
    return l.charAt(0).toUpperCase() + l.slice(1).toLowerCase();
  };

  // Loading skeleton state
  if (isLoading) {
    return (
      <div className="border-dashed border-2 border-gray-300 rounded-lg p-3 my-2">
        <div className="flex items-center gap-3 animate-pulse">
          <div className="w-8 h-8 bg-gray-200 rounded" />
          <div className="w-10 h-10 bg-gray-200 rounded" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-200 rounded w-1/3" />
            <div className="h-3 bg-gray-200 rounded w-1/4" />
          </div>
          <div className="h-6 w-16 bg-gray-200 rounded-full" />
        </div>
      </div>
    );
  }

  // Error state
  if (isError || !album) {
    return (
      <div className="border-dashed border-2 border-red-300 rounded-lg p-3 my-2 bg-red-50">
        <div className="flex items-center gap-2 text-red-600">
          <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <span className="text-sm font-medium">Album not found: <code className="text-xs bg-red-100 px-1 rounded">{albumId}</code></span>
        </div>
      </div>
    );
  }

  // Success state
  const imageCount = getImageCount();

  return (
    <div className="border-dashed border-2 border-gray-300 rounded-lg p-3 my-2 bg-gray-50">
      <div className="flex items-center gap-3">
        {/* Gallery icon */}
        <svg className="w-6 h-6 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>

        {/* Cover thumbnail */}
        {album.featured_image ? (
          <img
            src={album.featured_image}
            alt={album.title}
            className="w-10 h-10 rounded object-cover flex-shrink-0"
          />
        ) : (
          <div className="w-10 h-10 rounded bg-gray-200 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14" />
            </svg>
          </div>
        )}

        {/* Album info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{album.title}</p>
          <p className="text-xs text-gray-500">{imageCount} image{imageCount !== 1 ? 's' : ''}</p>
        </div>

        {/* Layout badge */}
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 flex-shrink-0">
          {formatLayout(layout)}
        </span>
      </div>
    </div>
  );
};
