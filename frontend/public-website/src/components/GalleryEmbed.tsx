import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../services/api';
import { Lightbox } from './Lightbox';
import { useSwipe } from '../hooks/useSwipe';
import type { Content, Media } from '../types';
import './GalleryEmbed.css';

export interface GalleryEmbedProps {
  albumId: string;
  layout: 'grid' | 'carousel' | 'masonry';
  limit: number;
  showDescription: boolean;
  showTitle: boolean;
}

type LoadState = 'loading' | 'error' | 'not-found' | 'success';

function getImageUrl(image: Media, size: 'medium' | 'large'): string {
  if (size === 'large') {
    return image.thumbnails?.large || image.s3_url;
  }
  return image.thumbnails?.medium || image.s3_url;
}

function getAltText(image: Media): string {
  return image.metadata?.alt_text || image.filename;
}

// Skeleton components
function GridSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="aspect-square bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
      ))}
    </div>
  );
}

function CarouselSkeleton() {
  return (
    <div className="flex gap-4 overflow-hidden">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex-shrink-0 w-72 h-48 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
      ))}
    </div>
  );
}

function MasonrySkeleton() {
  return (
    <div className="columns-2 md:columns-3 lg:columns-4 gap-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="mb-4 break-inside-avoid bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"
          style={{ height: `${150 + (i % 3) * 60}px` }}
        />
      ))}
    </div>
  );
}

