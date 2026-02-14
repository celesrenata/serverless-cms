import { Link } from 'react-router-dom';
import { Content } from '../types';

interface PostCardProps {
  post: Content;
}

export const PostCard = ({ post }: PostCardProps) => {
  return (
    <article className="bg-white rounded-lg shadow-sm hover:shadow-md transition overflow-hidden">
      {post.featured_image && (
        <Link to={`/blog/${post.slug}`}>
          <img
            src={post.featured_image}
            alt={post.title}
            className="w-full h-48 object-cover hover:opacity-90 transition"
          />
        </Link>
      )}
      <div className="p-6">
        {post.metadata?.categories && post.metadata.categories.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {post.metadata.categories.map((category) => (
              <span
                key={category}
                className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded"
              >
                {category}
              </span>
            ))}
          </div>
        )}
        <Link to={`/blog/${post.slug}`}>
          <h2 className="text-2xl font-bold text-gray-900 mb-2 hover:text-blue-600 transition">
            {post.title}
          </h2>
        </Link>
        <p className="text-gray-600 mb-4 line-clamp-3">{post.excerpt}</p>
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>By {post.author}</span>
          {post.published_at && (
            <time dateTime={new Date(post.published_at * 1000).toISOString()}>
              {new Date(post.published_at * 1000).toLocaleDateString()}
            </time>
          )}
        </div>
        {post.metadata?.tags && post.metadata.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {post.metadata.tags.map((tag) => (
              <span
                key={tag}
                className="text-xs text-gray-500"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </article>
  );
};
