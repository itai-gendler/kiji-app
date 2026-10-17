import { describe, expect, it } from 'vitest';

import { isAudioMediaUrl, isUsableImageUrl, isVideoMediaUrl } from '@/utils/mediaUrl';
import { injectLeadImage } from '@/utils/articleLeadImage';

describe('media URL classification', () => {
  it('detects audio and video files by extension, ignoring query and case', () => {
    expect(isAudioMediaUrl('https://api.substack.com/feed/podcast/1/ep.mp3')).toBe(true);
    expect(isAudioMediaUrl('//traffic.libsyn.com/x/005.MP3?dest-id=628353')).toBe(true);
    expect(isVideoMediaUrl('https://media.wired.com/clips/a/master/pass/Lead.mp4')).toBe(true);
    expect(isVideoMediaUrl('https://x.com/stream.m3u8#t=1')).toBe(true);
  });

  it('treats images and extensionless URLs as usable images', () => {
    expect(isUsableImageUrl('https://x.com/a.jpg')).toBe(true);
    expect(isUsableImageUrl('https://x.com/image?w=800')).toBe(true);
    expect(isUsableImageUrl('https://x.mp3.example.com/cover')).toBe(true);
    expect(isUsableImageUrl('https://x.com/a.mp3')).toBe(false);
    expect(isUsableImageUrl(undefined)).toBe(false);
  });

  it('never injects an audio/video file as the lead image', () => {
    expect(injectLeadImage('<p>text</p>', 'https://x.com/ep.mp3')).toBe('<p>text</p>');
    expect(injectLeadImage('<p>text</p>', 'https://x.com/cover.jpg')).toContain('<img src="https://x.com/cover.jpg"');
  });
});
