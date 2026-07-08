import type { Plugin } from 'unified';
import type {
  Paragraph,
  PhrasingContent,
  Root,
  RootContent,
  Text,
} from 'mdast';
import type { Node, Parent } from 'unist';

type AnyParent = Parent & {
  children: Node[];
};

type MdastHtmlData = {
  hName?: string;
  hProperties?: Record<string, unknown>;
  hChildren?: unknown[];
};

const DEFINITION_MARKER = /^:(?: {3}| )/;

function isParent(node: Node): node is AnyParent {
  return Array.isArray((node as Partial<AnyParent>).children);
}

function isParagraph(node: Node | undefined): node is Paragraph {
  return Boolean(node && node.type === 'paragraph');
}

function isText(node: PhrasingContent | undefined): node is Text {
  return Boolean(node && node.type === 'text');
}

/**
 * Check if a paragraph starts with a definition marker (`:   ` or `: `).
 * Returns the definition text children if it's a definition paragraph.
 */
function getDefinitionChildren(
  paragraph: Paragraph,
): PhrasingContent[] | null {
  const firstChild = paragraph.children[0];

  if (!isText(firstChild)) {
    return null;
  }

  if (!DEFINITION_MARKER.test(firstChild.value)) {
    return null;
  }

  const strippedValue = firstChild.value.replace(DEFINITION_MARKER, '');
  const children: PhrasingContent[] = [];

  if (strippedValue.length > 0) {
    children.push({
      ...firstChild,
      value: strippedValue,
    });
  }

  children.push(...paragraph.children.slice(1));

  return children;
}

function isDefinitionParagraph(node: Node | undefined): node is Paragraph {
  return isParagraph(node) && getDefinitionChildren(node as Paragraph) !== null;
}

/**
 * Check if a paragraph contains a definition list in compact form:
 * "Term\n:   Definition" within a single paragraph text node.
 * Returns [term_text, ...definition_texts] or null.
 */
function splitCompactDefinition(paragraph: Paragraph): { term: string; definitions: string[] } | null {
  if (paragraph.children.length !== 1) return null;
  
  const child = paragraph.children[0];
  if (!isText(child)) return null;
  
  const lines = child.value.split('\n');
  if (lines.length < 2) return null;
  
  // First line should NOT start with definition marker
  if (DEFINITION_MARKER.test(lines[0])) return null;
  
  // At least one subsequent line must start with definition marker
  const defLines = lines.slice(1);
  if (!defLines.some(line => DEFINITION_MARKER.test(line))) return null;
  
  // ALL subsequent lines must be definition markers
  if (!defLines.every(line => DEFINITION_MARKER.test(line))) return null;
  
  const term = lines[0];
  const definitions = defLines.map(line => line.replace(DEFINITION_MARKER, ''));
  
  return { term, definitions };
}

function createDefinitionTermNode(children: PhrasingContent[]): Node {
  return {
    type: 'definitionTerm',
    children,
    data: {
      hName: 'dt',
      hProperties: {},
    } satisfies MdastHtmlData,
  } as unknown as Node;
}

function createDefinitionDescriptionNode(children: PhrasingContent[]): Node {
  return {
    type: 'definitionDescription',
    children,
    data: {
      hName: 'dd',
      hProperties: {},
    } satisfies MdastHtmlData,
  } as unknown as Node;
}

function createDefinitionListNode(children: Node[]): RootContent {
  return {
    type: 'definitionList',
    children,
    data: {
      hName: 'dl',
      hProperties: {},
    } satisfies MdastHtmlData,
  } as unknown as RootContent;
}

function transformParent(parent: AnyParent): void {
  for (const child of parent.children) {
    if (isParent(child)) {
      transformParent(child);
    }
  }

  let index = 0;

  while (index < parent.children.length) {
    const current = parent.children[index];

    // Case 1: Compact form — single paragraph with "Term\n:   Definition"
    if (isParagraph(current)) {
      const compact = splitCompactDefinition(current);
      if (compact) {
        const dlChildren: Node[] = [];
        dlChildren.push(createDefinitionTermNode([{ type: 'text', value: compact.term }]));
        for (const def of compact.definitions) {
          dlChildren.push(createDefinitionDescriptionNode([{ type: 'text', value: def }]));
        }
        
        // Check if following paragraphs are also compact definitions (multi-term list)
        let cursor = index + 1;
        while (cursor < parent.children.length) {
          const next = parent.children[cursor];
          if (!isParagraph(next)) break;
          const nextCompact = splitCompactDefinition(next);
          if (!nextCompact) break;
          dlChildren.push(createDefinitionTermNode([{ type: 'text', value: nextCompact.term }]));
          for (const def of nextCompact.definitions) {
            dlChildren.push(createDefinitionDescriptionNode([{ type: 'text', value: def }]));
          }
          cursor++;
        }
        
        const definitionList = createDefinitionListNode(dlChildren);
        parent.children.splice(index, cursor - index, definitionList as unknown as Node);
        index += 1;
        continue;
      }
    }

    // Case 2: Separated form — term paragraph followed by definition paragraph(s)
    const next = parent.children[index + 1];

    if (!isParagraph(current) || !isDefinitionParagraph(next)) {
      index += 1;
      continue;
    }

    const definitionListChildren: Node[] = [];
    let cursor = index;

    while (
      isParagraph(parent.children[cursor]) &&
      !splitCompactDefinition(parent.children[cursor] as Paragraph) &&
      isDefinitionParagraph(parent.children[cursor + 1])
    ) {
      const term = parent.children[cursor] as Paragraph;

      definitionListChildren.push(createDefinitionTermNode(term.children));
      cursor += 1;

      while (isDefinitionParagraph(parent.children[cursor])) {
        const definition = parent.children[cursor] as Paragraph;
        const defChildren = getDefinitionChildren(definition) ?? [];
        definitionListChildren.push(createDefinitionDescriptionNode(defChildren));
        cursor += 1;
      }
    }

    const definitionList = createDefinitionListNode(definitionListChildren);

    parent.children.splice(index, cursor - index, definitionList as unknown as Node);
    index += 1;
  }
}

const remarkDefinitionList: Plugin<[], Root> = function remarkDefinitionList() {
  return function transformer(tree: Root): void {
    transformParent(tree as unknown as AnyParent);
  };
};

export { remarkDefinitionList };
export default remarkDefinitionList;
