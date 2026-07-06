/**
 * Extract the first image URL from HTML content.
 * Used as a fallback when featured_image is not set.
 */
export function extractFirstImageFromContent(htmlContent: string): string | null {
  if (!htmlContent) return null;

  // Match <img> tags and extract src attribute
  // Handles both single and double quotes, and various attribute orders
  const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/i;
  const match = htmlContent.match(imgRegex);

  return match ? match[1] : null;
}
