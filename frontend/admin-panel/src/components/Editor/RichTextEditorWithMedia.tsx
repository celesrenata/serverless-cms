import { useState, useRef } from 'react';
import { Editor } from '@tiptap/react';
import { RichTextEditor } from './RichTextEditor';
import { MediaPicker } from './MediaPicker';
import { Media } from '../../types/media';

interface RichTextEditorWithMediaProps {
  content: string;
  onChange: (content: string) => void;
}

/**
 * RichTextEditor with integrated MediaPicker functionality
 * This component handles the media picker state and image insertion automatically
 */
export const RichTextEditorWithMedia: React.FC<RichTextEditorWithMediaProps> = ({
  content,
  onChange,
}) => {
  const [isMediaPickerOpen, setIsMediaPickerOpen] = useState(false);
  const editorRef = useRef<Editor | null>(null);

  const handleEditorReady = (editor: Editor) => {
    editorRef.current = editor;
  };

  const handleMediaInsert = () => {
    setIsMediaPickerOpen(true);
  };

  const handleMediaSelect = (media: Media) => {
    if (editorRef.current) {
      // Use the large thumbnail or original URL
      const imageUrl = media.thumbnails?.large || media.s3_url;
      
      // Insert image at current cursor position
      editorRef.current.chain().focus().setImage({ 
        src: imageUrl,
        alt: media.metadata.alt_text || media.filename,
        title: media.metadata.caption || media.filename,
      }).run();
    }
    setIsMediaPickerOpen(false);
  };

  return (
    <>
      <RichTextEditor
        content={content}
        onChange={onChange}
        onMediaInsert={handleMediaInsert}
        onEditorReady={handleEditorReady}
      />
      
      <MediaPicker
        isOpen={isMediaPickerOpen}
        onClose={() => setIsMediaPickerOpen(false)}
        onSelect={handleMediaSelect}
      />
    </>
  );
};
