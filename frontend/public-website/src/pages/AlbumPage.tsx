import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useContentBySlug } from '../hooks/useContent';
import { useSiteSettings } from '../hooks/useSiteSettings';
import { Lightbox } from '../components/Lightbox';
import { formatAlbumTitle } from '../utils/galleryUtils';
import type { Media } from '../types';

export const AlbumPage = () => {
  const { slug = '' } = useParams<{ slug: string }>();
  const { data: album, isLoading, isError } = useContentBySlug(slug);
  const { data: siteSettings } = useSiteSettings();
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  if (isLoading) {
    return (
      <div className="bg-white min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex justify-center items-center min-h-[300px]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
          </div>
        </div>
      </div>
    );
  }

  if (
    isError ||
    !album ||
    album.type !== 'gallery' ||
    album.status !== 'published'
  ) {
    return (
      <div className="bg-white min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <Link
            to="/gallery"
            className="text-blue-600 hover:text-blue-800 mb-6 inline-block"
          >
            ← Back to Gallery
          </Link>
          <p className="text-gray-600">Gallery album not found.</p>
        </div>
      </div>
    );
  }

  const siteTitle = siteSettings?.site_title ?? '';
  const images: Media[] = album.metadata.media ?? [];

  const handleNext = () => {
    setSelectedIndex((currentIndex) =>
      currentIndex === null
        ? null
        : Math.min(currentIndex + 1, images.length - 1),
    );
  };

  const handlePrevious = () => {
    setSelectedIndex((currentIndex) =>
      currentIndex === null ? null : Math.max(currentIndex - 1, 0),
    );
  };

  return (
    <div className="bg-white min-h-screen">
      <Helmet>
        <title>{formatAlbumTitle(album.title, siteTitle)}</title>
        <meta name="description" content={album.excerpt} />
      </Helmet>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Link
          to="/gallery"
          className="text-blue-600 hover:text-blue-800 mb-6 inline-block"
        >
          ← Back to Gallery
        </Link>

        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          {album.title}
        </h1>

        {album.excerpt && <p className="text-gray-600 mb-8">{album.excerpt}</p>}

        {images.length === 0 ? (
          <p className="text-gray-600">
            This album does not contain any images yet.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {images.map((image, index) => (
              <button
                key={image.id}
                type="button"
                onClick={() => setSelectedIndex(index)}
                className="group block overflow-hidden rounded-lg bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2"
              >
                <img
                  src={image.thumbnails?.medium ?? image.s3_url}
                  alt={
                    image.metadata?.alt_text ??
                    image.metadata?.caption ??
                    image.filename
                  }
                  loading="lazy"
                  className="h-64 w-full object-cover transition-transform duration-200 group-hover:scale-105"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedIndex !== null && (
        <Lightbox
          images={images}
          currentIndex={selectedIndex}
          onClose={() => setSelectedIndex(null)}
          onNext={handleNext}
          onPrevious={handlePrevious}
        />
      )}
    </div>
  );
};
