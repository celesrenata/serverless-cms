import { screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Lightbox } from '../Lightbox';
import { Media } from '../../types';
import { renderWithProviders } from '../../test/utils/renderWithProviders';

const mockImages: Media[] = [
  {
    id: '1',
    filename: 'image-1.jpg',
    s3_key: 'images/image-1.jpg',
    s3_url: 'https://example.com/image-1.jpg',
    mime_type: 'image/jpeg',
    size: 1024,
    dimensions: { width: 800, height: 600 },
    metadata: {
      alt_text: 'First image alt text',
      caption: 'First image caption',
    },
    uploaded_by: 'user-1',
    uploaded_at: 1710000000,
  },
  {
    id: '2',
    filename: 'image-2.jpg',
    s3_key: 'images/image-2.jpg',
    s3_url: 'https://example.com/image-2.jpg',
    mime_type: 'image/jpeg',
    size: 2048,
    dimensions: { width: 1024, height: 768 },
    metadata: {
      alt_text: 'Second image alt text',
    },
    uploaded_by: 'user-1',
    uploaded_at: 1710000001,
  },
  {
    id: '3',
    filename: 'image-3.jpg',
    s3_key: 'images/image-3.jpg',
    s3_url: 'https://example.com/image-3.jpg',
    mime_type: 'image/jpeg',
    size: 4096,
    dimensions: { width: 1200, height: 900 },
    uploaded_by: 'user-1',
    uploaded_at: 1710000002,
  },
];

const defaultProps = {
  images: mockImages,
  currentIndex: 0,
  onClose: vi.fn(),
  onNext: vi.fn(),
  onPrevious: vi.fn(),
};

const renderLightbox = (props: Partial<typeof defaultProps> = {}) => {
  return renderWithProviders(<Lightbox {...defaultProps} {...props} />);
};

describe('Lightbox', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders image in overlay with correct src and alt text', () => {
    renderLightbox();

    const image = screen.getByRole('img', { name: 'First image alt text' });

    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute('src', 'https://example.com/image-1.jpg');
  });

  it('uses filename as alt text when metadata alt_text is not provided', () => {
    renderLightbox({ currentIndex: 2 });

    const image = screen.getByRole('img', { name: 'image-3.jpg' });

    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute('src', 'https://example.com/image-3.jpg');
  });

  it('calls onClose when close button is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    renderLightbox({ onClose });

    await user.click(screen.getByRole('button', { name: /close lightbox/i }));

    // Button click also bubbles to overlay, so onClose is called at least once
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onClose when overlay background is clicked', () => {
    const onClose = vi.fn();

    const { container } = renderLightbox({ onClose });

    const overlay = container.firstChild as HTMLElement;
    fireEvent.click(overlay);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not call onClose when clicking the image content', () => {
    const onClose = vi.fn();

    renderLightbox({ onClose });

    fireEvent.click(screen.getByRole('img', { name: 'First image alt text' }));

    expect(onClose).not.toHaveBeenCalled();
  });

  it('calls onClose when Escape key is pressed', () => {
    const onClose = vi.fn();

    renderLightbox({ onClose });

    fireEvent.keyDown(window, { key: 'Escape' });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onNext when ArrowRight key is pressed', () => {
    const onNext = vi.fn();

    renderLightbox({ onNext });

    fireEvent.keyDown(window, { key: 'ArrowRight' });

    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it('calls onPrevious when ArrowLeft key is pressed', () => {
    const onPrevious = vi.fn();

    renderLightbox({ currentIndex: 1, onPrevious });

    fireEvent.keyDown(window, { key: 'ArrowLeft' });

    expect(onPrevious).toHaveBeenCalledTimes(1);
  });

  it('calls onNext when next button is clicked', async () => {
    const user = userEvent.setup();
    const onNext = vi.fn();

    renderLightbox({ onNext });

    await user.click(screen.getByRole('button', { name: /next image/i }));

    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it('calls onPrevious when previous button is clicked', async () => {
    const user = userEvent.setup();
    const onPrevious = vi.fn();

    renderLightbox({ currentIndex: 1, onPrevious });

    await user.click(screen.getByRole('button', { name: /previous image/i }));

    expect(onPrevious).toHaveBeenCalledTimes(1);
  });

  it('does not show previous button when at first image', () => {
    renderLightbox({ currentIndex: 0 });

    expect(screen.queryByRole('button', { name: /previous image/i })).not.toBeInTheDocument();
  });

  it('does not show next button when at last image', () => {
    renderLightbox({ currentIndex: mockImages.length - 1 });

    expect(screen.queryByRole('button', { name: /next image/i })).not.toBeInTheDocument();
  });

  it('shows caption when metadata.caption exists', () => {
    renderLightbox({ currentIndex: 0 });

    expect(screen.getByText('First image caption')).toBeInTheDocument();
  });

  it('shows image counter', () => {
    renderLightbox({ currentIndex: 0 });

    expect(screen.getByText('1 / 3')).toBeInTheDocument();
  });

  it('returns null when currentImage is undefined', () => {
    const { container } = renderLightbox({ currentIndex: 999 });

    expect(container).toBeEmptyDOMElement();
  });
});
