import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const css = readFileSync(join(process.cwd(), 'src/components/ManageFeedsWindow/ManageFeedsWindow.css'), 'utf8');

const declarations = (selector: string): Record<string, string> => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = css.match(new RegExp(`(?:^|\\n)${escaped} \\{([^}]*)\\}`));
  if (!match) throw new Error(`missing rule ${selector}`);
  return Object.fromEntries(match[1].split(';').map((line) => line.trim()).filter(Boolean).map((line) => {
    const [key, ...value] = line.split(':');
    return [key.trim(), value.join(':').trim()];
  }));
};

const px = (value: string) => Number.parseFloat(value);

describe('Manage Feeds window styles', () => {
  it('uses macOS list scale: medium-or-heavier ~13px titles over ~12px regular secondary text', () => {
    const title = declarations('.mf-row-title');
    expect(px(title['font-size'])).toBeGreaterThanOrEqual(13);
    expect(Number(title['font-weight'])).toBeGreaterThanOrEqual(500);

    for (const selector of ['.mf-row-site', '.mf-status', '.mf-row-stat-unit']) {
      const rule = declarations(selector);
      expect(px(rule['font-size']), selector).toBeGreaterThanOrEqual(11.5);
      // Secondary text uses the readable secondary color, not the faint tertiary one.
      expect(rule.color, selector).toBe('var(--settings-text-secondary)');
    }
    expect(px(declarations('.mf-row')['min-height'])).toBeGreaterThanOrEqual(56);
  });

  it('lays the Library card out like the other tabs, with fixed row columns', () => {
    const card = declarations('.mf-list-card');
    expect(card['max-width']).toBeUndefined();
    expect(card.margin).toBe('0 12px');
    expect(declarations('.mf-library-visibility').width).toBe('20px');
    const state = declarations('.mf-library-state');
    expect(state.width).toBe('56px');
    expect(state['text-align']).toBe('right');
    expect(state['flex-shrink']).toBe('0');
  });

  it('puts the tabs in a centered toolbar row under the title bar', () => {
    const tabs = declarations('.mf-toolbar-tabs');
    expect(tabs['justify-content']).toBe('center');
    const tab = declarations('.mf-toolbar-tab');
    expect(tab['flex-direction']).toBe('column');
    expect(declarations('.mf-toolbar-tab.is-active')['background-color']).toBeTruthy();
    expect(css).not.toContain('.settings-sidebar');
  });
});
