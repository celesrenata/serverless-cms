# Rich Text Editor Components

This directory contains the Rich Text Editor implementation using TipTap for the Serverless CMS Admin Panel.

## Components

### RichTextEditor

The core editor component with formatting toolbar.

**Features:**
- Bold, italic, strikethrough, inline code
- Headings (H1, H2, H3)
- Bullet and numbered lists
- Code blocks
- Blockquotes
- Links
- Images
- Horizontal rules
- Undo/redo

**Props:**
- `content: string` - HTML content to display in the editor
- `onChange: (content: string) => void` - Callback when content changes
- `onMediaInsert: () => void` - Callback when user clicks the image button
- `onEditorReady?: (editor: Editor) => void` - Optional callback when editor is initialized

**Example:**
```tsx
import { RichTextEditor } from './components/Editor';

const [content, setContent] = useState('<p>Hello world</p>');

<RichTextEditor
  content={content}
  onChange={setContent}
  onMediaInsert={() => console.log('Insert media')}
/>
```

### EditorToolbar

The formatting toolbar for the editor. This is used internally by RichTextEditor.

### MediaPicker

A modal component for selecting media from the media library.

**Props:**
- `isOpen: boolean` - Whether the modal is open
- `onClose: () => void` - Callback to close the modal
- `onSelect: (media: Media) => void` - Callback when media is selected

**Example:**
```tsx
import { MediaPicker } from './components/Editor';

const [isOpen, setIsOpen] = useState(false);

<MediaPicker
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  onSelect={(media) => {
    console.log('Selected:', media);
    setIsOpen(false);
  }}
/>
```

### RichTextEditorWithMedia

A convenience component that combines RichTextEditor and MediaPicker with automatic image insertion.

**Props:**
- `content: string` - HTML content to display in the editor
- `onChange: (content: string) => void` - Callback when content changes

**Example:**
```tsx
import { RichTextEditorWithMedia } from './components/Editor';

const [content, setContent] = useState('<p>Hello world</p>');

<RichTextEditorWithMedia
  content={content}
  onChange={setContent}
/>
```

This is the recommended component to use as it handles all the media picker integration automatically.

## Usage in Content Editor

Here's how to integrate the editor into a content editing form:

```tsx
import { useState } from 'react';
import { RichTextEditorWithMedia } from './components/Editor';
import { useContent } from './hooks/useContent';

export const ContentEditor: React.FC = () => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const { create } = useContent();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await create({
      title,
      content,
      type: 'post',
      status: 'draft',
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="input-field"
        />
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Content</label>
        <RichTextEditorWithMedia
          content={content}
          onChange={setContent}
        />
      </div>

      <button type="submit" className="btn-primary">
        Save Draft
      </button>
    </form>
  );
};
```

## Keyboard Shortcuts

- **Ctrl+B** / **Cmd+B** - Bold
- **Ctrl+I** / **Cmd+I** - Italic
- **Ctrl+Z** / **Cmd+Z** - Undo
- **Ctrl+Shift+Z** / **Cmd+Shift+Z** - Redo
- **Ctrl+K** / **Cmd+K** - Insert link (when link button is clicked)

## Styling

The editor uses Tailwind CSS for styling. Custom styles are defined in `src/index.css` under the `.ProseMirror` class.

## Extensions

The editor uses the following TipTap extensions:

- **StarterKit** - Basic formatting (bold, italic, headings, lists, etc.)
- **Image** - Image insertion and display
- **CodeBlock** - Code block formatting
- **Link** - Link insertion and editing

## Requirements Satisfied

This implementation satisfies the following requirements from the spec:

- **8.1** - Rich text editing interface in Admin Panel
- **8.2** - Store formatted content as HTML
- **8.3** - Embed media files (S3 URLs) in content
- **8.4** - Support text formatting (bold, italic, headings, lists, links)
- **8.5** - Preserve formatting in stored representation
