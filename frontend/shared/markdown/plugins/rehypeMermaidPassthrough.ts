import type { Plugin } from 'unified';
import type { Element, Root, Text } from 'hast';
import { visit } from 'unist-util-visit';
import { isElement } from 'hast-util-is-element';
import { toString } from 'hast-util-to-string';

function getClassList(element: Element): string[] {
  const className = element.properties?.className;

  if (Array.isArray(className)) {
    return className.map(String).filter(Boolean);
  }

  if (typeof className === 'string') {
    return className.split(/\s+/).filter(Boolean);
  }

  return [];
}

function hasClass(element: Element, className: string): boolean {
  return getClassList(element).includes(className);
}

function findCodeChild(pre: Element): Element | undefined {
  return pre.children.find((child): child is Element =>
    isElement(child, 'code'),
  );
}

/**
 * Rehype plugin: skip mermaid code blocks from Prism highlighting.
 *
 * This plugin runs AFTER rehype-prism-plus and strips any syntax highlighting
 * that Prism may have applied to mermaid code blocks, restoring the original
 * code content as plain text. It also adds data-language="mermaid" and ensures
 * the appropriate classes exist for the frontend MermaidRenderer.
 */
const rehypeMermaidPassthrough: Plugin<[], Root> =
  function rehypeMermaidPassthrough() {
    return function transformer(tree: Root): void {
      visit(tree, 'element', (node) => {
        if (!isElement(node, 'pre')) {
          return;
        }

        const code = findCodeChild(node);

        if (!code) {
          return;
        }

        const isMermaid =
          hasClass(code, 'language-mermaid') ||
          hasClass(node, 'language-mermaid');

        if (!isMermaid) {
          return;
        }

        // Extract the raw text content (strips Prism span wrappers)
        const rawContent = toString(code);

        // Replace code children with plain text node
        const textNode: Text = {
          type: 'text',
          value: rawContent,
        };
        code.children = [textNode];

        // Set proper classes and attributes
        node.properties = node.properties ?? {};
        node.properties.dataLanguage = 'mermaid';
        node.properties.className = ['language-mermaid'];

        code.properties = code.properties ?? {};
        code.properties.className = ['language-mermaid'];
      });
    };
  };

export { rehypeMermaidPassthrough };
export default rehypeMermaidPassthrough;
