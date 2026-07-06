import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useContentList } from '../hooks/useContent';
import { useSiteSettings } from '../hooks/useSiteSettings';
import { toAlbumCard, formatGalleryTitle } from '../utils/galleryUtils';
import type { Content } from '../types';

export const Gallery = () => {
  const { data: settings } = useSiteSettings();
  const { data: galleries, isLoading } = useContentList({
    type: 'gallery',
    status: 'published',
  });

  const cards = (galleries?.items ?? []).map((gallery: Content) => toAlbumCard(gallery));

  return (
    <>
      <Helmet>
        <title>{formatGalleryTitle(settings?.site_title || 'My Website')}</title>
      </Helmet>

      <div className="bg-white min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-8">Gallery</h1>

          {isLoading ? (
            <div className="flex justify-center items-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : cards.length === 0 ? (
            <div className="text-center py-20 text-gray-600">
              No galleries are available yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {cards.map((card) => (
                <Link
                  key={card.id}
                  to={`/gallery/${card.slug}`}
                  className="group block rounded-lg overflow-hidden shadow-sm hover:shadow-lg transition-shadow duration-300"
                >
                  <div className="relative aspect-[4/3] overflow-hidden">
                    <img
                      src={card.coverUrl}
                      alt={card.coverAlt}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute top-0 right-0 bg-black/60 text-white text-xs px-2 py-1 rounded-bl-lg">
                      {card.imageCount} {card.imageCount === 1 ? 'image' : 'images'}
                    </div>
                  </div>

                  <div className="p-4">
                    <h2 className="text-lg font-semibold text-gray-900 mb-1">{card.title}</h2>
                    <p className="text-sm text-gray-600 line-clamp-2">{card.excerpt}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};