export const GalleryEmbed: React.FC<GalleryEmbedProps> = ({
  albumId,
  layout,
  limit,
  showDescription,
  showTitle,
}) => {
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [album, setAlbum] = useState<Content | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const carouselRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchAlbum() {
      setLoadState('loading');
      try {
        const data = await api.getContentBySlug(albumId);
        if (!cancelled) {
          setAlbum(data);
          setLoadState('success');
        }
      } catch (err: any) {
        if (!cancelled) {
          if (err?.response?.status === 404) {
            console.warn(`Gallery embed: album "${albumId}" not found (deleted or unpublished)`);
            setLoadState('not-found');
          } else {
            setLoadState('error');
          }
        }
      }
    }

    fetchAlbum();
    return () => { cancelled = true; };
  }, [albumId]);

  const allImages = album?.metadata?.media || [];
  const displayImages = limit > 0 ? allImages.slice(0, limit) : allImages;
  const hasMore = limit > 0 && allImages.length > limit;

  const openLightbox = useCallback((index: number) => {
    setLightboxIndex(index);
  }, []);

  const closeLightbox = useCallback(() => {
    setLightboxIndex(null);
  }, []);

  const nextImage = useCallback(() => {
    setLightboxIndex((prev) => {
      if (prev === null) return null;
      return prev < allImages.length - 1 ? prev + 1 : prev;
    });
  }, [allImages.length]);

  const previousImage = useCallback(() => {
    setLightboxIndex((prev) => {
      if (prev === null) return null;
      return prev > 0 ? prev - 1 : prev;
    });
  }, []);

  // Carousel navigation
  const scrollCarousel = useCallback((direction: 'left' | 'right') => {
    if (!carouselRef.current) return;
    const scrollAmount = carouselRef.current.clientWidth * 0.8;
    carouselRef.current.scrollBy({
      left: direction === 'right' ? scrollAmount : -scrollAmount,
      behavior: 'smooth',
    });
  }, []);

  const swipeHandlers = useSwipe({
    onSwipeLeft: () => scrollCarousel('right'),
    onSwipeRight: () => scrollCarousel('left'),
  });

  // Render nothing for deleted/not-found albums
  if (loadState === 'not-found') return null;

  // Error fallback
  if (loadState === 'error') {
    return (
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6 text-center text-gray-500 dark:text-gray-400">
        <p>Gallery unavailable</p>
        <a
          href={`/gallery/${albumId}`}
          className="text-blue-600 dark:text-blue-400 hover:underline text-sm mt-2 inline-block"
        >
          View album page
        </a>
      </div>
    );
  }

  // Loading skeleton
  if (loadState === 'loading') {
    return (
      <div role="region" aria-label="Loading gallery">
        {layout === 'grid' && <GridSkeleton />}
        {layout === 'carousel' && <CarouselSkeleton />}
        {layout === 'masonry' && <MasonrySkeleton />}
      </div>
    );
  }

  const title = album?.title || '';
  const description = album?.content || '';

  // Zero images state
  if (allImages.length === 0) {
    return (
      <div
        role="region"
        aria-label={`Gallery: ${title}`}
        className="border border-gray-200 dark:border-gray-700 rounded-lg p-6"
      >
        {showTitle && title && (
          <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">{title}</h3>
        )}
        {showDescription && description && (
          <p className="text-gray-600 dark:text-gray-400 mb-4">{description}</p>
        )}
        <p className="text-gray-500 dark:text-gray-400 text-center italic">
          This album has no images yet
        </p>
      </div>
    );
  }

  // Preview mode: limit=0 means show a preview card linking to the full gallery
  if (limit === 0) {
    const coverUrl = allImages[0]?.thumbnails?.medium || allImages[0]?.s3_url || '';
    return (
      <div role="region" aria-label={`Gallery: ${title}`} className="my-6">
        {showTitle && title && (
          <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">{title}</h3>
        )}
        {showDescription && description && (
          <p className="text-gray-600 dark:text-gray-400 mb-4">{description}</p>
        )}
        <a
          href={`/gallery/${album?.slug || albumId}`}
          className="group block rounded-lg overflow-hidden shadow-sm hover:shadow-lg transition-shadow duration-300 max-w-md"
        >
          <div className="relative aspect-[4/3] overflow-hidden">
            {coverUrl && (
              <img
                src={coverUrl}
                alt={title || 'Gallery preview'}
                loading="lazy"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            )}
            <div className="absolute top-0 right-0 bg-black/60 text-white text-xs px-2 py-1 rounded-bl-lg">
              {allImages.length} {allImages.length === 1 ? 'image' : 'images'}
            </div>
          </div>
          <div className="p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 border-t-0 rounded-b-lg">
            <p className="text-blue-600 dark:text-blue-400 font-medium group-hover:underline">
              View Gallery →
            </p>
          </div>
        </a>
      </div>
    );
  }

  return (
    <div role="region" aria-label={`Gallery: ${title}`}>
      {showTitle && title && (
        <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">{title}</h3>
      )}
      {showDescription && description && (
        <p className="text-gray-600 dark:text-gray-400 mb-4">{description}</p>
      )}

      {/* Grid Layout */}
      {layout === 'grid' && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {displayImages.map((image, index) => (
            <button
              key={image.id}
              type="button"
              className="aspect-square overflow-hidden rounded-lg cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
              onClick={() => openLightbox(index)}
            >
              <img
                src={getImageUrl(image, 'medium')}
                alt={getAltText(image)}
                loading="lazy"
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-200"
              />
            </button>
          ))}
        </div>
      )}

      {/* Carousel Layout */}
      {layout === 'carousel' && (
        <div className="relative" {...swipeHandlers}>
          <button
            type="button"
            onClick={() => scrollCarousel('left')}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-10 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Previous image"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <div
            ref={carouselRef}
            className="flex gap-4 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-4 scrollbar-hide"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {displayImages.map((image, index) => (
              <button
                key={image.id}
                type="button"
                className="flex-shrink-0 w-72 h-48 md:w-96 md:h-64 snap-start overflow-hidden rounded-lg cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
                onClick={() => openLightbox(index)}
              >
                <img
                  src={getImageUrl(image, 'large')}
                  alt={getAltText(image)}
                  loading="lazy"
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-200"
                />
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => scrollCarousel('right')}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-10 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Next image"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}

      {/* Masonry Layout */}
      {layout === 'masonry' && (
        <div className="columns-2 md:columns-3 lg:columns-4 gap-4">
          {displayImages.map((image, index) => (
            <button
              key={image.id}
              type="button"
              className="mb-4 break-inside-avoid overflow-hidden rounded-lg cursor-pointer block w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
              onClick={() => openLightbox(index)}
            >
              <img
                src={getImageUrl(image, 'medium')}
                alt={getAltText(image)}
                loading="lazy"
                className="w-full h-auto object-cover hover:scale-105 transition-transform duration-200"
              />
            </button>
          ))}
        </div>
      )}

      {/* View All link */}
      {hasMore && (
        <div className="mt-4 text-center">
          <a
            href={`/gallery/${album?.slug || albumId}`}
            className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
          >
            View all {allImages.length} images
          </a>
        </div>
      )}

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <Lightbox
          images={allImages}
          currentIndex={lightboxIndex}
          onClose={closeLightbox}
          onNext={nextImage}
          onPrevious={previousImage}
        />
      )}
    </div>
  );
};
