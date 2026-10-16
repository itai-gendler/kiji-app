import type { Feed } from '@/services/feeds/types';
import type { Article } from '@/types/article';
import type { Tag } from '@/types/tag';

const BLUE_FAVICON = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="32" height="32"%3E%3Crect width="32" height="32" rx="8" fill="%23007aff"/%3E%3Cpath d="M8 9h16v3H8zm0 6h11v3H8zm0 6h14v3H8z" fill="white"/%3E%3C/svg%3E';
const AMBER_FAVICON = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="32" height="32"%3E%3Crect width="32" height="32" rx="16" fill="%23f59e0b"/%3E%3Cpath d="M10 22l6-13 6 13z" fill="%232a2a2c"/%3E%3C/svg%3E';
const PREVIEW_IMAGE = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="320" height="180"%3E%3Cdefs%3E%3ClinearGradient id="g" x2="1" y2="1"%3E%3Cstop stop-color="%23007aff"/%3E%3Cstop offset="1" stop-color="%238b5cf6"/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width="320" height="180" rx="16" fill="url(%23g)"/%3E%3Ccircle cx="245" cy="55" r="32" fill="%23ffffff" fill-opacity=".7"/%3E%3Cpath d="M30 135h260v18H30zM30 105h170v14H30z" fill="%23ffffff" fill-opacity=".82"/%3E%3C/svg%3E';

export const THEME_DEBUG_FEEDS = [
  {
    id: 'feed-design',
    title: 'Design Systems Weekly',
    url: 'https://example.com/design.xml',
    tags: ['Design'],
    unreadCount: 12,
    articleCount: 84,
    favicon: BLUE_FAVICON,
    faviconHasTransparency: false,
    sortOrder: 0,
    lastFetched: new Date('2026-10-10T07:30:00.000Z'),
  },
  {
    id: 'feed-type',
    title: 'Typography & Reading',
    url: 'https://example.com/type.xml',
    tags: ['Design'],
    unreadCount: 4,
    articleCount: 36,
    emoji: 'Aa',
    sortOrder: 1,
    lastFetched: new Date('2026-10-10T07:20:00.000Z'),
  },
  {
    id: 'feed-tech',
    title: 'Independent Technology Review',
    url: 'https://example.com/tech.xml',
    tags: ['Technology'],
    unreadCount: 18,
    articleCount: 142,
    favicon: AMBER_FAVICON,
    faviconHasTransparency: false,
    sortOrder: 2,
    lastFetched: new Date('2026-10-10T07:10:00.000Z'),
  },
  {
    id: 'feed-research',
    title: 'Research Notes',
    url: 'https://example.com/research.xml',
    tags: ['Technology'],
    unreadCount: 2,
    articleCount: 51,
    emoji: '🔬',
    sortOrder: 3,
    lastFetched: new Date('2026-10-10T07:00:00.000Z'),
  },
  {
    id: 'feed-world',
    title: 'World Briefing',
    url: 'https://example.com/world.xml',
    tags: [],
    unreadCount: 9,
    articleCount: 240,
    emoji: '🌍',
    sortOrder: 0,
    lastFetched: new Date('2026-10-10T06:50:00.000Z'),
  },
  {
    id: 'feed-culture',
    title: 'Culture Journal',
    url: 'https://example.com/culture.xml',
    tags: [],
    unreadCount: 0,
    articleCount: 77,
    favicon: BLUE_FAVICON,
    faviconHasTransparency: false,
    sortOrder: 1,
    lastFetched: new Date('2026-10-10T06:40:00.000Z'),
  },
  {
    id: 'feed-long',
    title: 'A deliberately long publication title for overflow and truncation checks',
    url: 'https://example.com/long.xml',
    tags: [],
    unreadCount: 31,
    articleCount: 98,
    favicon: AMBER_FAVICON,
    faviconHasTransparency: false,
    sortOrder: 2,
    lastFetched: new Date('2026-10-10T06:30:00.000Z'),
  },
  {
    id: 'feed-cjk',
    title: '字里行间 · 阅读与设计',
    url: 'https://example.com/cjk.xml',
    tags: [],
    unreadCount: 6,
    articleCount: 44,
    emoji: '字',
    sortOrder: 3,
    lastFetched: new Date('2026-10-10T06:20:00.000Z'),
  },
] satisfies Feed[];

