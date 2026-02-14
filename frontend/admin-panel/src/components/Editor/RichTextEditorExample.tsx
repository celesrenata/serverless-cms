import { useState } from 'react';
import { RichTextEditor } from './RichTextEditor';
import { MediaPicker } from './MediaPicker';
import { Media } from '../../types/media';

/**
 * Example component demonstrating how to use the RichTextEditor with MediaPicker
 * 
 * Usage in a form:
 * 
 * ```tsx
 * const [content, setContent] = useState('');
 * const [isMediaPickerOpen, setIsMediaPickerOpen] = useState(false);
 * 
 * <RichTextEditor
 *   content={content}
 *   onChange={setContent}
 *   onMediaInsert={() => setIsMediaPickerOpen(true)}
 * />
 * 
 * <MediaPicker
 *   isOpen={isMediaPickerOpen}
 *   onClose={() => setIsMediaPickerOpen(false)}
 *   onSelect={(media) => {
 *     // Insert image into editor
 *     // You'll need to get the editor instance to do this
 *   }}
 * />
 * ```
 */
export const RichTextEditorExample: React.FC = () => {
  const [content, setContent] = useState('<p>Start typing here...</p>');
  const [isMediaPickerOpen, setIsMediaPickerOpen] = useState(false);

  const handleMediaSelect = (media: Media) => {
    // In a real implementation, you would insert the image into the editor
    // This requires access to the editor instance
    console.log('Selected media:', media);
    alert(`Selected: ${media.filename}`);
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Rich Text Editor Example</h1>
      
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Content
        </label>
        <RichTextEditor
          content={content}
          onChange={setContent}
          onMediaInsert={() => setIsMediaPickerOpen(true)}
        />
      </div>

      <div className="mb-4">
        <h2 className="text-lg font-semibold mb-2">Preview</h2>
        <div 
          className="prose max-w-none p-4 border border-gray-300 rounded-lg bg-gray-50"
          dangerouslySetInnerHTML={{ __html: content }}
        />
      </div>

      <div className="mb-4">
        <h2 className="text-lg font-semibold mb-2">HTML Output</h2>
        <pre className="p-4 bg-gray-900 text-gray-100 rounded-lg overflow-x-auto text-sm">
          {content}
        </pre>
      </div>

      <MediaPicker
        isOpen={isMediaPickerOpen}
        onClose={() => setIsMediaPickerOpen(false)}
        onSelect={handleMediaSelect}
      />
    </div>
  );
};
