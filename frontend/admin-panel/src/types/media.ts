export interface MediaDimensions {
  width: number;
  height: number;
}

export interface MediaThumbnails {
  small: string;
  medium: string;
  large: string;
}

export interface MediaMetadata {
  alt_text?: string;
  caption?: string;
  exif?: Record<string, any>;
}

export interface Media {
  id: string;
  filename: string;
  s3_key: string;
  s3_url: string;
  mime_type: string;
  size: number;
  dimensions?: MediaDimensions;
  thumbnails?: MediaThumbnails;
  metadata: MediaMetadata;
  uploaded_by: string;
  uploaded_at: number;
}

export interface MediaUpload {
  file: File;
  metadata?: MediaMetadata;
}

export interface MediaUpdate {
  metadata: MediaMetadata;
}

export interface MediaListResponse {
  items: Media[];
  last_key?: Record<string, any>;
}