export const THEME_DEBUG_TAGS = [
  {
    name: 'Design',
    feedIds: ['feed-design', 'feed-type'],
    createdAt: '2026-08-01T08:00:00.000Z',
    emoji: '🎨',
    sortOrder: 0,
  },
  {
    name: 'Technology',
    feedIds: ['feed-tech', 'feed-research'],
    createdAt: '2026-08-02T08:00:00.000Z',
    emoji: '⌘',
    sortOrder: 1,
  },
] satisfies Tag[];

export const THEME_DEBUG_ARTICLES = [
  {
    hash: 'theme-article-1',
    title: 'Designing calm interfaces for information-dense reading',
    description: 'A practical look at spacing, contrast, and hierarchy in a desktop reader.',
    content: '<p>Calm interfaces let the content lead while controls remain easy to find.</p>',
    link: 'https://example.com/articles/calm-interfaces',
    author: 'Maya Chen',
    publishedDate: '2026-10-10T07:45:00.000Z',
    fetchedDate: '2026-10-10T07:46:00.000Z',
    feedId: 'feed-design',
    feedUrl: 'https://example.com/design.xml',
    feedTitle: 'Design Systems Weekly',
    feedFavicon: BLUE_FAVICON,
    feedFaviconHasTransparency: false,
    read: false,
    starred: true,
    saved: false,
    previewImage: PREVIEW_IMAGE,
  },
  {
    hash: 'theme-article-2',
    title: 'A field guide to modern reading typography',
    description: 'Line length, rhythm, and type choices that stay comfortable across themes.',
    content: '<p>Typography is the quiet structure behind a good reading experience.</p>',
    link: 'https://example.com/articles/reading-type',
    author: 'Noah Williams',
    publishedDate: '2026-10-10T06:20:00.000Z',
    fetchedDate: '2026-10-10T06:21:00.000Z',
    feedId: 'feed-type',
    feedUrl: 'https://example.com/type.xml',
    feedTitle: 'Typography & Reading',
    read: true,
    starred: false,
    saved: true,
    savedArticleId: 'saved-theme-2',
  },
  {
    hash: 'theme-article-3',
    title: '从纸张到屏幕：长篇阅读如何保持节奏',
    description: '在不同字体、字重和主题之间，保持清晰、稳定且舒适的阅读体验。',
    content: '<p>好的阅读界面让文字成为视觉中心，同时保留自然的层次。</p>',
    link: 'https://example.com/articles/cjk-reading',
    author: '林川',
    publishedDate: '2026-10-09T22:10:00.000Z',
    fetchedDate: '2026-10-09T22:11:00.000Z',
    feedId: 'feed-cjk',
    feedUrl: 'https://example.com/cjk.xml',
    feedTitle: '字里行间 · 阅读与设计',
    feedFavicon: AMBER_FAVICON,
    feedFaviconHasTransparency: false,
    read: false,
    starred: false,
    saved: false,
  },
  {
    hash: 'theme-article-4',
    title: 'Why local-first software feels different',
    description: 'Ownership, latency, and privacy become visible product qualities.',
    content: '<p>Local-first tools make the user’s device the durable center of the experience.</p>',
    link: 'https://example.com/articles/local-first',
    author: 'Ari Singh',
    publishedDate: '2026-10-09T17:30:00.000Z',
    fetchedDate: '2026-10-09T17:31:00.000Z',
    feedId: 'feed-tech',
    feedUrl: 'https://example.com/tech.xml',
    feedTitle: 'Independent Technology Review',
    read: true,
    starred: false,
    saved: false,
    previewImage: PREVIEW_IMAGE,
  },
  {
    hash: 'theme-article-5',
    title: 'The small details that make a sidebar feel stable',
    description: 'Alignment, hit targets, and restrained motion build confidence.',
    content: '<p>Stable sidebars preserve place and make repeated navigation predictable.</p>',
    link: 'https://example.com/articles/stable-sidebar',
    author: 'Elena Park',
    publishedDate: '2026-10-09T12:00:00.000Z',
    fetchedDate: '2026-10-09T12:01:00.000Z',
    feedId: 'feed-design',
    feedUrl: 'https://example.com/design.xml',
    feedTitle: 'Design Systems Weekly',
    feedFavicon: BLUE_FAVICON,
    feedFaviconHasTransparency: false,
    read: false,
    starred: false,
    saved: false,
  },
  {
    hash: 'theme-article-6',
    title: 'A very long article title used to inspect wrapping, truncation, vertical rhythm, and visual balance in narrow reader columns',
    description: 'Long metadata should remain legible without pushing actions beyond the viewport.',
    content: '<p>Long text is a useful stress case for every responsive surface.</p>',
    link: 'https://example.com/articles/long-title',
    author: 'Theme Lab',
    publishedDate: '2026-10-08T09:00:00.000Z',
    fetchedDate: '2026-10-08T09:01:00.000Z',
    feedId: 'feed-long',
    feedUrl: 'https://example.com/long.xml',
    feedTitle: 'A deliberately long publication title for overflow and truncation checks',
    read: false,
    starred: false,
    saved: false,
  },
  {
    hash: 'theme-article-7',
    title: 'Building a useful color system from semantic tokens',
    description: 'Theme values work best when components consume intent rather than raw colors.',
    content: '<p>Semantic tokens keep visual decisions coherent as themes evolve.</p>',
    link: 'https://example.com/articles/semantic-color',
    author: 'Mina Alvarez',
    publishedDate: '2026-10-07T18:15:00.000Z',
    fetchedDate: '2026-10-07T18:16:00.000Z',
    feedId: 'feed-research',
    feedUrl: 'https://example.com/research.xml',
    feedTitle: 'Research Notes',
    read: true,
    starred: false,
    saved: false,
  },
  {
    hash: 'theme-article-8',
    title: 'Weekly culture notes: books, exhibitions, and sound',
    description: 'A compact digest with enough variation to inspect the bottom of the list.',
    content: '<p>A final fixture makes the list’s lower edge and scroll behavior visible.</p>',
    link: 'https://example.com/articles/culture-notes',
    author: 'Culture Desk',
    publishedDate: '2026-10-06T14:40:00.000Z',
    fetchedDate: '2026-10-06T14:41:00.000Z',
    feedId: 'feed-culture',
    feedUrl: 'https://example.com/culture.xml',
    feedTitle: 'Culture Journal',
    read: false,
    starred: false,
    saved: false,
  },
] satisfies Article[];

