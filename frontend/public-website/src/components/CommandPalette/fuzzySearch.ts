import type { PaletteAction } from './actions';

export interface FuzzyResult {
  action: PaletteAction;
  score: number;
}

const SCORE_EXACT = 100;
const SCORE_PREFIX = 75;
const SCORE_SUBSTRING = 50;
const SCORE_FUZZY = 25;
const SCORE_NONE = 0;

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function isFuzzyMatch(query: string, target: string): boolean {
  let queryIndex = 0;

  for (let targetIndex = 0; targetIndex < target.length; targetIndex += 1) {
    if (target[targetIndex] === query[queryIndex]) {
      queryIndex += 1;

      if (queryIndex === query.length) {
        return true;
      }
    }
  }

  return queryIndex === query.length;
}

function scoreText(query: string, target: string): number {
  const normalizedTarget = normalize(target);

  if (!normalizedTarget) {
    return SCORE_NONE;
  }

  if (normalizedTarget === query) {
    return SCORE_EXACT;
  }

  if (normalizedTarget.startsWith(query)) {
    return SCORE_PREFIX;
  }

  if (normalizedTarget.includes(query)) {
    return SCORE_SUBSTRING;
  }

  if (isFuzzyMatch(query, normalizedTarget)) {
    return SCORE_FUZZY;
  }

  return SCORE_NONE;
}

function scoreAction(query: string, action: PaletteAction): number {
  const scores = [
    scoreText(query, action.title),
    ...action.keywords.map((keyword) => scoreText(query, keyword)),
  ];

  return Math.max(...scores);
}

export function fuzzySearch(query: string, actions: PaletteAction[]): FuzzyResult[] {
  const normalizedQuery = normalize(query);

  const results: FuzzyResult[] = actions
    .map((action) => ({
      action,
      score: normalizedQuery ? scoreAction(normalizedQuery, action) : SCORE_NONE,
    }))
    .filter((result) => !normalizedQuery || result.score > SCORE_NONE);

  return results.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }

    return a.action.title.localeCompare(b.action.title);
  });
}
