import React from 'react';

/**
 * Line glyphs for the Settings window, drawn in the spirit of macOS SF Symbols (regular weight):
 * 24-unit grid, ~1.6 stroke, round caps and joins, `currentColor`. Hand-drawn here because
 * SF Symbols artwork can't be redistributed; don't swap these for Material icons.
 * Glyphs size with `font-size` (1em), like text.
 */
export interface SettingsGlyphProps {
  className?: string;
}

type GlyphComponent = React.FC<SettingsGlyphProps>;

const glyph = (name: string, body: React.ReactNode): GlyphComponent => {
  const Glyph: GlyphComponent = ({ className }) => (
    <svg
      className={`settings-glyph${className ? ` ${className}` : ''}`}
      data-glyph={name}
      width="1em"
      height="1em"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {body}
    </svg>
  );
  Glyph.displayName = `Glyph(${name})`;
  return Glyph;
};

/** Gear outline: alternating outer/inner radii with short flat tooth tops. */
const gearPath = (() => {
  const teeth = 8;
  const outer = 9.4;
  const inner = 7.2;
  const points: string[] = [];
  for (let i = 0; i < teeth; i += 1) {
    const base = (i / teeth) * Math.PI * 2;
    const step = (Math.PI * 2) / teeth;
    const angles: Array<[number, number]> = [
      [base - step * 0.32, inner],
      [base - step * 0.18, outer],
      [base + step * 0.18, outer],
      [base + step * 0.32, inner],
    ];
    for (const [angle, radius] of angles) {
      points.push(`${(12 + radius * Math.cos(angle)).toFixed(2)} ${(12 + radius * Math.sin(angle)).toFixed(2)}`);
    }
  }
  return `M${points.join(' L')} Z`;
})();

/* Categories */
export const GearGlyph = glyph('gear', (
  <>
    <path d={gearPath} />
    <circle cx="12" cy="12" r="3" />
  </>
));

export const AppearanceGlyph = glyph('appearance', (
  <>
    <circle cx="12" cy="12" r="8.6" />
    <path d="M12 3.4a8.6 8.6 0 0 0 0 17.2Z" fill="currentColor" stroke="none" />
  </>
));

export const BookGlyph = glyph('book', (
  <>
    <path d="M12 6.6C10.2 5.2 7.4 4.6 3.6 5v13.2c3.8-.4 6.6.2 8.4 1.6 1.8-1.4 4.6-2 8.4-1.6V5c-3.8-.4-6.6.2-8.4 1.6Z" />
    <path d="M12 6.6v13.2" />
  </>
));

export const KeyboardGlyph = glyph('keyboard', (
  <>
    <rect x="2.8" y="6" width="18.4" height="12" rx="2.6" />
    <path d="M6.6 9.6h.01M9.5 9.6h.01M12.4 9.6h.01M15.3 9.6h.01M18 9.6h.01M7.6 12.2h.01M10.5 12.2h.01M13.4 12.2h.01M16.3 12.2h.01M8.4 14.9h7.2" />
  </>
));

export const SparklesGlyph = glyph('sparkles', (
  <>
    <path d="M10.5 3.5c.5 4 2.2 5.7 6.2 6.2-4 .5-5.7 2.2-6.2 6.2-.5-4-2.2-5.7-6.2-6.2 4-.5 5.7-2.2 6.2-6.2Z" />
    <path d="M18 14.2c.25 1.9 1 2.65 2.9 2.9-1.9.25-2.65 1-2.9 2.9-.25-1.9-1-2.65-2.9-2.9 1.9-.25 2.65-1 2.9-2.9Z" />
  </>
));

export const EnvelopeGlyph = glyph('envelope', (
  <>
    <rect x="3" y="5.4" width="18" height="13.2" rx="2.4" />
    <path d="m3.8 7 8.2 6.2L20.2 7" />
  </>
));

/* Actions */
export const ResetGlyph = glyph('arrow.counterclockwise', (
  <>
    <path d="M5.3 9.2a7.4 7.4 0 1 1-.5 4.6" />
    <path d="M4.6 4.9v4.6h4.6" />
  </>
));

export const RelaunchGlyph = glyph('arrow.clockwise', (
  <>
    <path d="M18.7 9.2a7.4 7.4 0 1 0 .5 4.6" />
    <path d="M19.4 4.9v4.6h-4.6" />
  </>
));

export const FolderGlyph = glyph('folder', (
  <path d="M3.2 7.2c0-1.1.9-2 2-2h4.1l2 2.2h7.5c1.1 0 2 .9 2 2v7.6c0 1.1-.9 2-2 2H5.2c-1.1 0-2-.9-2-2Z" />
));

export const PhotoGlyph = glyph('photo', (
  <>
    <rect x="3" y="4.6" width="18" height="14.8" rx="2.4" />
    <circle cx="8.6" cy="9.6" r="1.6" />
    <path d="m3.4 16.8 4.8-4.4 3.6 3.2 3.4-3 5.4 4.6" />
  </>
));

export const DropGlyph = glyph('drop.halffull', (
  <>
    <path d="M12 3.6c3.4 4 6 7.4 6 10.6a6 6 0 0 1-12 0c0-3.2 2.6-6.6 6-10.6Z" />
    <path d="M6.2 13.6h11.6a6 6 0 0 1-11.6 0Z" fill="currentColor" stroke="none" />
  </>
));

