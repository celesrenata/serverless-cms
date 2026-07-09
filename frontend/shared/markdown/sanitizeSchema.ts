import { defaultSchema } from 'hast-util-sanitize';
import type { Schema } from 'hast-util-sanitize';

type AttributeRule = string | [string, ...Array<string | RegExp>];

const mathMlTagNames = [
  'math',
  'semantics',
  'annotation',
  'mrow',
  'mi',
  'mo',
  'mn',
  'ms',
  'mspace',
  'mtext',
  'mfrac',
  'msup',
  'msub',
  'mover',
  'munder',
  'munderover',
  'msqrt',
  'mroot',
  'mtable',
  'mtr',
  'mtd',
  'menclose',
  'mpadded',
  'mphantom',
];

const katexClassNames: Array<string | RegExp> = [
  'katex',
  /^katex-/,
  'math',
  'math-inline',
  'math-display',
  'math-block',

  'base',
  'strut',
  'vlist',
  /^vlist-/,
  'pstrut',

  'mord',
  'mop',
  'mbin',
  'mrel',
  'mopen',
  'mclose',
  'mpunct',
  'minner',
  'mspace',
  'mtext',
  'mfrac',
  'msupsub',
  'munder',
  'mover',
  'mroot',
  'msqrt',
  'mtable',

  'mathnormal',
  'mathit',
  'mathrm',
  'mathbf',
  'boldsymbol',
  'amsrm',
  'mathbb',
  'mathcal',
  'mathfrak',
  'mathtt',
  'mathscr',
  'mainrm',

  'textstyle',
  'displaystyle',
  'scriptstyle',
  'scriptscriptstyle',
  'mtight',

  /^size\d+$/,
  /^reset-size\d+$/,

  'delimsizing',
  /^delim-size\d+$/,
  'nulldelimiter',

  'accent',
  'accent-body',
  'op-symbol',
  'overline-line',
  'underline-line',
  'sqrt-sign',
  'sqrt-line',
  'stretchy',
  'hide-tail',
  'halfarrow-left',
  'halfarrow-right',

  'rlap',
  'llap',
  'clap',
  'thinbox',

  /^col-align-/,
  'arraycolsep',
  'arraystretch',
  'svg-align',
];

const prismClassNames: Array<string | RegExp> = [
  'token',
  /^language-/,

  'comment',
  'prolog',
  'doctype',
  'cdata',
  'punctuation',
  'namespace',
  'property',
  'tag',
  'boolean',
  'number',
  'constant',
  'symbol',
  'deleted',
  'selector',
  'attr-name',
  'string',
  'char',
  'builtin',
  'inserted',
  'operator',
  'entity',
  'url',
  'atrule',
  'attr-value',
  'keyword',
  'function',
  'class-name',
  'regex',
  'important',
  'variable',
  'bold',
  'italic',
  'script',
  'parameter',
  'interpolation',
  'module',
  'maybe-class-name',
  'generic',
  'console',
  'method',
  'property-access',
  'plain',

  'code-highlight',
  'code-line',
  'line-number',
  'line-numbers',
  'highlight-line',
  'line-highlight',
  'diff-highlight',
  'diff',
  'diff-deleted',
  'diff-inserted',
];

/**
 * KaTeX emits small inline style fragments such as:
 * - height:0.6833em;
 * - vertical-align:-0.2em;
 * - top:-3.063em;margin-right:0.05em;
 *
 * This regex only allows safe dimension-based properties.
 */
const katexStyleValue =
  /^(?:(?:height|depth|width|min-width|max-width|top|bottom|left|right|margin|margin-left|margin-right|vertical-align):\s*-?(?:\d+(?:\.\d+)?|\.\d+)(?:em|ex|mu|px|pt|rem|%)?;?\s*)+$/i;

const prismClassNameRule: AttributeRule = ['className', ...prismClassNames];
const katexAndPrismClassNameRule: AttributeRule = [
  'className',
  ...katexClassNames,
  ...prismClassNames,
];
const katexAndGalleryClassNameRule: AttributeRule = [
  'className',
  ...katexClassNames,
  'gallery-embed',
];
const ariaHiddenRule: AttributeRule = ['ariaHidden', 'true'];
const katexStyleRule: AttributeRule = ['style', katexStyleValue];

