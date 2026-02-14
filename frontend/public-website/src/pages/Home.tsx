import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useContentList } from '../hooks/useContent';
import { useSiteSettings } from '../hooks/useSiteSettings';
import { Content } from '../types';

export const Home = () => {
  const { data: settings } = useSiteSettings();
  const { data: featuredPosts } = useContentList({ type: 'post', status: 'published', limit: 3 });
  const { data: recentProjects } = useContentList({ type: 'project', status: 'published', limit: 3 });
  const { data: galleryPreview } = useContentList({ type: 'gallery', status: 'published', limit: 1 });

  return (
    <>
      <Helmet>
        <title>{settings?.site_title || 'Home'}</title>
        <meta name="description" content={settings?.site_description || 'Welcome to my website'} />
      </Helmet>

      <div className="bg-white">
        {/* Hero Section */}
        <section className="bg-gradient-to-r from-blue-500 to-purple-600 text-white py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-4">
              {settings?.site_title || 'Welcome'}
            </h1>
            <p className="text-xl md:text-2xl mb-8">
              {settings?.site_description || 'A serverless CMS website'}
            </p>
            <Link
              to="/blog"
              className="inline-block bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition"
            >
              Explore Blog
            </Link>
          </div>
        </section>

        {/* Featured Posts */}
        {featuredPosts && featuredPosts.items.length > 0 && (
          <section className="py-16">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-8">Recent Posts</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {featuredPosts.items.map((post: Content) => (
                  <Link
                    key={post.id}
                    to={`/blog/${post.slug}`}
                    className="group"
                  >
                    {post.featured_image && (
                      <img
                        src={post.featured_image}
                        alt={post.title}
                        className="w-full h-48 object-cover rounded-lg mb-4 group-hover:opacity-90 transition"
                      />
                    )}
                    <h3 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition">
                      {post.title}
                    </h3>
                    <p className="text-gray-600 line-clamp-3">{post.excerpt}</p>
                    <p className="text-sm text-gray-500 mt-2">
                      {post.published_at && new Date(post.published_at * 1000).toLocaleDateString()}
                    </p>
                  </Link>
                ))}
              </div>
              <div className="text-center mt-8">
                <Link
                  to="/blog"
                  className="text-blue-600 hover:text-blue-700 font-semibold"
                >
                  View All Posts →
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* Projects Preview */}
        {recentProjects && recentProjects.items.length > 0 && (
          <section className="py-16 bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-8">Recent Projects</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {recentProjects.items.map((project: Content) => (
                  <Link
                    key={project.id}
                    to={`/projects#${project.slug}`}
                    className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition"
                  >
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      {project.title}
                    </h3>
                    <p className="text-gray-600 line-clamp-3">{project.excerpt}</p>
                  </Link>
                ))}
              </div>
              <div className="text-center mt-8">
                <Link
                  to="/projects"
                  className="text-blue-600 hover:text-blue-700 font-semibold"
                >
                  View All Projects →
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* Gallery Preview */}
        {galleryPreview && galleryPreview.items.length > 0 && (
          <section className="py-16">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-8">Photo Gallery</h2>
              <Link
                to="/gallery"
                className="block relative group"
              >
                {galleryPreview.items[0].featured_image && (
                  <img
                    src={galleryPreview.items[0].featured_image}
                    alt="Gallery Preview"
                    className="w-full h-96 object-cover rounded-lg group-hover:opacity-90 transition"
                  />
                )}
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-0 group-hover:bg-opacity-30 transition rounded-lg">
                  <span className="text-white text-xl font-semibold opacity-0 group-hover:opacity-100 transition">
                    View Gallery →
                  </span>
                </div>
              </Link>
            </div>
          </section>
        )}
      </div>
    </>
  );
};
