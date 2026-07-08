/**
 * Slugify a heading text for use as an anchor ID.
 * - Normalize unicode (NFKD) and strip diacritics
 * - Lowercase
 * - Replace non-alphanumeric characters with hyphens
 * - Collapse consecutive hyphens
 * - Trim leading/trailing hyphens
 * - Deduplicate with -1, -2 suffixes when existingIds is provided
 */
export function slugifyHeading(
  text: string,
  existingIds?: Map<string, number>,
): string {
  const baseSlug =
    text
      .normalize('NFKD')
      .toLowerCase()
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || 'heading';

  if (!existingIds) {
    return baseSlug;
  }

  const existingCount = existingIds.get(baseSlug);

  if (existingCount === undefined) {
    existingIds.set(baseSlug, 1);
    return baseSlug;
  }

  let suffix = existingCount;
  let slug = `${baseSlug}-${suffix}`;

  while (existingIds.has(slug)) {
    suffix += 1;
    slug = `${baseSlug}-${suffix}`;
  }

  existingIds.set(baseSlug, suffix + 1);
  existingIds.set(slug, 1);

  return slug;
}
