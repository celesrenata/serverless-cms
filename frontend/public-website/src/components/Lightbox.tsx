import { useEffect } from 'react';
import { useSwipe } from '../hooks/useSwipe';
import { formatPositionIndicator } from '../utils/galleryUtils';
import type { Media } from '../types';

interface LightboxProps {
  images: Media[];
  currentIndex: number;
  onClose: () => void;
  onNext: () => void;
  onPrevious: () => void;
}

export const Lightbox = ({
  images,
  currentIndex,
  onClose,
  onNext,
  onPrevious,
}: LightboxProps) => {
  const currentImage = images[currentIndex];

  const swipeHandlers = useSwipe({ onSwipeLeft: onNext, onSwipeRight: onPrevious });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') onNext();
      if (e.key === 'ArrowLeft') onPrevious();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, onNext, onPrevious]);

  if (!currentImage) return null;

  // Determine caption text: prefer explicit caption, fall back to alt_text if descriptive
  const captionText = (() => {
    const caption = currentImage.metadata?.caption ?? '';
    if (caption) return caption;
    const alt = currentImage.metadata?.alt_text ?? '';
    // Only use alt_text as caption if it's descriptive (not a filename, not ".", not too short)
    if (alt.length > 3 && !/^\w+\.\w{2,4}$/.test(alt) && alt !== '.') return alt;
    return '';
  })();

  return (
    <div
      className="fixed inset-0 z-50 bg-black flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      {/* Close Button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-white hover:text-gray-300 z-10"
        aria-label="Close lightbox"
      >
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Previous Button */}
      {currentIndex > 0 && (
        <button
          onClick={(e) => { e.stopPropagation(); onPrevious(); }}
          className="absolute left-4 text-white hover:text-gray-300 z-10"
          aria-label="Previous image"
        >
          <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      )}

      {/* Unified image + caption card */}
      <div
        className="flex flex-col items-center max-w-5xl w-full mx-4"
        onClick={(e) => e.stopPropagation()}
        {...swipeHandlers}
        style={{ touchAction: 'pan-y' }}
      >
        {/* Position Indicator */}
        <div className="self-end mb-2">
          <span className="text-gray-400 text-sm">
            {formatPositionIndicator(currentIndex, images.length)}
          </span>
        </div>

        {/* Image + Caption as one unified block */}
        <div className="bg-gray-950 rounded-lg overflow-hidden shadow-2xl w-full max-w-4xl">
          {/* Image */}
          <img
            src={currentImage.s3_url}
            alt={captionText && currentImage.metadata?.alt_text === captionText
              ? currentImage.filename
              : (currentImage.metadata?.alt_text || currentImage.filename)}
            className="w-full max-h-[70vh] object-contain bg-black"
          />

          {/* Caption - part of the same card, directly below image */}
          {captionText && (
            <div className="px-6 py-4 border-t border-gray-800">
              <p className="text-gray-200 text-sm leading-relaxed text-center">{captionText}</p>
            </div>
          )}
        </div>
      </div>

      {/* Next Button */}
      {currentIndex < images.length - 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); onNext(); }}
          className="absolute right-4 text-white hover:text-gray-300 z-10"
          aria-label="Next image"
        >
          <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}
    </div>
  );
};
