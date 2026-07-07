export interface TocItem {
  id: string;
  text: string;
  level: 1 | 2 | 3 | 4 | 5 | 6;
  children: TocItem[];
}

export interface MarkdownRenderOptions {
  generateToc?: boolean;
  sanitize?: boolean;
  maxLength?: number;
}

export interface MarkdownRenderResult {
  html: string;
  toc: TocItem[];
  shouldShowToc: boolean;
  warnings: MarkdownRenderWarning[];
}

export interface MarkdownRenderWarning {
  code: 'EMPTY_INPUT' | 'MAX_LENGTH_EXCEEDED' | 'INVALID_LATEX'
      | 'UNSUPPORTED_LANGUAGE' | 'MALFORMED_SYNTAX';
  message: string;
  position?: { line: number; column: number };
}

export type SupportedLanguage =
  | 'python' | 'typescript' | 'javascript' | 'rust' | 'go'
  | 'java' | 'c' | 'css' | 'html' | 'sql' | 'bash'
  | 'json' | 'yaml' | 'toml' | 'markdown' | 'diff'
  | 'docker' | 'terraform' | 'graphql' | 'nix';

export const SUPPORTED_LANGUAGES: SupportedLanguage[] = [
  'python',
  'typescript',
  'javascript',
  'rust',
  'go',
  'java',
  'c',
  'css',
  'html',
  'sql',
  'bash',
  'json',
  'yaml',
  'toml',
  'markdown',
  'diff',
  'docker',
  'terraform',
  'graphql',
  'nix',
];

export const MAX_MARKDOWN_LENGTH = 500_000;

export const TOC_THRESHOLD = 3;
