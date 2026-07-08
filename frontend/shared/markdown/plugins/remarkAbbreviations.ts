import type { Plugin } from 'unified';
import type { Paragraph, PhrasingContent, Root, Text } from 'mdast';
import type { Node, Parent } from 'unist';
import { findAndReplace } from 'mdast-util-find-and-replace';
import { toString } from 'mdast-util-to-string';

type AnyParent = Parent & {
  children: Node[];
};

type AbbreviationDefinition = {
  abbr: string;
  title: string;
};

type MdastHtmlData = {
  hName?: string;
  hProperties?: Record<string, unknown>;
  hChildren?: unknown[];
};

const ABBREVIATION_DEFINITION = /^\*\[([^\]]+)]:[ \t]*(.*?)\s*$/;

function isParent(node: Node): node is AnyParent {
  return Array.isArray((node as Partial<AnyParent>).children);
}

function isParagraph(node: Node | undefined): node is Paragraph {
  return Boolean(node && node.type === 'paragraph');
}

function parseAbbreviationDefinitions(
  paragraph: Paragraph,
): AbbreviationDefinition[] | null {
  const value = toString(paragraph);
  const lines = value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return null;
  }

  const definitions: AbbreviationDefinition[] = [];

  for (const line of lines) {
    const match = ABBREVIATION_DEFINITION.exec(line);

    if (!match) {
      return null;
    }

    const abbr = match[1]?.trim();
    const title = match[2]?.trim();

    if (!abbr || !title) {
      return null;
    }

    definitions.push({ abbr, title });
  }

  return definitions;
}

function collectAndRemoveDefinitions(
  parent: AnyParent,
  abbreviations: Map<string, string>,
): void {
  for (let index = parent.children.length - 1; index >= 0; index -= 1) {
    const child = parent.children[index];

    if (isParent(child)) {
      collectAndRemoveDefinitions(child, abbreviations);
    }

    if (!isParagraph(child)) {
      continue;
    }

    const definitions = parseAbbreviationDefinitions(child);

    if (!definitions) {
      continue;
    }

    for (const definition of definitions) {
      abbreviations.set(definition.abbr, definition.title);
    }

    parent.children.splice(index, 1);
  }
}

function escapeRegExp(value: string): string {
  return value.replace(/[\\^$.*+?.()|[\]{}]/g, '\\$&');
}

function createAbbrNode(value: string, title: string): PhrasingContent {
  const text: Text = {
    type: 'text',
    value,
  };

  return {
    type: 'abbr',
    children: [text],
    data: {
      hName: 'abbr',
      hProperties: {
        title,
      },
    } satisfies MdastHtmlData,
  } as unknown as PhrasingContent;
}

const remarkAbbreviations: Plugin<[], Root> = function remarkAbbreviations() {
  return function transformer(tree: Root): void {
    const abbreviations = new Map<string, string>();

    collectAndRemoveDefinitions(tree as unknown as AnyParent, abbreviations);

    if (abbreviations.size === 0) {
      return;
    }

    const replacements = [...abbreviations.entries()]
      .sort(([left], [right]) => right.length - left.length)
      .map(([abbr, title]) => {
        const expression = new RegExp(`\\b${escapeRegExp(abbr)}\\b`, 'g');

        return [
          expression,
          (_value: string) => createAbbrNode(_value, title),
        ] as const;
      });

    findAndReplace(tree, replacements as never, {
      ignore: [
        'abbr',
        'code',
        'inlineCode',
        'html',
        'math',
        'inlineMath',
        'yaml',
        'toml',
      ],
    } as never);
  };
};

export { remarkAbbreviations };
export default remarkAbbreviations;
