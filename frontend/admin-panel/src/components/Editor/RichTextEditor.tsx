import { useEditor, EditorContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import CodeBlock from '@tiptap/extension-code-block';
import Link from '@tiptap/extension-link';
import { useEffect, useState } from 'react';
import { EditorToolbar } from './EditorToolbar';
import { MediaPickerDialog } from './MediaPickerDialog';
import type { Media } from '../../types/media';

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  onMediaInsert: () => void;
  onEditorReady?: (editor: Editor) => void;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  content,
  onChange,
  onMediaInsert: _onMediaInsert,
  onEditorReady
}) => {
  const [mediaDialogOpen, setMediaDialogOpen] = useState(false);
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false, // We'll use the separate CodeBlock extension
      }),
      Image.configure({
        inline: true,
        allowBase64: false,
        HTMLAttributes: {
          class: 'editor-image',
        },
      }),
      CodeBlock.configure({
        HTMLAttributes: {
          class: 'code-block',
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-600 underline',
        },
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-xl max-w-none focus:outline-none min-h-[400px] p-4',
      },
    },
  });

  // Update editor content when prop changes (for external updates)
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  // Notify parent when editor is ready
  useEffect(() => {
    if (editor && onEditorReady) {
      onEditorReady(editor);
    }
  }, [editor, onEditorReady]);

  if (!editor) {
    return <div>Loading editor...</div>;
  }

  const handleMediaSelect = (media: Media) => {
    if (editor) {
      editor.chain().focus().setImage({ src: media.s3_url, alt: media.metadata?.alt_text || media.filename }).run();
    }
  };

  const handleGalleryInsert = (directive: string) => {
    if (editor) {
      editor.chain().focus().insertContent(`<p>${directive}</p>`).run();
    }
  };

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden bg-white">
      <EditorToolbar editor={editor} onMediaInsert={() => setMediaDialogOpen(true)} onGalleryInsert={() => setMediaDialogOpen(true)} />
      <div className="border-t border-gray-300">
        <EditorContent editor={editor} />
      </div>
      <MediaPickerDialog
        isOpen={mediaDialogOpen}
        onClose={() => setMediaDialogOpen(false)}
        onSelectMedia={handleMediaSelect}
        onInsertGallery={handleGalleryInsert}
      />
    </div>
  );
};
