import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useContent } from '../hooks/useContent';
import { RichTextEditor } from '../components/Editor/RichTextEditor';
import { MediaPicker } from '../components/Editor/MediaPicker';
import { ContentType, ContentStatus, ContentCreate, ContentUpdate } from '../types/content';
import { Media } from '../types/media';
import { Editor } from '@tiptap/react';

export const ContentEditor: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditMode = !!id;

  const { content, isLoading, create, update, isCreating, isUpdating } = useContent(id);

  // Form state
  const [type, setType] = useState<ContentType>('post');
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [contentBody, setContentBody] = useState('');
  const [status, setStatus] = useState<ContentStatus>('draft');
  const [featuredImage, setFeaturedImage] = useState('');
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [scheduledAt, setScheduledAt] = useState<string>('');
  const [tagInput, setTagInput] = useState('');
  const [categoryInput, setCategoryInput] = useState('');

  // UI state
  const [isMediaPickerOpen, setIsMediaPickerOpen] = useState(false);
  const [mediaPickerMode, setMediaPickerMode] = useState<'featured' | 'content'>('content');
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load content data in edit mode
  useEffect(() => {
    if (content) {
      setType(content.type);
      setTitle(content.title);
      setSlug(content.slug);
      setExcerpt(content.excerpt || '');
      setContentBody(content.content);
      setStatus(content.status);
      setFeaturedImage(content.featured_image || '');
      setSeoTitle(content.metadata?.seo_title || '');
      setSeoDescription(content.metadata?.seo_description || '');
      setTags(content.metadata?.tags || []);
      setCategories(content.metadata?.categories || []);
      if (content.scheduled_at) {
        setScheduledAt(new Date(content.scheduled_at * 1000).toISOString().slice(0, 16));
      }
    }
  }, [content]);

  // Auto-generate slug from title
  useEffect(() => {
    if (!isEditMode && title && !slug) {
      const generatedSlug = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      setSlug(generatedSlug);
    }
  }, [title, slug, isEditMode]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (!slug.trim()) {
      newErrors.slug = 'Slug is required';
    }

    if (!contentBody.trim()) {
      newErrors.content = 'Content is required';
    }

    if (seoTitle && seoTitle.length > 60) {
      newErrors.seoTitle = 'SEO title must be 60 characters or less';
    }

    if (seoDescription && seoDescription.length > 160) {
      newErrors.seoDescription = 'SEO description must be 160 characters or less';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async (saveStatus?: ContentStatus) => {
    if (!validateForm()) {
      return;
    }

    const finalStatus = saveStatus || status;
    const scheduledTimestamp = scheduledAt ? Math.floor(new Date(scheduledAt).getTime() / 1000) : undefined;

    const data: ContentCreate | ContentUpdate = {
      type,
      title,
      slug,
      excerpt,
      content: contentBody,
      status: finalStatus,
      featured_image: featuredImage || undefined,
      metadata: {
        seo_title: seoTitle || undefined,
        seo_description: seoDescription || undefined,
        tags: tags.length > 0 ? tags : undefined,
        categories: categories.length > 0 ? categories : undefined,
      },
      scheduled_at: scheduledTimestamp,
    };

    try {
      if (isEditMode && id) {
        await update({ id, data });
        alert('Content updated successfully!');
      } else {
        const newContent = await create(data as ContentCreate);
        alert('Content created successfully!');
        navigate(`/content/edit/${newContent.id}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`Error saving content: ${errorMessage}`);
    }
  };

  const handleMediaSelect = (media: Media) => {
    if (mediaPickerMode === 'featured') {
      setFeaturedImage(media.s3_url);
    } else if (mediaPickerMode === 'content' && editor) {
      editor.chain().focus().setImage({ src: media.s3_url }).run();
    }
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };

  const handleAddCategory = () => {
    if (categoryInput.trim() && !categories.includes(categoryInput.trim())) {
      setCategories([...categories, categoryInput.trim()]);
      setCategoryInput('');
    }
  };

  const handleRemoveCategory = (category: string) => {
    setCategories(categories.filter(c => c !== category));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (isPreviewMode) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold">Preview Mode</h1>
          <button
            onClick={() => setIsPreviewMode(false)}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            Exit Preview
          </button>
        </div>
        <div className="max-w-4xl mx-auto px-4 py-8">
          <article>
            {featuredImage && (
              <img
                src={featuredImage}
                alt={title}
                className="w-full rounded-lg mb-8"
              />
            )}
            <header className="mb-8">
              <h1 className="text-4xl font-bold mb-4">{title}</h1>
              {excerpt && <p className="text-xl text-gray-600">{excerpt}</p>}
              <div className="flex gap-2 mt-4">
                {tags.map(tag => (
                  <span key={tag} className="px-3 py-1 bg-gray-200 rounded text-sm">
                    {tag}
                  </span>
                ))}
              </div>
            </header>
            <div
              className="prose prose-lg max-w-none"
              dangerouslySetInnerHTML={{ __html: contentBody }}
            />
          </article>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {isEditMode ? 'Edit Content' : 'Create New Content'}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {isEditMode ? `Editing: ${content?.title}` : 'Fill in the details below'}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => navigate('/content')}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              onClick={() => setIsPreviewMode(true)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Preview
            </button>
            <button
              onClick={() => handleSave('draft')}
              disabled={isCreating || isUpdating}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50"
            >
              Save Draft
            </button>
            <button
              onClick={() => handleSave('published')}
              disabled={isCreating || isUpdating}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {isCreating || isUpdating ? 'Saving...' : 'Publish'}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content Area */}
          <div className="lg:col-span-2 space-y-6">
            {/* Type Selector */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Content Type
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as ContentType)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="post">Post</option>
                <option value="page">Page</option>
                <option value="gallery">Gallery</option>
                <option value="project">Project</option>
              </select>
            </div>

            {/* Title */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter title..."
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.title ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.title && (
                <p className="text-red-500 text-sm mt-1">{errors.title}</p>
              )}
            </div>

            {/* Slug */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Slug *
              </label>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="url-friendly-slug"
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.slug ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.slug && (
                <p className="text-red-500 text-sm mt-1">{errors.slug}</p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                URL: /content/{slug || 'your-slug'}
              </p>
            </div>

            {/* Excerpt */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Excerpt
              </label>
              <textarea
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value)}
                placeholder="Brief summary..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Content Editor */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Content *
              </label>
              <RichTextEditor
                content={contentBody}
                onChange={setContentBody}
                onMediaInsert={() => {
                  setMediaPickerMode('content');
                  setIsMediaPickerOpen(true);
                }}
                onEditorReady={setEditor}
              />
              {errors.content && (
                <p className="text-red-500 text-sm mt-1">{errors.content}</p>
              )}
            </div>

            {/* SEO Metadata */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">SEO Metadata</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    SEO Title ({seoTitle.length}/60)
                  </label>
                  <input
                    type="text"
                    value={seoTitle}
                    onChange={(e) => setSeoTitle(e.target.value)}
                    placeholder="Leave empty to use content title"
                    maxLength={60}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.seoTitle ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.seoTitle && (
                    <p className="text-red-500 text-sm mt-1">{errors.seoTitle}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    SEO Description ({seoDescription.length}/160)
                  </label>
                  <textarea
                    value={seoDescription}
                    onChange={(e) => setSeoDescription(e.target.value)}
                    placeholder="Leave empty to use excerpt"
                    rows={3}
                    maxLength={160}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.seoDescription ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.seoDescription && (
                    <p className="text-red-500 text-sm mt-1">{errors.seoDescription}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Status */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Status</h3>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ContentStatus)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            </div>

            {/* Scheduled Publishing */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Scheduled Publishing
              </h3>
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-2">
                Leave empty for immediate publishing
              </p>
            </div>

            {/* Featured Image */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Featured Image
              </h3>
              {featuredImage ? (
                <div className="space-y-2">
                  <img
                    src={featuredImage}
                    alt="Featured"
                    className="w-full rounded-lg"
                  />
                  <button
                    onClick={() => setFeaturedImage('')}
                    className="w-full px-3 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100"
                  >
                    Remove Image
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setMediaPickerMode('featured');
                    setIsMediaPickerOpen(true);
                  }}
                  className="w-full px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Select Image
                </button>
              )}
            </div>

            {/* Categories */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Categories</h3>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={categoryInput}
                  onChange={(e) => setCategoryInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCategory())}
                  placeholder="Add category..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleAddCategory}
                  className="px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                >
                  Add
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {categories.map(category => (
                  <span
                    key={category}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 rounded-full text-sm"
                  >
                    {category}
                    <button
                      onClick={() => handleRemoveCategory(category)}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Tags */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Tags</h3>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                  placeholder="Add tag..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleAddTag}
                  className="px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                >
                  Add
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {tags.map(tag => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 rounded-full text-sm"
                  >
                    {tag}
                    <button
                      onClick={() => handleRemoveTag(tag)}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Media Picker Modal */}
      <MediaPicker
        isOpen={isMediaPickerOpen}
        onClose={() => setIsMediaPickerOpen(false)}
        onSelect={handleMediaSelect}
      />
    </div>
  );
};
