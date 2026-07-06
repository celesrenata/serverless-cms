import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { PLACEHOLDER_IMAGE, toAlbumCard, formatGalleryTitle, formatAlbumTitle } from '../../utils/galleryUtils';
import type { Content, Media } from '../../types';

type Thumbnails = NonNullable<Media['thumbnails']>;
type MediaMetadata = NonNullable<Media['metadata']>;

const PROPERTY_RUN_OPTIONS = { numRuns: 100 };

function arbText(): fc.Arbitrary<string> {
  return fc.string({ minLength: 1, maxLength: 50 });
}

function arbThumbnails(): fc.Arbitrary<Thumbnails> {
  return fc.record({
    small: fc.webUrl(),
    medium: fc.webUrl(),
    large: fc.webUrl(),
  });
}

function arbMediaMetadata(): fc.Arbitrary<MediaMetadata> {
  return fc
    .record({
      alt_text: fc.option(arbText(), { nil: undefined }),
      caption: fc.option(arbText(), { nil: undefined }),
    })
    .map(
      ({ alt_text, caption }): MediaMetadata => ({
        ...(alt_text === undefined ? {} : { alt_text }),
        ...(caption === undefined ? {} : { caption }),
      }),
    );
}

function arbMedia(): fc.Arbitrary<Media> {
  return fc
    .record({
      id: arbText(),
      filename: arbText(),
      s3_key: arbText(),
      s3_url: fc.webUrl(),
      mime_type: arbText(),
      size: fc.nat(),
      thumbnails: fc.option(arbThumbnails(), { nil: undefined }),
      metadata: fc.option(arbMediaMetadata(), { nil: undefined }),
      uploaded_by: arbText(),
      uploaded_at: fc.nat(),
    })
    .map(
      ({ thumbnails, metadata, ...media }): Media => ({
        ...media,
        ...(thumbnails === undefined ? {} : { thumbnails }),
        ...(metadata === undefined ? {} : { metadata }),
      }),
    );
}

function arbContentMetadata(media: fc.Arbitrary<Media[]>): fc.Arbitrary<Content['metadata']> {
  return fc
    .record({
      seo_title: fc.option(arbText(), { nil: undefined }),
      seo_description: fc.option(arbText(), { nil: undefined }),
      tags: fc.option(fc.array(arbText(), { maxLength: 10 }), { nil: undefined }),
      categories: fc.option(fc.array(arbText(), { maxLength: 10 }), { nil: undefined }),
      media,
      custom_fields: fc.option(fc.dictionary(arbText(), arbText()), { nil: undefined }),
    })
    .map(
      ({ seo_title, seo_description, tags, categories, media: m, custom_fields }): Content['metadata'] => ({
        ...(seo_title === undefined ? {} : { seo_title }),
        ...(seo_description === undefined ? {} : { seo_description }),
        ...(tags === undefined ? {} : { tags }),
        ...(categories === undefined ? {} : { categories }),
        media: m,
        ...(custom_fields === undefined ? {} : { custom_fields }),
      }),
    );
}

function arbContent(media: fc.Arbitrary<Media[]>): fc.Arbitrary<Content> {
  return fc
    .record({
      id: arbText(),
      type: fc.constantFrom('post' as const, 'page' as const, 'gallery' as const, 'project' as const),
      title: arbText(),
      slug: arbText(),
      content: arbText(),
      excerpt: arbText(),
      author: arbText(),
      status: fc.constantFrom('draft' as const, 'published' as const, 'archived' as const),
      featured_image: arbText(),
      metadata: arbContentMetadata(media),
      created_at: fc.nat(),
      updated_at: fc.nat(),
      published_at: fc.option(fc.nat(), { nil: undefined }),
      scheduled_at: fc.option(fc.nat(), { nil: undefined }),
    })
    .map(
      ({ published_at, scheduled_at, ...rest }): Content => ({
        ...rest,
        ...(published_at === undefined ? {} : { published_at }),
        ...(scheduled_at === undefined ? {} : { scheduled_at }),
      }),
    );
}

