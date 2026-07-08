import type { Plugin } from 'unified';
import type { PhrasingContent, Root, Text } from 'mdast';
import { findAndReplace } from 'mdast-util-find-and-replace';

type MdastHtmlData = {
  hName?: string;
  hProperties?: Record<string, unknown>;
  hChildren?: unknown[];
};

const SUPERSCRIPT_EXPRESSION =
  /(^|[^^\\])\^([^\s^](?:[^^]*?[^\s^])?)\^(?!\^)/g;

const SUBSCRIPT_EXPRESSION =
  /(^|[^~\\])~([^\s~](?:[^~]*?[^\s~])?)~(?!~)/g;

function textNode(value: string): Text {
  return {
    type: 'text',
    value,
  };
}

function createInlineHtmlNode(
  type: 'superscript' | 'subscript',
  hName: 'sup' | 'sub',
  value: string,
): PhrasingContent {
  return {
    type,
    children: [textNode(value)],
    data: {
      hName,
      hProperties: {},
    } satisfies MdastHtmlData,
  } as unknown as PhrasingContent;
}

function withOptionalPrefix(
  prefix: string,
  node: PhrasingContent,
): PhrasingContent | PhrasingContent[] {
  if (!prefix) {
    return node;
  }

  return [textNode(prefix), node];
}

const remarkSuperSub: Plugin<[], Root> = function remarkSuperSub() {
  return function transformer(tree: Root): void {
    const replacements = [
      [
        SUPERSCRIPT_EXPRESSION,
        (_match: string, prefix: string, value: string) =>
          withOptionalPrefix(
            prefix,
            createInlineHtmlNode('superscript', 'sup', value),
          ),
      ],
      [
        SUBSCRIPT_EXPRESSION,
        (_match: string, prefix: string, value: string) =>
          withOptionalPrefix(
            prefix,
            createInlineHtmlNode('subscript', 'sub', value),
          ),
      ],
    ] as const;

    findAndReplace(tree, replacements as never, {
      ignore: [
        'superscript',
        'subscript',
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

export { remarkSuperSub };
export default remarkSuperSub;
