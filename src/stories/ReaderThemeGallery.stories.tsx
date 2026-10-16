import { useLayoutEffect, useRef, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { READER_THEMES, type ReaderTheme, type ReaderThemeScheme } from '../services/settings/readerThemes';

/** One card: a theme in one of its two versions. */
type ReaderThemePreset = ReaderTheme & { scheme: ReaderThemeScheme };

const PAIRED_PRESETS: readonly ReaderThemePreset[] = READER_THEMES.flatMap((theme) => [
  { ...theme, scheme: 'light' as const },
  { ...theme, scheme: 'dark' as const },
]);
import './readerThemeGallery.css';

const SWATCHES = ['--rt-page', '--rt-ink', '--rt-ink-soft', '--rt-accent'] as const;

function parseHex(value: string): [number, number, number] | null {
  const match = /^#([0-9a-f]{6})$/i.exec(value.trim());
  if (!match) return null;
  const n = Number.parseInt(match[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function relativeLuminance([r, g, b]: [number, number, number]): number {
  const channel = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** WCAG 2.x contrast ratio between two `#rrggbb` colors. */
function contrastRatio(fg: string, bg: string): number | null {
  const a = parseHex(fg);
  const b = parseHex(bg);
  if (!a || !b) return null;
  const [hi, lo] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * Turn the body-text contrast into the badge shown on each card.
 * `preset` is passed so dim-room themes can be judged differently from daylight ones.
 */
function rateReadability(ratio: number, preset: ReaderThemePreset): string {
  // TODO(human)
  void preset;
  return ratio.toFixed(1);
}

function ReaderThemeCard({ preset }: { preset: ReaderThemePreset }) {
  const cardRef = useRef<HTMLElement>(null);
  const [tokens, setTokens] = useState<Record<string, string>>({});

  useLayoutEffect(() => {
    if (!cardRef.current) return;
    const style = getComputedStyle(cardRef.current);
    setTokens(Object.fromEntries(SWATCHES.map((name) => [name, style.getPropertyValue(name).trim()])));
  }, []);

  const ratio = tokens['--rt-ink'] && tokens['--rt-page']
    ? contrastRatio(tokens['--rt-ink'], tokens['--rt-page'])
    : null;

  return (
    <article
      ref={cardRef}
      className="reader-theme-card"
      data-reader-theme={preset.id}
      data-reader-scheme={preset.scheme}
      style={{
        fontWeight: preset.contentFontWeight,
        lineHeight: preset.contentLineHeight,
        ['--rt-font-title' as string]: preset.titleFont,
        ['--rt-font-body' as string]: preset.bodyFont,
      }}
    >
      <header className="reader-theme-card__meta">
        <span className="reader-theme-card__label">{preset.label}</span>
        <span className="reader-theme-card__scheme">{preset.scheme}</span>
        {ratio !== null && (
          <span className="reader-theme-card__badge" title="Body text contrast (WCAG)">
            {rateReadability(ratio, preset)}
          </span>
        )}
      </header>

      <h2 className="reader-theme-card__title">The Quiet Hours of the Archive</h2>
      <p className="reader-theme-card__byline">Field Notes · 6 min read</p>
      <p className="reader-theme-card__body">
        Long after the reading room closed, the lamps stayed on over the map tables. Every
        drawer held a different coastline, and each one had been redrawn by someone who
        never saw the sea. <a href="#theme">Continue reading</a>
      </p>
      <p className="reader-theme-card__body reader-theme-card__body--cjk">
        夜深了，阅览室的灯还亮着，书页在指尖慢慢翻过。
      </p>

      <div className="reader-theme-card__swatches">
        {SWATCHES.map((name) => (
          <span key={name} className="reader-theme-card__swatch" title={`${name} ${tokens[name] ?? ''}`}>
            <span style={{ background: `var(${name})` }} />
            {tokens[name]}
          </span>
        ))}
      </div>

      <footer className="reader-theme-card__footer">
        <span>{preset.typeface}</span>
        <span>{preset.inspiration}</span>
      </footer>
    </article>
  );
}

function ReaderThemeGallery({ presets }: { presets: readonly ReaderThemePreset[] }) {
  return (
    <div className="reader-theme-gallery">
      {presets.map((preset) => (
        <ReaderThemeCard key={`${preset.id}:${preset.scheme}`} preset={preset} />
      ))}
    </div>
  );
}

const meta = {
  title: 'Theme Debug/Reader Themes',
  component: ReaderThemeGallery,
  parameters: {
    layout: 'fullscreen',
  },
  args: {
    presets: PAIRED_PRESETS,
  },
} satisfies Meta<typeof ReaderThemeGallery>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Every theme as a light/dark pair. Use the book toolbar menu (plus Light/Dark) to apply one to the real surfaces. */
export const Gallery: Story = {};

