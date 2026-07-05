vi.mock('prismjs', () => ({
  default: {
    highlightAll: vi.fn(),
  },
}));

vi.mock('prismjs/themes/prism-tomorrow.css', () => ({}));
vi.mock('prismjs/plugins/line-numbers/prism-line-numbers.css', () => ({}));
vi.mock('prismjs/components/prism-clike', () => ({}));
vi.mock('prismjs/components/prism-c', () => ({}));
vi.mock('prismjs/components/prism-cpp', () => ({}));
vi.mock('prismjs/components/prism-java', () => ({}));
vi.mock('prismjs/components/prism-csharp', () => ({}));
vi.mock('prismjs/components/prism-php', () => ({}));
vi.mock('prismjs/components/prism-javascript', () => ({}));
vi.mock('prismjs/components/prism-typescript', () => ({}));
vi.mock('prismjs/components/prism-python', () => ({}));
vi.mock('prismjs/components/prism-go', () => ({}));
vi.mock('prismjs/components/prism-rust', () => ({}));
vi.mock('prismjs/components/prism-ruby', () => ({}));
vi.mock('prismjs/plugins/line-numbers/prism-line-numbers', () => ({}));

import { screen, waitFor } from '@testing-library/react';
import Prism from 'prismjs';
import { renderWithProviders } from '../../test/utils/renderWithProviders';
import { CodeBlock } from '../CodeBlock';

describe('CodeBlock', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders source code content and displays the language label', async () => {
    const code = 'const greeting = "hello";';
    const language = 'typescript';

    const { container } = renderWithProviders(
      <CodeBlock code={code} language={language} />
    );

    // Language label is shown in the header
    expect(screen.getByText(language)).toBeInTheDocument();

    // Code content is rendered inside the code element
    const codeElement = container.querySelector('code');
    expect(codeElement).toBeInTheDocument();
    expect(codeElement).toHaveTextContent(code);

    await waitFor(() => {
      expect(Prism.highlightAll).toHaveBeenCalled();
    });
  });

  it('applies the correct language class to the code element', async () => {
    const { container } = renderWithProviders(
      <CodeBlock code="print('hi')" language="python" />
    );

    const codeElement = container.querySelector('code');
    expect(codeElement).toHaveClass('language-python');

    await waitFor(() => {
      expect(Prism.highlightAll).toHaveBeenCalled();
    });
  });

  it('applies the line-numbers class to pre element by default', async () => {
    const { container } = renderWithProviders(
      <CodeBlock code="console.log('hello');" language="javascript" />
    );

    const preElement = container.querySelector('pre');
    expect(preElement).toBeInTheDocument();
    expect(preElement).toHaveClass('line-numbers');

    await waitFor(() => {
      expect(Prism.highlightAll).toHaveBeenCalled();
    });
  });

  it('does not apply line-numbers class when showLineNumbers is false', async () => {
    const { container } = renderWithProviders(
      <CodeBlock code="fmt.Println()" language="go" showLineNumbers={false} />
    );

    const preElement = container.querySelector('pre');
    expect(preElement).toBeInTheDocument();
    expect(preElement).not.toHaveClass('line-numbers');

    await waitFor(() => {
      expect(Prism.highlightAll).toHaveBeenCalled();
    });
  });

  it('escapes HTML special characters in code', async () => {
    const code = '<div class="test">Hello & World</div>';

    const { container } = renderWithProviders(
      <CodeBlock code={code} language="html" showLineNumbers={false} />
    );

    const codeElement = container.querySelector('code');
    expect(codeElement).toBeInTheDocument();
    // The escaped HTML entities are rendered as text content by React
    // so textContent will show the escaped form
    expect(codeElement!.textContent).toContain('&lt;div');
    expect(codeElement!.textContent).toContain('&amp;');

    await waitFor(() => {
      expect(Prism.highlightAll).toHaveBeenCalled();
    });
  });
});
