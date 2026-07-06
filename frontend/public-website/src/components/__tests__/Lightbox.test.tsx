import { screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Lightbox } from '../Lightbox';
import { Media } from '../../types';
import { renderWithProviders } from '../../test/utils/renderWithProviders';

const mockImages: Media[] = [
  {
    id: 'img-1',
    filename: 'photo1.jpg',
    s3_key: 'k1',
    s3_url: 'https://example.com/photo1.jpg',
    mime_type: 'image/jpeg',
    size: 1000,
    metadata: { alt_text: 'Photo 1', caption: 'First photo caption' },
    uploaded_by: 'u1',
    uploaded_at: 1700000000,
  },
  {
    id: 'img-2',
    filename: 'photo2.jpg',
    s3_key: 'k2',
    s3_url: 'https://example.com/photo2.jpg',
    mime_type: 'image/jpeg',
    size: 2000,
    metadata: { alt_text: 'Photo 2' }, // no caption!
    uploaded_by: 'u1',
    uploaded_at: 1700000000,
  },
  {
    id: 'img-3',
    filename: 'photo3.jpg',
    s3_key: 'k3',
    s3_url: 'https://example.com/photo3.jpg',
    mime_type: 'image/jpeg',
    size: 3000,
    metadata: { alt_text: 'Photo 3', caption: 'Third photo' },
    uploaded_by: 'u1',
    uploaded_at: 1700000000,
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

  it('renders nothing when images array is empty', () => {
    const { container } = renderLightbox({ images: [], currentIndex: 0 });
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when currentIndex is out of bounds', () => {
    const { container } = renderLightbox({ currentIndex: 999 });
    expect(container).toBeEmptyDOMElement();
  });

  it('renders image with correct src and alt text', () => {
    renderLightbox();
    const image = screen.getByRole('img', { name: 'Photo 1' });
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute('src', 'https://example.com/photo1.jpg');
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

  it('calls onClose when close button is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderLightbox({ onClose });
    await user.click(screen.getByRole('button', { name: /close lightbox/i }));
    expect(onClose).toHaveBeenCalled();
  });

  it('hides previous button at first image', () => {
    renderLightbox({ currentIndex: 0 });
    expect(screen.queryByRole('button', { name: /previous image/i })).not.toBeInTheDocument();
  });

  it('hides next button at last image', () => {
    renderLightbox({ currentIndex: mockImages.length - 1 });
    expect(screen.queryByRole('button', { name: /next image/i })).not.toBeInTheDocument();
  });

  it('renders caption in unified card below the image when caption exists', () => {
    renderLightbox({ currentIndex: 0 });
    const captionText = screen.getByText('First photo caption');
    expect(captionText).toBeInTheDocument();
    const captionContainer = captionText.closest('div');
    expect(captionContainer).toHaveClass('border-t', 'border-gray-700');
  });

  it('shows alt_text as caption fallback when descriptive and no caption set', () => {
    renderLightbox({ currentIndex: 1 }); // img-2 has alt_text: 'Photo 2' but no caption
    expect(screen.getByText('Photo 2')).toBeInTheDocument();
    const captionContainer = screen.getByText('Photo 2').closest('div');
    expect(captionContainer).toHaveClass('border-t', 'border-gray-700');
  });

  it('does not render caption panel when alt_text is a filename', () => {
    const filenameAltImages: Media[] = [
      {
        id: 'img-fn',
        filename: 'sunset.jpg',
        s3_key: 'k-fn',
        s3_url: 'https://example.com/sunset.jpg',
        mime_type: 'image/jpeg',
        size: 1000,
        metadata: { alt_text: 'sunset.jpg' }, // filename, not descriptive
        uploaded_by: 'u1',
        uploaded_at: 1700000000,
      },
    ];
    renderLightbox({ images: filenameAltImages, currentIndex: 0 });
    const dialog = screen.getByRole('dialog');
    const captionPanel = dialog.querySelector('.border-t');
    expect(captionPanel).not.toBeInTheDocument();
  });

  it('has role="dialog" and aria-modal="true" on root element', () => {
    renderLightbox();
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute('aria-modal', 'true');
  });

  it('swipe left triggers next image', () => {
    const onNext = vi.fn();
    renderLightbox({ onNext, currentIndex: 0 });

    // The image container is the flex column div that wraps the img
    const image = screen.getByRole('img');
    const imageContainer = image.closest('.flex.flex-col') as HTMLElement;
    expect(imageContainer).not.toBeNull();

    // fireEvent with pointer events - assign pointerId after creation
    const downEvent = new Event('pointerdown', { bubbles: true });
    Object.assign(downEvent, { pointerId: 1, clientX: 200, clientY: 100 });
    imageContainer.dispatchEvent(downEvent);

    const upEvent = new Event('pointerup', { bubbles: true });
    Object.assign(upEvent, { pointerId: 1, clientX: 50, clientY: 100 });
    imageContainer.dispatchEvent(upEvent);

    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it('swipe right triggers previous image', () => {
    const onPrevious = vi.fn();
    renderLightbox({ onPrevious, currentIndex: 1 });

    // The image container is the flex column div that wraps the img
    const image = screen.getByRole('img');
    const imageContainer = image.closest('.flex.flex-col') as HTMLElement;
    expect(imageContainer).not.toBeNull();

    // fireEvent with pointer events - assign pointerId after creation
    const downEvent = new Event('pointerdown', { bubbles: true });
    Object.assign(downEvent, { pointerId: 1, clientX: 50, clientY: 100 });
    imageContainer.dispatchEvent(downEvent);

    const upEvent = new Event('pointerup', { bubbles: true });
    Object.assign(upEvent, { pointerId: 1, clientX: 200, clientY: 100 });
    imageContainer.dispatchEvent(upEvent);

    expect(onPrevious).toHaveBeenCalledTimes(1);
  });

  it('displays position indicator', () => {
    renderLightbox({ currentIndex: 1 });
    expect(screen.getByText('2 / 3')).toBeInTheDocument();
  });
});
