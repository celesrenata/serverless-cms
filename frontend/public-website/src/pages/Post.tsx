import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useState } from 'react';
import { useContentBySlug, useContentList } from '../hooks/useContent';
import { useComments } from '../hooks/useComments';
import { useSiteSettings } from '../hooks/useSiteSettings';
import { CommentForm } from '../components/CommentForm';
import { CommentList } from '../components/CommentList';
import { Content } from '../types';

export const Post = () => {
  const { slug } = useParams<{ slug: string }>();
  const { data: post, isLoading, error } = useContentBySlug(slug || '');
  const { data: settings } = useSiteSettings();
  const [replyToId, setReplyToId] = useState<string | undefined>();
  
  // Fetch comments for this post
  const {
    comments,
    loading: commentsLoading,
    error: commentsError,
    createComment,
  } = useComments(post?.id || '');
  
  // Fetch related posts (same type, different slug)
  const { data: relatedPostsData } = useContentList({
    type: 'post',
    status: 'published',
    limit: 3,
  });

  const relatedPosts = relatedPostsData?.items.filter(
    (p: Content) => p.slug !== slug
  ).slice(0, 3);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Post Not Found</h1>
          <p className="text-gray-600 mb-8">The post you're looking for doesn't exist.</p>
          <Link
            to="/blog"
            className="text-blue-600 hover:text-blue-700 font-semibold"
          >
            ← Back to Blog
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{post.metadata?.seo_title || post.title}</title>
        <meta
          name="description"
          content={post.metadata?.seo_description || post.excerpt}
        />
        {post.metadata?.tags && (
          <meta name="keywords" content={post.metadata.tags.join(', ')} />
        )}
        <meta property="og:title" content={post.title} />
        <meta property="og:description" content={post.excerpt} />
        {post.featured_image && (
          <meta property="og:image" content={post.featured_image} />
        )}
        <meta property="og:type" content="article" />
      </Helmet>

      <article className="bg-white min-h-screen">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Back to Blog */}
          <Link
            to="/blog"
            className="text-blue-600 hover:text-blue-700 font-medium mb-8 inline-block"
          >
            ← Back to Blog
          </Link>

          {/* Post Header */}
          <header className="mb-8">
            {post.metadata?.categories && post.metadata.categories.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {post.metadata.categories.map((category: string) => (
                  <span
                    key={category}
                    className="text-sm px-3 py-1 bg-blue-100 text-blue-700 rounded"
                  >
                    {category}
                  </span>
                ))}
              </div>
            )}
            
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              {post.title}
            </h1>
            
            <div className="flex items-center text-gray-600 text-sm">
              <span>By {post.author_name || 'Unknown Author'}</span>
              <span className="mx-2">•</span>
              {post.published_at && (
                <time dateTime={new Date(post.published_at * 1000).toISOString()}>
                  {new Date(post.published_at * 1000).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </time>
              )}
            </div>

            {post.metadata?.tags && post.metadata.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4">
                {post.metadata.tags.map((tag: string) => (
                  <span
                    key={tag}
                    className="text-sm text-gray-500"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </header>

          {/* Featured Image */}
          {post.featured_image && (
            <img
              src={post.featured_image}
              alt={post.title}
              className="w-full rounded-lg mb-8 shadow-lg"
            />
          )}

          {/* Post Content */}
          <div
            className="prose prose-lg max-w-none mb-12"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />

          {/* Related Posts */}
          {relatedPosts && relatedPosts.length > 0 && (
            <section className="border-t border-gray-200 pt-12 mt-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                Related Posts
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {relatedPosts.map((relatedPost: Content) => (
                  <Link
                    key={relatedPost.id}
                    to={`/blog/${relatedPost.slug}`}
                    className="group"
                  >
                    {relatedPost.featured_image && (
                      <img
                        src={relatedPost.featured_image}
                        alt={relatedPost.title}
                        className="w-full h-40 object-cover rounded-lg mb-3 group-hover:opacity-90 transition"
                      />
                    )}
                    <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition">
                      {relatedPost.title}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                      {relatedPost.excerpt}
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Comments Section */}
          {settings?.comments_enabled && (
            <section className="border-t border-gray-200 pt-12 mt-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                Comments
              </h2>

              {/* Comment Form */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Leave a Comment
                </h3>
                <CommentForm
                  onSubmit={createComment}
                  parentId={replyToId}
                  onCancel={replyToId ? () => setReplyToId(undefined) : undefined}
                  captchaEnabled={settings?.captcha_enabled || false}
                />
              </div>

              {/* Comments List */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  {comments.length} {comments.length === 1 ? 'Comment' : 'Comments'}
                </h3>
                
                {commentsLoading && (
                  <div className="flex justify-center py-8">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                )}

                {commentsError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                    {commentsError}
                  </div>
                )}

                {!commentsLoading && !commentsError && (
                  <CommentList
                    comments={comments}
                    onReply={(commentId) => setReplyToId(commentId)}
                  />
                )}
              </div>
            </section>
          )}
        </div>
      </article>
    </>
  );
};
