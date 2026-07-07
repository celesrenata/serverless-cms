import { Helmet } from 'react-helmet-async';

const SITE_NAME = 'Celestium';
const DEFAULT_DESCRIPTION = 'Elite serverless engineering — architecture, automation, and cloud-native solutions.';
const DEFAULT_OG_IMAGE = '/og-image.png';

export interface PageMetaProps {
  /** Page-specific title. Rendered as "title | Celestium" */
  title?: string;
  /** Meta description for the page */
  description?: string;
  /** Canonical URL for the page */
  canonical?: string;
  /** Open Graph image URL */
  ogImage?: string;
  /** Open Graph URL (defaults to canonical) */
  ogUrl?: string;
  /** Open Graph type (defaults to "website") */
  ogType?: string;
  /** Twitter card type (defaults to "summary_large_image") */
  twitterCard?: 'summary' | 'summary_large_image';
}

export const PageMeta: React.FC<PageMetaProps> = ({
  title,
  description = DEFAULT_DESCRIPTION,
  canonical,
  ogImage = DEFAULT_OG_IMAGE,
  ogUrl,
  ogType = 'website',
  twitterCard = 'summary_large_image',
}) => {
  const fullTitle = title ? `${title} | ${SITE_NAME}` : SITE_NAME;
  const resolvedOgUrl = ogUrl || canonical;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />

      {/* Open Graph */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={ogType} />
      {ogImage && <meta property="og:image" content={ogImage} />}
      {resolvedOgUrl && <meta property="og:url" content={resolvedOgUrl} />}

      {/* Twitter Card */}
      <meta name="twitter:card" content={twitterCard} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      {ogImage && <meta name="twitter:image" content={ogImage} />}

      {/* Canonical */}
      {canonical && <link rel="canonical" href={canonical} />}
    </Helmet>
  );
};
