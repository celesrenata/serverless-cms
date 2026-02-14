import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useContentList } from '../hooks/useContent';
import { useSiteSettings } from '../hooks/useSiteSettings';
import { Lightbox } from '../components/Lightbox';
import { Media, Content } from '../types';

export const Gallery = () => {
  const { data: settings } = useSiteSettings();
  const { data: galleries, isLoading } = useContentList({
    type: 'gallery',
    status: 'published',
  });

  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [currentGalleryImages, setCurrentGalleryImages] = useState<Media[]>([]);

  const openLightbox = (images: Media[], index: number) => {
    setCurrentGalleryImages(images);
    setCurrentImageIndex(index);
    setLightboxOpen(true);
  };

  const closeLightbox = () => {
    setLightboxOpen(false);
  };

  const nextImage = () => {
    setCurrentImageIndex((prev) =>
      prev < currentGalleryImages.length - 1 ? prev + 1 : prev
    );
  };

  const previousImage = () => {
    setCurrentImageIndex((prev) => (prev > 0 ? prev - 1 : prev));
  };

  return (
    <>
      <Helmet>
        <title>Gallery - {settings?.site_title || 'My Website'}</title>
        <meta
          name="description"
          content={`Photo gallery from ${settings?.site_title || 'our website'}`}
        />
      </Helmet>

      <div className="bg-white min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-8">Gallery</h1>

          {isLoading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : galleries && galleries.items.length > 0 ? (
            <div className="space-y-16">
              {galleries.items.map((gallery: Content) => {
                const galleryImages: Media[] = gallery.metadata?.media || [];
                
                return (
                  <section key={gallery.id}>
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">
                      {gallery.title}
                    </h2>
                    {gallery.excerpt && (
                      <p className="text-gray-600 mb-6">{gallery.excerpt}</p>
                    )}
                    
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {galleryImages.map((image: Media, index: number) => (
                        <button
                          key={image.id}
                          onClick={() => openLightbox(galleryImages, index)}
                          className="relative aspect-square overflow-hidden rounded-lg group cursor-pointer"
                        >
                          <img
                            src={image.thumbnails?.medium || image.s3_url}
                            alt={image.metadata?.alt_text || image.filename}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                            loading="lazy"
                          />
                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-opacity flex items-center justify-center">
                            <svg
                              className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"
                              />
                            </svg>
                          </div>
                        </button>
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-600 text-lg">No galleries found.</p>
            </div>
          )}
        </div>
      </div>

      {/* Lightbox */}
      {lightboxOpen && (
        <Lightbox
          images={currentGalleryImages}
          currentIndex={currentImageIndex}
          onClose={closeLightbox}
          onNext={nextImage}
          onPrevious={previousImage}
        />
      )}
    </>
  );
};
