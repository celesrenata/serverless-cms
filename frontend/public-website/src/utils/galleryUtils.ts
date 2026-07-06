import type { Content, Media } from '../types';

export const PLACEHOLDER_IMAGE = '/images/gallery-placeholder.jpg';

export interface GalleryAlbumCardModel {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  imageCount: number;
  coverUrl: string;
  coverAlt: string;
}

export type SwipeDirection = 'left' | 'right' | 'none';

export interface SwipeInput {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  threshold: number;
}

export function getNextIndex(current: number, total: number): number {
  return Math.min(current + 1, total - 1);
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function getPreviousIndex(current: number, _total: number): number {
  return Math.max(current - 1, 0);
}

export function isAtStart(index: number): boolean {
  return index === 0;
}

export function isAtEnd(index: number, total: number): boolean {
  return index === total - 1;
}

export function toAlbumCard(content: Content): GalleryAlbumCardModel {
  const media: Media[] = content.metadata.media ?? [];
  const coverMedia = media[0];

  return {
    id: content.id,
    title: content.title,
    slug: content.slug,
    excerpt: content.excerpt,
    imageCount: media.length,
    coverUrl: coverMedia?.thumbnails?.large ?? coverMedia?.s3_url ?? PLACEHOLDER_IMAGE,
    coverAlt: coverMedia?.metadata?.alt_text ?? content.title,
  };
}

export function detectSwipe(input: SwipeInput): SwipeDirection {
  const dx = input.endX - input.startX;
  const dy = input.endY - input.startY;

  if (Math.abs(dx) > input.threshold && Math.abs(dx) > Math.abs(dy)) {
    return dx < 0 ? 'left' : 'right';
  }

  return 'none';
}

export function formatGalleryTitle(siteTitle: string): string {
  return `Gallery - ${siteTitle}`;
}

export function formatAlbumTitle(albumTitle: string, siteTitle: string): string {
  return `${albumTitle} - Gallery - ${siteTitle}`;
}

export function formatPositionIndicator(index: number, total: number): string {
  return `${index + 1} / ${total}`;
}

export function shouldShowCaption(media: Media): boolean {
  const caption = media.metadata?.caption ?? '';
  if (caption.length > 0) return true;
  const alt = media.metadata?.alt_text ?? '';
  return alt.length > 3 && !/^\w+\.\w{2,4}$/.test(alt) && alt !== '.';
}
