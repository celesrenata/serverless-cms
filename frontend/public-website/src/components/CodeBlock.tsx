import { useEffect, useState } from 'react';
import Prism from 'prismjs';
import 'prismjs/themes/prism-tomorrow.css';
import 'prismjs/plugins/line-numbers/prism-line-numbers.css';

interface CodeBlockProps {
  code: string;
  language: string;
  showLineNumbers?: boolean;
}

// Load Prism languages dynamically in correct dependency order
const loadPrismLanguages = async () => {
  // Core language (no dependencies)
  // @ts-expect-error - Prism component imports are side-effect only
  await import('prismjs/components/prism-clike');
  
  // Languages that depend on clike
  // @ts-expect-error - Prism component imports are side-effect only
  await import('prismjs/components/prism-c');
  // @ts-expect-error - Prism component imports are side-effect only
  await import('prismjs/components/prism-cpp');
  // @ts-expect-error - Prism component imports are side-effect only
  await import('prismjs/components/prism-java');
  // @ts-expect-error - Prism component imports are side-effect only
  await import('prismjs/components/prism-csharp');
  // @ts-expect-error - Prism component imports are side-effect only
  await import('prismjs/components/prism-php');
  
  // JavaScript (depends on clike)
  // @ts-expect-error - Prism component imports are side-effect only
  await import('prismjs/components/prism-javascript');
  
  // TypeScript (depends on javascript)
  // @ts-expect-error - Prism component imports are side-effect only
  await import('prismjs/components/prism-typescript');
  
  // Independent languages
  // @ts-expect-error - Prism component imports are side-effect only
  await import('prismjs/components/prism-python');
  // @ts-expect-error - Prism component imports are side-effect only
  await import('prismjs/components/prism-go');
  // @ts-expect-error - Prism component imports are side-effect only
  await import('prismjs/components/prism-rust');
  // @ts-expect-error - Prism component imports are side-effect only
  await import('prismjs/components/prism-ruby');
  
  // Plugins
  // @ts-expect-error - Prism component imports are side-effect only
  await import('prismjs/plugins/line-numbers/prism-line-numbers');
};

export const CodeBlock = ({
  code,
  language,
  showLineNumbers = true,
}: CodeBlockProps) => {
  const [languagesLoaded, setLanguagesLoaded] = useState(false);

  useEffect(() => {
    loadPrismLanguages().then(() => {
      setLanguagesLoaded(true);
      Prism.highlightAll();
    });
  }, []);

  useEffect(() => {
    if (languagesLoaded) {
      Prism.highlightAll();
    }
  }, [code, language, languagesLoaded]);

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
