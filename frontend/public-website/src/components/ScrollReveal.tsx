import { CSSProperties, ReactNode, useEffect, useRef, useState } from 'react';

export interface ScrollRevealProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  duration?: number;
  threshold?: number;
}

const prefersReducedMotion = (): boolean => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }

  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

/**
 * Reads the user's motion override preference from localStorage.
 * Returns 'system' | 'reduce' | 'no-preference' or null if not set.
 */
const getMotionOverride = (): string | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return localStorage.getItem('celestium.motion.override');
  } catch {
    return null;
  }
};

const shouldShowImmediately = (): boolean => {
  if (typeof window === 'undefined') {
    return true;
  }

  if (typeof window.IntersectionObserver !== 'function') {
    return true;
  }

  const motionOverride = getMotionOverride();

  // User explicitly chose to reduce motion — always disable animations
  if (motionOverride === 'reduce') {
    return true;
  }

  // User explicitly chose no-preference — always enable animations
  if (motionOverride === 'no-preference') {
    return false;
  }

  // 'system' or not set — respect system preference
  return prefersReducedMotion();
};

export function ScrollReveal({
  children,
  className,
  delay = 0,
  duration = 500,
  threshold = 0.1,
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [isVisible, setIsVisible] = useState<boolean>(() => shouldShowImmediately());
  const [disableAnimation, setDisableAnimation] = useState<boolean>(() => shouldShowImmediately());

  useEffect(() => {
    const element = ref.current;

    if (!element) {
      return;
    }

    if (shouldShowImmediately()) {
      setDisableAnimation(true);
      setIsVisible(true);
      return;
    }

    setDisableAnimation(false);

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
          observer.disconnect();
        }
      },
      { threshold },
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [threshold]);

  const style: CSSProperties = {
    opacity: isVisible ? 1 : 0,
    transform: isVisible ? 'translateY(0)' : 'translateY(20px)',
    transitionProperty: 'opacity, transform',
    transitionDuration: disableAnimation ? '0ms' : `${duration}ms`,
    transitionTimingFunction: 'ease-out',
    transitionDelay: disableAnimation ? '0ms' : `${delay}ms`,
    willChange: isVisible ? 'auto' : 'opacity, transform',
  };

  return (
    <div ref={ref} className={className} style={style}>
      {children}
    </div>
  );
}

export default ScrollReveal;
