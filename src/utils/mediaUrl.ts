/**
 * Feeds often declare podcast audio or cover video as `media:content` /
 * enclosures, which older ingestion stored as the article's image. These
 * helpers keep such URLs out of every <img> path (lead image, list thumbnail,
 * article content). Mirrors `has_non_image_media_extension` in
 * `src-tauri/src/feeds/parse.rs`.
 */

const AUDIO_EXTENSIONS = new Set(['mp3', 'm4a', 'aac', 'ogg', 'oga', 'opus', 'wav', 'flac']);
const VIDEO_EXTENSIONS = new Set(['mp4', 'm4v', 'mov', 'webm', 'mkv', 'avi', 'm3u8', 'mpd']);

function urlExtension(url: string): string {
  const path = url.split(/[?#]/, 1)[0] ?? '';
  const lastSegment = path.slice(path.lastIndexOf('/') + 1);
  const dotIndex = lastSegment.lastIndexOf('.');
  return dotIndex >= 0 ? lastSegment.slice(dotIndex + 1).toLowerCase() : '';
}

export function isAudioMediaUrl(url: string | null | undefined): boolean {
  return !!url && AUDIO_EXTENSIONS.has(urlExtension(url));
}

export function isVideoMediaUrl(url: string | null | undefined): boolean {
  return !!url && VIDEO_EXTENSIONS.has(urlExtension(url));
}

/** False for empty URLs and for audio/video files; true otherwise. */
export function isUsableImageUrl(url: string | null | undefined): url is string {
  return !!url && !isAudioMediaUrl(url) && !isVideoMediaUrl(url);
}
