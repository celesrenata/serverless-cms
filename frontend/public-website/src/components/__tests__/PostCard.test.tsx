import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../test/utils/renderWithProviders';
import { createMockContent } from '../../test/mocks/data';
import { PostCard } from '../PostCard';

describe('PostCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders title, excerpt, date, and link to full post', () => {
    const post = createMockContent();

    renderWithProviders(<PostCard post={post} />);

    expect(screen.getByRole('heading', { name: post.title })).toBeInTheDocument();
    expect(screen.getByText(post.excerpt)).toBeInTheDocument();

    const expectedDate = new Date(post.published_at! * 1000).toLocaleDateString();
    expect(screen.getByText(expectedDate)).toBeInTheDocument();

    const titleLink = screen.getByRole('heading', { name: post.title }).closest('a');
    expect(titleLink).toHaveAttribute('href', `/blog/${post.slug}`);
  });

  it('renders author name', () => {
    const post = createMockContent({ author_name: 'Jane Doe' });

    renderWithProviders(<PostCard post={post} />);

    expect(screen.getByText('By Jane Doe')).toBeInTheDocument();
  });

  it('shows featured image when provided', () => {
    const post = createMockContent({
      featured_image: 'https://example.com/featured-image.jpg',
      title: 'Post With Image',
    });

    renderWithProviders(<PostCard post={post} />);

    const image = screen.getByRole('img', { name: post.title });
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute('src', post.featured_image);
  });

  it('links to correct blog URL', () => {
    const post = createMockContent({ slug: 'my-blog-post' });

    renderWithProviders(<PostCard post={post} />);

    const links = screen.getAllByRole('link');
    const blogLinks = links.filter(
      (link) => link.getAttribute('href') === `/blog/${post.slug}`
    );
    expect(blogLinks.length).toBeGreaterThanOrEqual(2);
  });
});
