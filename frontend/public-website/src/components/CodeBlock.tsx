import { useEffect } from 'react';
import Prism from 'prismjs';
import 'prismjs/themes/prism-tomorrow.css';
import 'prismjs/components/prism-clike'; // Base for many languages
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-java';
import 'prismjs/components/prism-csharp';
import 'prismjs/components/prism-cpp';
import 'prismjs/components/prism-go';
import 'prismjs/components/prism-rust';
import 'prismjs/components/prism-ruby';
import 'prismjs/components/prism-php';
import 'prismjs/plugins/line-numbers/prism-line-numbers';
import 'prismjs/plugins/line-numbers/prism-line-numbers.css';

interface CodeBlockProps {
  code: string;
  language: string;
  showLineNumbers?: boolean;
}

export const CodeBlock = ({
  code,
  language,
  showLineNumbers = true,
}: CodeBlockProps) => {
  useEffect(() => {
    Prism.highlightAll();
  }, [code, language]);

  // Escape HTML to prevent code execution
  const escapeHtml = (text: string) => {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  };

  const escapedCode = escapeHtml(code);
  const lineNumberClass = showLineNumbers ? 'line-numbers' : '';

  return (
    <div className="my-4 rounded-lg overflow-hidden shadow-sm">
      <div className="bg-gray-800 px-4 py-2 text-sm text-gray-300 font-mono">
        {language}
      </div>
      <pre className={`${lineNumberClass} !m-0`}>
        <code className={`language-${language}`}>{escapedCode}</code>
      </pre>
    </div>
  );
};
