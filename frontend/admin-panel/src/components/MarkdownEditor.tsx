import { useRef, useEffect, useState } from 'react';
import { EditorView, placeholder as cmPlaceholder } from '@codemirror/view';
import { EditorState, Transaction } from '@codemirror/state';
import { markdown } from '@codemirror/lang-markdown';
import { syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language';
import { MarkdownPreview } from './MarkdownPreview';
import { MediaPickerDialog } from './Editor/MediaPickerDialog';
import type { Media } from '../types/media';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
  className?: string;
  placeholder?: string;
  showPreview?: boolean;
}

const DEFAULT_MAX_LENGTH = 500000;

const editorTheme = EditorView.theme({
  '&': {
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
    fontSize: '14px',
    minHeight: '400px',
  },
  '.cm-content': {
    minHeight: '400px',
    padding: '16px',
  },
  '.cm-scroller': {
    overflow: 'auto',
  },
  '&.cm-focused': {
    outline: 'none',
  },
});

export const MarkdownEditor: React.FC<MarkdownEditorProps> = ({
  value,
  onChange,
  maxLength = DEFAULT_MAX_LENGTH,
  className = '',
  placeholder = 'Write your markdown here...',
  showPreview = false,
}) => {
  const [previewVisible, setPreviewVisible] = useState(showPreview);
  const [mediaDialogOpen, setMediaDialogOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const isInternalUpdate = useRef(false);
  const [charCount, setCharCount] = useState(value.length);

  useEffect(() => {
    if (!containerRef.current) return;

    const maxLen = maxLength;

    const transactionFilter = EditorState.transactionFilter.of((tr: Transaction) => {
      if (!tr.docChanged) return tr;
      const newLength = tr.newDoc.length;
      if (newLength > maxLen) {
        return [];
      }
      return tr;
    });

    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        isInternalUpdate.current = true;
        const doc = update.state.doc.toString();
        setCharCount(doc.length);
        onChange(doc);
      }
    });

    const extensions = [
      markdown(),
      syntaxHighlighting(defaultHighlightStyle),
      editorTheme,
      transactionFilter,
      updateListener,
      EditorView.lineWrapping,
    ];

    if (placeholder) {
      extensions.push(cmPlaceholder(placeholder));
    }

    const state = EditorState.create({
      doc: value,
      extensions,
    });

    const view = new EditorView({
      state,
      parent: containerRef.current,
    });

    viewRef.current = view;
    setCharCount(value.length);

    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync external value changes into the editor
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;

    if (isInternalUpdate.current) {
      isInternalUpdate.current = false;
      return;
    }

    const currentDoc = view.state.doc.toString();
    if (currentDoc !== value) {
      view.dispatch({
        changes: {
          from: 0,
          to: currentDoc.length,
          insert: value,
        },
      });
      setCharCount(value.length);
    }
  }, [value]);

  const handleMediaSelect = (media: Media) => {
    setMediaDialogOpen(false);
    const view = viewRef.current;
    if (!view) return;
    const pos = view.state.selection.main.head;
    const alt = media.metadata?.alt_text || media.filename;
    const insertText = `\n![${alt}](${media.s3_url})\n`;
    view.dispatch({ changes: { from: pos, insert: insertText } });
  };

  const handleGalleryInsert = (directive: string) => {
    setMediaDialogOpen(false);
    const view = viewRef.current;
    if (!view) return;
    const pos = view.state.selection.main.head;
    view.dispatch({ changes: { from: pos, insert: `\n${directive}\n` } });
  };

  const isOverLimit = charCount > maxLength;
  const isNearLimit = charCount > maxLength * 0.9;

  return (
    <div className={`border border-gray-300 rounded-lg overflow-hidden bg-white ${className}`}>
      {/* Preview toggle bar */}
      <div className="flex items-center justify-end px-4 py-2 border-b border-gray-200 bg-gray-50 gap-2">
        <button
          type="button"
          onClick={() => setMediaDialogOpen(true)}
          className="px-3 py-1 text-xs font-medium rounded bg-gray-200 text-gray-700 hover:bg-gray-300"
        >
          🖼️ Media
        </button>
        <button
          type="button"
          onClick={() => setPreviewVisible(!previewVisible)}
          className={`px-3 py-1 text-xs font-medium rounded ${
            previewVisible
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          {previewVisible ? 'Hide Preview' : 'Show Preview'}
        </button>
      </div>

      <div className={previewVisible ? 'grid grid-cols-2 divide-x divide-gray-200' : ''}>
        {/* Editor pane */}
        <div className={previewVisible ? 'min-h-[400px]' : ''}>
          <div ref={containerRef} />
        </div>

        {/* Preview pane */}
        {previewVisible && (
          <div className="p-4 overflow-auto max-h-[600px] min-h-[400px] bg-white">
            <MarkdownPreview markdown={value} />
          </div>
        )}
      </div>

      <div className="flex justify-end px-4 py-2 border-t border-gray-200 bg-gray-50 text-sm">
        <span
          className={
            isOverLimit
              ? 'text-red-600 font-medium'
              : isNearLimit
                ? 'text-amber-600'
                : 'text-gray-500'
          }
        >
          {charCount.toLocaleString()} / {maxLength.toLocaleString()}
        </span>
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
