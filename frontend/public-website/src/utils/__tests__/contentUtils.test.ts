import { describe, it, expect } from 'vitest';
import { extractFirstImageFromContent } from '../contentUtils';

describe('extractFirstImageFromContent', () => {
  it('extracts src from a standard img tag', () => {
    const html = '<p>Hello</p><img src="https://example.com/photo.jpg" alt="test" />';
    expect(extractFirstImageFromContent(html)).toBe('https://example.com/photo.jpg');
  });

  it('extracts src from img with single quotes', () => {
    const html = "<img src='https://example.com/photo.jpg' />";
    expect(extractFirstImageFromContent(html)).toBe('https://example.com/photo.jpg');
  });

  it('extracts first img when multiple exist', () => {
    const html = '<img src="https://first.jpg" /><img src="https://second.jpg" />';
    expect(extractFirstImageFromContent(html)).toBe('https://first.jpg');
  });

  it('handles img with other attributes before src', () => {
    const html = '<img class="wp-image" width="600" src="https://example.com/photo.jpg" />';
    expect(extractFirstImageFromContent(html)).toBe('https://example.com/photo.jpg');
  });

  it('returns null for empty content', () => {
    expect(extractFirstImageFromContent('')).toBeNull();
  });

  it('returns null when no img tags exist', () => {
    expect(extractFirstImageFromContent('<p>No images here</p>')).toBeNull();
  });

  it('handles WordPress figure blocks', () => {
    const html = '<!-- wp:image --><figure><img src="https://example.com/wp-image.jpg" class="wp-image-1" /></figure><!-- /wp:image -->';
    expect(extractFirstImageFromContent(html)).toBe('https://example.com/wp-image.jpg');
  });
});
