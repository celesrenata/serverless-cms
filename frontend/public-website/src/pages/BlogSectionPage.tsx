import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchSectionByPath, fetchSectionPosts, SectionPostsResponse } from '../services/sectionService';
import { SectionTreeNode } from '../../../shared/sections/types';
import { PostCard } from '../components/PostCard';
import { BlogContent } from '../components/BlogContent';
import { PageMeta } from '../components/PageMeta';
import { Content } from '../types';

export const BlogSectionPage = () => {
  const params = useParams();
  const sectionPath = params['*'] || '';

  const [section, setSection] = useState<SectionTreeNode | null>(null);
  const [postsResponse, setPostsResponse] = useState<SectionPostsResponse | null>(null);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingPosts, setIsLoadingPosts] = useState(false);
  const [notFound, setNotFound] = useState(false);

  // Fetch section by path
  useEffect(() => {
    if (!sectionPath) {
      setNotFound(true);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setNotFound(false);
    setSection(null);
    setPostsResponse(null);
    setPage(1);

    fetchSectionByPath(sectionPath)
      .then((data) => {
        setSection(data);
        setIsLoading(false);
      })
      .catch((err) => {
        if (err?.response?.status === 404) {
          setNotFound(true);
        }
        setIsLoading(false);
      });
  }, [sectionPath]);

  // Fetch posts when section or page changes
  useEffect(() => {
    if (!section) return;

    setIsLoadingPosts(true);
    fetchSectionPosts(section.id, page)
      .then((data) => {
        setPostsResponse(data);
        setIsLoadingPosts(false);
      })
      .catch(() => {
        setIsLoadingPosts(false);
      });
  }, [section, page]);

  // 404 state
  if (!isLoading && notFound) {
    return (
      <>
        <PageMeta title="Section Not Found" />
        <div className="bg-white min-h-screen">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">404 - Section Not Found</h1>
            <p className="text-gray-600 text-lg mb-8">
              The section you are looking for does not exist.
            </p>
            <Link
              to="/blog"
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Back to Blog
            </Link>
          </div>
        </div>
      </>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="bg-white min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!section) return null;

  // Sort child sections alphabetically by name
  const childSections = [...(section.children || [])].sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  const posts = postsResponse?.items || [];
  const pagination = postsResponse?.pagination;
  const landingPage = postsResponse?.landing_page;

  // Landing page: render in Post-style layout
  if (landingPage) {
    return (
      <>
        <PageMeta
          title={landingPage.title}
          description={landingPage.excerpt || section.description || `Browse posts in ${section.name}`}
          canonical={`/blog/sections/${section.path}`}
        />

        <article className="bg-white min-h-screen">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            {/* Back to Blog */}
            <Link
              to="/blog"
              className="text-blue-600 hover:text-blue-700 font-medium mb-8 inline-block"
            >
              ← Back to Blog
            </Link>

            {/* Page Header */}
            <header className="mb-8">
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
                {landingPage.title}
              </h1>

              <div className="flex items-center text-gray-600 text-sm">
                <span>By {landingPage.author_name || 'Unknown Author'}</span>
                {landingPage.published_at ? (
                  <>
                    <span className="mx-2">•</span>
                    <time dateTime={new Date(landingPage.published_at * 1000).toISOString()}>
                      {new Date(landingPage.published_at * 1000).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </time>
                  </>
                ) : null}
              </div>
            </header>

            {/* Featured Image */}
            {landingPage.featured_image && (
              <img
                src={landingPage.featured_image}
                alt={landingPage.title}
                className="w-full rounded-lg mb-8 shadow-lg"
              />
            )}

            {/* Page Content */}
            <div className="mb-12">
              <BlogContent html={landingPage.content} />
            </div>

            {/* Child section links */}
            {childSections.length > 0 && (
              <div className="border-t border-gray-200 pt-8 mt-8">
                <h2 className="text-lg font-semibold text-gray-800 mb-3">Subsections</h2>
                <div className="flex flex-wrap gap-3">
                  {childSections.map((child) => (
                    <Link
                      key={child.id}
                      to={`/blog/sections/${child.path}`}
                      className="px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition text-sm font-medium"
                    >
                      {child.name}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Posts below landing page (when show_posts enabled) */}
            {section.show_posts === true && (
              <>
                {isLoadingPosts ? (
                  <div className="text-center py-12">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                  </div>
                ) : posts.length > 0 ? (
                  <div className="border-t border-gray-200 pt-8 mt-8">
                    <h2 className="text-lg font-semibold text-gray-800 mb-6">Posts</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {posts.map((post: Content) => (
                        <PostCard key={post.id} post={post} />
                      ))}
                    </div>

                    {pagination && pagination.total_pages > 1 && (
                      <div className="flex items-center justify-center gap-4 mt-8">
                        <button
                          onClick={() => setPage((p) => Math.max(1, p - 1))}
                          disabled={page <= 1}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Previous
                        </button>
                        <span className="text-gray-600">
                          Page {pagination.page} of {pagination.total_pages}
                        </span>
                        <button
                          onClick={() => setPage((p) => Math.min(pagination.total_pages, p + 1))}
                          disabled={page >= pagination.total_pages}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Next
                        </button>
                      </div>
                    )}
                  </div>
                ) : null}
              </>
            )}
          </div>
        </article>
      </>
    );
  }

  // Standard section layout (no landing page)
  return (
    <>
      <PageMeta
        title={section.name}
        description={section.description || `Browse posts in ${section.name}`}
        canonical={`/blog/sections/${section.path}`}
      />

      <div className="bg-white min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Section header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">{section.name}</h1>
            {section.description && (
              <p className="text-gray-600 text-lg">{section.description}</p>
            )}
          </div>

          {/* Child section links */}
          {childSections.length > 0 && (
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-gray-800 mb-3">Subsections</h2>
              <div className="flex flex-wrap gap-3">
                {childSections.map((child) => (
                  <Link
                    key={child.id}
                    to={`/blog/sections/${child.path}`}
                    className="px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition text-sm font-medium"
                  >
                    {child.name}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Posts */}
          {isLoadingPosts ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : posts.length > 0 ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {posts.map((post: Content) => (
                  <PostCard key={post.id} post={post} />
                ))}
              </div>

              {/* Pagination controls */}
              {pagination && pagination.total_pages > 1 && (
                <div className="flex items-center justify-center gap-4 mt-12">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <span className="text-gray-600">
                    Page {pagination.page} of {pagination.total_pages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(pagination.total_pages, p + 1))}
                    disabled={page >= pagination.total_pages}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-600 text-lg">No posts available in this section.</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
};
