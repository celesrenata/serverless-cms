import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useContentList } from '../hooks/useContent';
import { useSiteSettings } from '../hooks/useSiteSettings';
import { PostCard } from '../components/PostCard';
import { Content } from '../types';

export const Blog = () => {
  const { data: settings } = useSiteSettings();
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [lastKey, setLastKey] = useState<string | undefined>();

  const { data: posts, isLoading } = useContentList({
    type: 'post',
    status: 'published',
    limit: 12,
    last_key: lastKey,
  });

  // Extract unique categories and tags from posts
  const categories: string[] = posts?.items
    ? Array.from(
        new Set(
          posts.items.flatMap((post: Content) => post.metadata?.categories || [])
        )
      )
    : [];

  const tags: string[] = posts?.items
    ? Array.from(
        new Set(posts.items.flatMap((post: Content) => post.metadata?.tags || []))
      )
    : [];

  // Filter posts based on selected category and tag
  const filteredPosts = posts?.items.filter((post: Content) => {
    const matchesCategory =
      !selectedCategory ||
      post.metadata?.categories?.includes(selectedCategory);
    const matchesTag =
      !selectedTag || post.metadata?.tags?.includes(selectedTag);
    return matchesCategory && matchesTag;
  });

  const handleLoadMore = () => {
    if (posts?.last_key) {
      setLastKey(JSON.stringify(posts.last_key));
    }
  };

  return (
    <>
      <Helmet>
        <title>Blog - {settings?.site_title || 'My Website'}</title>
        <meta
          name="description"
          content={`Read the latest blog posts from ${settings?.site_title || 'our website'}`}
        />
      </Helmet>

      <div className="bg-white min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-8">Blog</h1>

          {/* Filters */}
          <div className="mb-8 flex flex-wrap gap-4">
            {/* Category Filter */}
            {categories.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">All Categories</option>
                  {categories.map((category: string) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Tag Filter */}
            {tags.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tag
                </label>
                <select
                  value={selectedTag}
                  onChange={(e) => setSelectedTag(e.target.value)}
                  className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">All Tags</option>
                  {tags.map((tag: string) => (
                    <option key={tag} value={tag}>
                      {tag}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Clear Filters */}
            {(selectedCategory || selectedTag) && (
              <div className="flex items-end">
                <button
                  onClick={() => {
                    setSelectedCategory('');
                    setSelectedTag('');
                  }}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  Clear Filters
                </button>
              </div>
            )}
          </div>

          {/* Posts Grid */}
          {isLoading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredPosts && filteredPosts.length > 0 ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredPosts.map((post: Content) => (
                  <PostCard key={post.id} post={post} />
                ))}
              </div>

              {/* Pagination */}
              {posts?.last_key && (
                <div className="text-center mt-12">
                  <button
                    onClick={handleLoadMore}
                    className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
                  >
                    Load More Posts
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-600 text-lg">No posts found.</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
};