function arbContentWithMedia(): fc.Arbitrary<Content> {
  return arbContent(fc.array(arbMedia(), { minLength: 1, maxLength: 10 }));
}

function arbContentWithEmptyMedia(): fc.Arbitrary<Content> {
  return arbContent(fc.constant([] as Media[]));
}

function withMedia(content: Content, media: Media[]): Content {
  return {
    ...content,
    metadata: {
      ...content.metadata,
      media,
    },
  };
}

/**
 * **Validates: Requirements 1.2, 8.1**
 */
describe('Feature: gallery-album-experience, Property 2: Album card displays all required information', () => {
  it('toAlbumCard preserves title, slug, and excerpt from content', () => {
    fc.assert(
      fc.property(arbContentWithMedia(), (content) => {
        const result = toAlbumCard(content);

        expect(result.title).toBe(content.title);
        expect(result.slug).toBe(content.slug);
        expect(result.excerpt).toBe(content.excerpt);
      }),
      PROPERTY_RUN_OPTIONS,
    );
  });

  it('toAlbumCard imageCount equals media array length', () => {
    fc.assert(
      fc.property(arbContentWithMedia(), (content) => {
        const result = toAlbumCard(content);

        expect(result.imageCount).toBe(content.metadata.media!.length);
      }),
      PROPERTY_RUN_OPTIONS,
    );
  });

  it('toAlbumCard coverUrl comes from first media thumbnails.large', () => {
    fc.assert(
      fc.property(arbContentWithMedia(), arbThumbnails(), (content, thumbnails) => {
        const media = [...content.metadata.media!];
        const firstMedia = media[0]!;

        media[0] = {
          ...firstMedia,
          thumbnails,
        };

        const result = toAlbumCard(withMedia(content, media));

        expect(result.coverUrl).toBe(thumbnails.large);
      }),
      PROPERTY_RUN_OPTIONS,
    );
  });

  it('toAlbumCard coverUrl falls back to s3_url when no thumbnails', () => {
    fc.assert(
      fc.property(arbContentWithMedia(), (content) => {
        const media = [...content.metadata.media!];
        const firstMedia = media[0]!;

        media[0] = {
          ...firstMedia,
          thumbnails: undefined,
        } as Media;

        const result = toAlbumCard(withMedia(content, media));

        expect(result.coverUrl).toBe(firstMedia.s3_url);
      }),
      PROPERTY_RUN_OPTIONS,
    );
  });

  it('toAlbumCard coverUrl uses PLACEHOLDER_IMAGE when media is empty', () => {
    fc.assert(
      fc.property(arbContentWithEmptyMedia(), (content) => {
        const result = toAlbumCard(content);

        expect(result.coverUrl).toBe(PLACEHOLDER_IMAGE);
      }),
      PROPERTY_RUN_OPTIONS,
    );
  });

  it('toAlbumCard coverAlt uses first media alt_text when available', () => {
    fc.assert(
      fc.property(arbContentWithMedia(), arbText(), (content, altText) => {
        const media = [...content.metadata.media!];
        const firstMedia = media[0]!;

        media[0] = {
          ...firstMedia,
          metadata: {
            ...(firstMedia.metadata ?? {}),
            alt_text: altText,
          },
        };

        const result = toAlbumCard(withMedia(content, media));

        expect(result.coverAlt).toBe(altText);
      }),
      PROPERTY_RUN_OPTIONS,
    );
  });

  it('toAlbumCard coverAlt falls back to content title when no alt_text', () => {
    fc.assert(
      fc.property(arbContentWithMedia(), fc.boolean(), (content, metadataShouldBeUndefined) => {
        const media = [...content.metadata.media!];
        const firstMedia = media[0]!;

        media[0] = metadataShouldBeUndefined
          ? ({
              ...firstMedia,
              metadata: undefined,
            } as Media)
          : ({
              ...firstMedia,
              metadata: {
                ...(firstMedia.metadata ?? {}),
                alt_text: undefined,
              },
            } as Media);

        const result = toAlbumCard(withMedia(content, media));

        expect(result.coverAlt).toBe(content.title);
      }),
      PROPERTY_RUN_OPTIONS,
    );
  });
});

