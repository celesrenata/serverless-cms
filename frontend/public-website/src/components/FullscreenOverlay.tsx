import { ReactNode, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface FullscreenOverlayProps {
  onClose: () => void;
  children: ReactNode;
}

export const FullscreenOverlay = ({ onClose, children }: FullscreenOverlayProps) => {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', onKeyDown);

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-black/90 cursor-zoom-out"
      onClick={onClose}
    >
      <button
        type="button"
        aria-label="Close"
        className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors z-10"
        onClick={onClose}
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="h-7 w-7"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M6 6l12 12" />
          <path d="M18 6L6 18" />
        </svg>
      </button>

      <div className="w-full h-full flex items-center justify-center p-4">
        <div
          className="max-w-[95vw] max-h-[95vh] overflow-auto cursor-default"
          onClick={(e) => e.stopPropagation()}
        >
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
};