function isSafeInheritedAttribute(attribute: unknown): boolean {
  const name =
    typeof attribute === 'string'
      ? attribute
      : Array.isArray(attribute)
        ? String(attribute[0])
        : '';

  // Do not inherit event-handler attributes or unrestricted inline styles.
  return !/^on/i.test(name) && name !== 'style';
}

export function getSanitizeSchema(): Schema {
  const inheritedAttributes = Object.fromEntries(
    Object.entries(defaultSchema.attributes ?? {}).map(([tagName, attributes]) => [
      tagName,
      (attributes as unknown[]).filter(isSafeInheritedAttribute),
    ]),
  ) as NonNullable<Schema['attributes']>;

  const attributesFor = (tagName: string): AttributeRule[] => [
    ...((inheritedAttributes[tagName] ?? []) as AttributeRule[]),
  ];

  return {
    ...defaultSchema,

    // Disable DOM-clobbering prefix for heading IDs since we control generation
    clobber: [],
    clobberPrefix: '',

    tagNames: Array.from(
      new Set([...(defaultSchema.tagNames ?? []), ...mathMlTagNames, 'abbr']),
    ).filter((tagName) => tagName !== 'iframe'),

    attributes: {
      ...inheritedAttributes,

      h1: [...attributesFor('h1'), 'id'],
      h2: [...attributesFor('h2'), 'id'],
      h3: [...attributesFor('h3'), 'id'],
      h4: [...attributesFor('h4'), 'id'],
      h5: [...attributesFor('h5'), 'id'],
      h6: [...attributesFor('h6'), 'id'],

      span: [
        ...attributesFor('span'),
        katexAndPrismClassNameRule,
        ariaHiddenRule,
        katexStyleRule,
      ],

      div: [...attributesFor('div'), katexAndGalleryClassNameRule, 'data-album-id', 'data-layout', 'data-limit', 'data-show-description', 'data-show-title'],

      pre: [...attributesFor('pre'), prismClassNameRule, 'dataLanguage'],
      code: [...attributesFor('code'), prismClassNameRule],

      abbr: [...attributesFor('abbr'), 'title'],

      math: [...attributesFor('math'), 'xmlns', 'display'],
      semantics: attributesFor('semantics'),
      annotation: [...attributesFor('annotation'), 'encoding'],

      mrow: attributesFor('mrow'),
      mi: attributesFor('mi'),
      mo: [
        ...attributesFor('mo'),
        'stretchy',
        'fence',
        'separator',
        'lspace',
        'rspace',
        'minsize',
        'maxsize',
      ],
      mn: attributesFor('mn'),
      ms: attributesFor('ms'),
      mspace: [...attributesFor('mspace'), 'width', 'height', 'depth'],
      mtext: attributesFor('mtext'),
      mfrac: [...attributesFor('mfrac'), 'linethickness'],
      msup: attributesFor('msup'),
      msub: attributesFor('msub'),
      mover: attributesFor('mover'),
      munder: attributesFor('munder'),
      munderover: attributesFor('munderover'),
      msqrt: attributesFor('msqrt'),
      mroot: attributesFor('mroot'),
      mtable: [
        ...attributesFor('mtable'),
        'rowspacing',
        'columnspacing',
        'columnalign',
      ],
      mtr: attributesFor('mtr'),
      mtd: [...attributesFor('mtd'), 'columnalign', 'rowspan', 'columnspan'],
      menclose: [...attributesFor('menclose'), 'notation'],
      mpadded: [
        ...attributesFor('mpadded'),
        'height',
        'depth',
        'width',
        'lspace',
        'voffset',
      ],
      mphantom: attributesFor('mphantom'),
    },

    protocols: {
      ...(defaultSchema.protocols ?? {}),

      href: ['http', 'https', 'mailto'],
      src: ['http', 'https'],
      cite: ['http', 'https'],
      longDesc: ['http', 'https'],
    },

    strip: ['script'],
  };
}
