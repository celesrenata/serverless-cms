import { useRef, useCallback } from 'react';
import { detectSwipe } from '../utils/galleryUtils';

export interface UseSwipeOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  threshold?: number;
}

export interface SwipeHandlers {
  onPointerDown: React.PointerEventHandler;
  onPointerMove: React.PointerEventHandler;
  onPointerUp: React.PointerEventHandler;
  onPointerCancel: React.PointerEventHandler;
}

export function useSwipe(options: UseSwipeOptions): SwipeHandlers {
  const { onSwipeLeft, onSwipeRight, threshold = 50 } = options;

  const startX = useRef(0);
  const startY = useRef(0);
  const activePointerId = useRef<number | null>(null);

  const onPointerDown: React.PointerEventHandler = useCallback((e) => {
    if (activePointerId.current !== null) return;
    activePointerId.current = e.pointerId;
    startX.current = e.clientX;
    startY.current = e.clientY;
  }, []);

  const onPointerMove: React.PointerEventHandler = useCallback(() => {
    // No-op: we only need start and end positions
  }, []);

  const onPointerUp: React.PointerEventHandler = useCallback(
    (e) => {
      if (e.pointerId !== activePointerId.current) return;

      const direction = detectSwipe({
        startX: startX.current,
        startY: startY.current,
        endX: e.clientX,
        endY: e.clientY,
        threshold,
      });

      if (direction === 'left') {
        onSwipeLeft?.();
      } else if (direction === 'right') {
        onSwipeRight?.();
      }

      activePointerId.current = null;
      startX.current = 0;
      startY.current = 0;
    },
    [threshold, onSwipeLeft, onSwipeRight]
  );

  const onPointerCancel: React.PointerEventHandler = useCallback(() => {
    activePointerId.current = null;
    startX.current = 0;
    startY.current = 0;
  }, []);

  return { onPointerDown, onPointerMove, onPointerUp, onPointerCancel };
}

export default useSwipe;