export const THEME_DEBUG_LONG_ARTICLE = {
  ...THEME_DEBUG_ARTICLES[0],
  hash: 'theme-article-long',
  title: 'A reader should disappear until only the story remains',
  content: `
    <p><strong>Theme Lab</strong> uses this article to exercise the complete reading surface with realistic structure and enough content to scroll.</p>
    <h2>Hierarchy before decoration</h2>
    <p>A robust theme begins with semantic contrast. Primary text, secondary metadata, interactive accents, borders, and surfaces each need a stable purpose before individual colors are chosen.</p>
    <blockquote>Good reading software feels quiet, but every quiet detail is deliberate.</blockquote>
    <h2>Typography across scripts</h2>
    <p>English text and 中文内容 should share a compatible rhythm. The non-ASCII font fallback must feel intentional rather than like an emergency substitute.</p>
    <ul><li>Keep line length comfortable.</li><li>Preserve clear heading intervals.</li><li>Use weight and color together, not interchangeably.</li></ul>
    <h2>Code and structured content</h2>
    <pre><code class="language-css">:root {
  --article-content-font-size: 18px;
  --article-content-line-height: 1.8;
}</code></pre>
    <p>Inline <code>semantic tokens</code> should remain distinct in both light and dark themes.</p>
    <h2>Tables and links</h2>
    <table><thead><tr><th>Surface</th><th>Theme check</th></tr></thead><tbody><tr><td>Sidebar</td><td>Density and selection</td></tr><tr><td>Article list</td><td>Hierarchy and state</td></tr><tr><td>Reader</td><td>Long-form comfort</td></tr></tbody></table>
    <p><a href="https://example.com/theme-lab">Links</a> should read as interactive without overpowering nearby text.</p>
    <h2>Scroll-end verification</h2>
    <p>The final paragraphs make it possible to inspect sticky chrome, edge insets, scrollbar treatment, and the article’s bottom spacing in a short viewport.</p>
    <p>Change the Storybook toolbar controls while reading: the content, metadata, controls, and code blocks should all update as one coherent system.</p>
    <p><em>End of the theme-debugging fixture.</em></p>
  `,
} satisfies Article;

