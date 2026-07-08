import { useRef, useEffect } from 'react';

interface ScrollSentinelProps {
  onIntersect: () => void;
  disabled: boolean;
  rootMargin?: string;
}

export const ScrollSentinel: React.FC<ScrollSentinelProps> = ({
  onIntersect,
  disabled,
  rootMargin = '0px 0px 600px 0px',
}) => {
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (disabled || !sentinelRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          onIntersect();
        }
      },
      { rootMargin }
    );

    observer.observe(sentinelRef.current);

    return () => observer.disconnect();
  }, [onIntersect, disabled, rootMargin]);

  return <div ref={sentinelRef} aria-hidden="true" style={{ height: 1 }} />;
};
