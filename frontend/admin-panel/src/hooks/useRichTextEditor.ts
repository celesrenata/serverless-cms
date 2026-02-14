import { useState } from 'react';
import { Editor } from '@tiptap/react';
import { Media } from '../types/media';

interface UseRichTextEditorProps {
  initialContent?: string;
  onContentChange?: (content: string) => void;
}

export const useRichTextEditor = ({ 
  initialContent = '', 
  onContentChange 
}: UseRichTextEditorProps = {}) => {
  const [content, setContent] = useState(initialContent);
  const [isMediaPickerOpen, setIsMediaPickerOpen] = useState(false);
  const [editorInstance, setEditorInstance] = useState<Editor | null>(null);

  const handleContentChange = (newContent: string) => {
    setContent(newContent);
    onContentChange?.(newContent);
  };

  const openMediaPicker = () => {
    setIsMediaPickerOpen(true);
  };

  const closeMediaPicker = () => {
    setIsMediaPickerOpen(false);
  };

  const handleMediaSelect = (media: Media) => {
    if (editorInstance) {
      // Insert image at current cursor position
      const imageUrl = media.thumbnails?.large || media.s3_url;
      editorInstance.chain().focus().setImage({ 
        src: imageUrl,
        alt: media.metadata.alt_text || media.filename 
      }).run();
    }
    closeMediaPicker();
  };

  const setEditor = (editor: Editor | null) => {
    setEditorInstance(editor);
  };

  return {
    content,
    setContent: handleContentChange,
    isMediaPickerOpen,
    openMediaPicker,
    closeMediaPicker,
    handleMediaSelect,
    setEditor,
  };
};
