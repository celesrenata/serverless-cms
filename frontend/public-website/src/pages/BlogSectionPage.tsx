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

          {/* Landing page content */}
          {postsResponse?.landing_page && (
            <div className="mb-12 border-b border-gray-200 pb-12">
              {postsResponse.landing_page.featured_image && (
                <img
                  src={postsResponse.landing_page.featured_image}
                  alt={postsResponse.landing_page.title}
                  className="w-full h-64 object-cover rounded-lg mb-6"
                />
              )}
              <BlogContent
                html={postsResponse.landing_page.content}
              />
            </div>
          )}

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
