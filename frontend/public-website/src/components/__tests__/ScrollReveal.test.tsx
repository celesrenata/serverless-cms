import { act, screen } from '@testing-library/react';
import { ScrollReveal } from '../ScrollReveal';
import { renderWithProviders } from '../../test/utils/renderWithProviders';

type MockIntersectionObserverInstance = IntersectionObserver & {
  elements: Set<Element>;
  trigger: (isIntersecting: boolean, target?: Element) => void;
};

let intersectionObserverInstances: MockIntersectionObserverInstance[] = [];

class MockIntersectionObserver implements IntersectionObserver {
  readonly root: Element | Document | null = null;
  readonly rootMargin: string = '0px';
  readonly thresholds: ReadonlyArray<number> = [0];

  elements = new Set<Element>();

  constructor(
    private readonly callback: IntersectionObserverCallback,
    _options?: IntersectionObserverInit,
  ) {
    intersectionObserverInstances.push(this as unknown as MockIntersectionObserverInstance);
  }

  observe = vi.fn((element: Element) => {
    this.elements.add(element);
  });

  unobserve = vi.fn((element: Element) => {
    this.elements.delete(element);
  });

  disconnect = vi.fn(() => {
    this.elements.clear();
  });

  takeRecords = vi.fn((): IntersectionObserverEntry[] => []);

  trigger(isIntersecting: boolean, target?: Element) {
    const observedTarget = target ?? Array.from(this.elements)[0] ?? document.createElement('div');
    const rect = observedTarget.getBoundingClientRect();

    const entry = {
      time: Date.now(),
      target: observedTarget,
      rootBounds: null,
      boundingClientRect: rect,
      intersectionRect: isIntersecting ? rect : new DOMRect(),
      isIntersecting,
      intersectionRatio: isIntersecting ? 1 : 0,
    } as IntersectionObserverEntry;

    this.callback([entry], this);
  }
}

const mockMatchMedia = (matches: boolean) => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
};

const mockIntersectionObserver = () => {
  Object.defineProperty(window, 'IntersectionObserver', {
    writable: true,
    configurable: true,
    value: MockIntersectionObserver,
  });

  Object.defineProperty(globalThis, 'IntersectionObserver', {
    writable: true,
    configurable: true,
    value: MockIntersectionObserver,
  });
};

const removeIntersectionObserver = () => {
  Object.defineProperty(window, 'IntersectionObserver', {
    writable: true,
    configurable: true,
    value: undefined,
  });
  Object.defineProperty(globalThis, 'IntersectionObserver', {
    writable: true,
    configurable: true,
    value: undefined,
  });
};

const renderScrollReveal = () => {
  renderWithProviders(
    <ScrollReveal>
      <div>Revealed content</div>
    </ScrollReveal>,
  );

  return screen.getByText('Revealed content').parentElement as HTMLElement;
};

beforeEach(() => {
  intersectionObserverInstances = [];
  mockIntersectionObserver();
  mockMatchMedia(false);
  localStorage.removeItem('celestium.motion.override');
});

afterEach(() => {
  vi.clearAllMocks();
  localStorage.removeItem('celestium.motion.override');
});

describe('ScrollReveal', () => {
  it('renders children content', () => {
    renderScrollReveal();

    expect(screen.getByText('Revealed content')).toBeInTheDocument();
  });

  it('applies initial hidden styles', () => {
    const wrapper = renderScrollReveal();

    expect(wrapper).toHaveStyle('opacity: 0');
    expect(wrapper).toHaveStyle('transform: translateY(20px)');
  });

  it('becomes visible when IntersectionObserver triggers', () => {
    const wrapper = renderScrollReveal();
    const observer = intersectionObserverInstances[0];

    act(() => {
      observer.trigger(true, wrapper);
    });

    expect(wrapper).toHaveStyle('opacity: 1');
    expect(wrapper).toHaveStyle('transform: translateY(0)');
  });

  it('stays visible after intersection stops', () => {
    const wrapper = renderScrollReveal();
    const observer = intersectionObserverInstances[0];

    act(() => {
      observer.trigger(true, wrapper);
    });

    expect(wrapper).toHaveStyle('opacity: 1');
    expect(wrapper).toHaveStyle('transform: translateY(0)');

    // After unobserving, it should remain visible
    expect(wrapper).toHaveStyle('opacity: 1');
    expect(wrapper).toHaveStyle('transform: translateY(0)');
  });

  it('shows immediately when IntersectionObserver is not supported', () => {
    removeIntersectionObserver();

    const wrapper = renderScrollReveal();

    expect(wrapper).toHaveStyle('opacity: 1');
    expect(wrapper).toHaveStyle('transform: translateY(0)');
  });

  it('shows immediately when prefers-reduced-motion is reduce', () => {
    mockMatchMedia(true);

    const wrapper = renderScrollReveal();

    expect(wrapper).toHaveStyle('opacity: 1');
    expect(wrapper).toHaveStyle('transform: translateY(0)');
    expect(wrapper).toHaveStyle('transition-duration: 0ms');
  });

  it('shows immediately when celestium.motion.override is "reduce"', () => {
    localStorage.setItem('celestium.motion.override', 'reduce');

    const wrapper = renderScrollReveal();

    expect(wrapper).toHaveStyle('opacity: 1');
    expect(wrapper).toHaveStyle('transform: translateY(0)');
    expect(wrapper).toHaveStyle('transition-duration: 0ms');
  });

  it('enables animations when celestium.motion.override is "no-preference" even if system prefers reduced motion', () => {
    mockMatchMedia(true); // system says reduce
    localStorage.setItem('celestium.motion.override', 'no-preference');

    const wrapper = renderScrollReveal();

    // Should NOT show immediately — animations enabled despite system preference
    expect(wrapper).toHaveStyle('opacity: 0');
    expect(wrapper).toHaveStyle('transform: translateY(20px)');
  });

  it('respects system preference when celestium.motion.override is "system"', () => {
    mockMatchMedia(true); // system says reduce
    localStorage.setItem('celestium.motion.override', 'system');

    const wrapper = renderScrollReveal();

    expect(wrapper).toHaveStyle('opacity: 1');
    expect(wrapper).toHaveStyle('transform: translateY(0)');
    expect(wrapper).toHaveStyle('transition-duration: 0ms');
  });

  it('respects system preference when celestium.motion.override is not set', () => {
    mockMatchMedia(true); // system says reduce

    const wrapper = renderScrollReveal();

    expect(wrapper).toHaveStyle('opacity: 1');
    expect(wrapper).toHaveStyle('transform: translateY(0)');
    expect(wrapper).toHaveStyle('transition-duration: 0ms');
  });
});