/**
 * **Validates: Requirements 2.1**
 */
describe('Feature: gallery-album-experience, Property 3: Album card link matches slug', () => {
  it('toAlbumCard.slug equals content.slug (identity mapping)', () => {
    fc.assert(
      fc.property(arbContentWithMedia(), (content) => {
        const result = toAlbumCard(content);

        expect(result.slug).toBe(content.slug);
      }),
      PROPERTY_RUN_OPTIONS,
    );
  });

  it('/gallery/${toAlbumCard(content).slug} forms a valid path', () => {
    fc.assert(
      fc.property(arbContentWithMedia(), (content) => {
        const result = toAlbumCard(content);
        const path = `/gallery/${result.slug}`;

        expect(path).toBe(`/gallery/${content.slug}`);
        expect(path.startsWith('/gallery/')).toBe(true);
      }),
      PROPERTY_RUN_OPTIONS,
    );
  });

  it('slug is preserved exactly without transformation', () => {
    fc.assert(
      fc.property(arbContentWithMedia(), (content) => {
        const result = toAlbumCard(content);

        // The slug must not be trimmed, lowercased, or otherwise mutated
        expect(result.slug).toStrictEqual(content.slug);
        expect(result.slug.length).toBe(content.slug.length);
      }),
      PROPERTY_RUN_OPTIONS,
    );
  });
});

/**
 * **Validates: Requirements 7.1, 7.2, 7.3**
 */
describe('Feature: gallery-album-experience, Property 10: SEO metadata format correctness', () => {
  it('formatGalleryTitle always returns string starting with "Gallery - " followed by siteTitle', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 0, maxLength: 100 }), (siteTitle) => {
        const result = formatGalleryTitle(siteTitle);

        expect(result).toBe(`Gallery - ${siteTitle}`);
        expect(result.startsWith('Gallery - ')).toBe(true);
        expect(result.endsWith(siteTitle)).toBe(true);
      }),
      PROPERTY_RUN_OPTIONS,
    );
  });

  it('formatAlbumTitle always contains albumTitle at start, "Gallery" in middle, and siteTitle at end', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 100 }),
        fc.string({ minLength: 0, maxLength: 100 }),
        (albumTitle, siteTitle) => {
          const result = formatAlbumTitle(albumTitle, siteTitle);

          expect(result.startsWith(albumTitle)).toBe(true);
          expect(result.includes('Gallery')).toBe(true);
          expect(result.endsWith(siteTitle)).toBe(true);
          expect(result).toBe(`${albumTitle} - Gallery - ${siteTitle}`);
        },
      ),
      PROPERTY_RUN_OPTIONS,
    );
  });

  it('formatGalleryTitle output length equals "Gallery - ".length + siteTitle.length', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 0, maxLength: 100 }), (siteTitle) => {
        const result = formatGalleryTitle(siteTitle);

        expect(result.length).toBe('Gallery - '.length + siteTitle.length);
      }),
      PROPERTY_RUN_OPTIONS,
    );
  });

  it('formatAlbumTitle output length equals albumTitle.length + " - Gallery - ".length + siteTitle.length', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 100 }),
        fc.string({ minLength: 0, maxLength: 100 }),
        (albumTitle, siteTitle) => {
          const result = formatAlbumTitle(albumTitle, siteTitle);

          expect(result.length).toBe(albumTitle.length + ' - Gallery - '.length + siteTitle.length);
        },
      ),
      PROPERTY_RUN_OPTIONS,
    );
  });
});