export const CheckGlyph = glyph('checkmark', <path d="m5 12.6 4.4 4.4L19 7.4" />);

export const CopyGlyph = glyph('doc.on.doc', (
  <>
    <rect x="8.4" y="8.4" width="11.6" height="12" rx="2.2" />
    <path d="M15.6 8.4V6c0-1.2-1-2.2-2.2-2.2H6.2C5 3.8 4 4.8 4 6v8.2c0 1.2 1 2.2 2.2 2.2h2.2" />
  </>
));

export const DownloadGlyph = glyph('arrow.down.circle', (
  <>
    <circle cx="12" cy="12" r="8.6" />
    <path d="M12 7.6v8.4M8.4 12.6 12 16.2l3.6-3.6" />
  </>
));

export const OpenExternalGlyph = glyph('arrow.up.forward.square', (
  <>
    <path d="M10.6 4.8H6.6c-1.1 0-2 .9-2 2v10.6c0 1.1.9 2 2 2h10.6c1.1 0 2-.9 2-2v-4" />
    <path d="M13.8 4.4h5.8v5.8M19.4 4.6l-8 8" />
  </>
));

/* Reading layout */
export const TextSizeGlyph = glyph('textformat.size', (
  <>
    <path d="m2.8 18.6 5-13.2 5 13.2M4.6 14.2h6.4" />
    <path d="m13.8 18.6 3.6-8.8 3.6 8.8M15.1 15.6h4.6" />
  </>
));

export const BoldGlyph = glyph('bold', (
  <path d="M7.4 4.8h5.6a3.6 3.6 0 0 1 0 7.2H7.4Zm0 7.2h6.4a3.6 3.6 0 0 1 0 7.2H7.4Z" strokeWidth={2.2} />
));

export const LineSpacingGlyph = glyph('line.spacing', (
  <>
    <path d="M10.6 6.4H21M10.6 12H21M10.6 17.6H21" />
    <path d="M5.2 4v16M3 6.2 5.2 4l2.2 2.2M3 17.8 5.2 20l2.2-2.2" />
  </>
));

export const LetterSpacingGlyph = glyph('character.spacing', (
  <>
    <path d="m7.6 15 4.4-11 4.4 11M9.2 11h5.6" />
    <path d="M3.6 19.2h16.8M3.6 19.2l2-1.8M3.6 19.2l2 1.8M20.4 19.2l-2-1.8M20.4 19.2l-2 1.8" />
  </>
));

export const WordSpacingGlyph = glyph('space', <path d="M3.6 10v4.4c0 .7.5 1.2 1.2 1.2h14.4c.7 0 1.2-.5 1.2-1.2V10" />);

export const TextWidthGlyph = glyph('arrow.left.and.right', (
  <>
    <path d="M3.4 12h17.2M6.6 8.6 3.4 12l3.2 3.4M17.4 8.6l3.2 3.4-3.2 3.4" />
    <path d="M3.4 5v2M20.6 5v2M3.4 17v2M20.6 17v2" />
  </>
));

export const AlignLeftGlyph = glyph('text.alignleft', <path d="M4 6h16M4 10h10M4 14h16M4 18h10" />);

export const AlignJustifyGlyph = glyph('text.justify', <path d="M4 6h16M4 10h16M4 14h16M4 18h16" />);

/* Assistant apps (generic, no brand marks) */
export const DesktopGlyph = glyph('display', (
  <>
    <rect x="2.8" y="4" width="18.4" height="12.4" rx="2.2" />
    <path d="M9 20h6M12 16.4V20" />
  </>
));

export const TerminalGlyph = glyph('apple.terminal', (
  <>
    <rect x="2.8" y="4.4" width="18.4" height="15.2" rx="2.6" />
    <path d="m7 9.4 3 2.6-3 2.6M12.4 15h4.4" />
  </>
));

export const CodeGlyph = glyph('chevron.left.forwardslash.chevron.right', (
  <path d="M8 7.4 3.4 12 8 16.6M16 7.4l4.6 4.6-4.6 4.6M13.6 5.2l-3.2 13.6" />
));

export const BracesGlyph = glyph('curlybraces', (
  <path d="M8.6 4.4c-1.8 0-2.6.8-2.6 2.6v2.4c0 1.4-.8 2.6-2.2 2.6 1.4 0 2.2 1.2 2.2 2.6V17c0 1.8.8 2.6 2.6 2.6M15.4 4.4c1.8 0 2.6.8 2.6 2.6v2.4c0 1.4.8 2.6 2.2 2.6-1.4 0-2.2 1.2-2.2 2.6V17c0 1.8-.8 2.6-2.6 2.6" />
));

export const SlidersGlyph = glyph('slider.horizontal.3', (
  <>
    <path d="M4 7h4M12 7h8M4 12h10M18 12h2M4 17h2M10 17h10" />
    <circle cx="10" cy="7" r="2" />
    <circle cx="16" cy="12" r="2" />
    <circle cx="8" cy="17" r="2" />
  </>
));

export const GridGlyph = glyph('square.grid.2x2', (
  <>
    <rect x="3.8" y="3.8" width="6.8" height="6.8" rx="1.8" />
    <rect x="13.4" y="3.8" width="6.8" height="6.8" rx="1.8" />
    <rect x="3.8" y="13.4" width="6.8" height="6.8" rx="1.8" />
    <rect x="13.4" y="13.4" width="6.8" height="6.8" rx="1.8" />
  </>
));
