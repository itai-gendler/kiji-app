import { useLayoutEffect, type ReactNode } from 'react';
import type { Decorator, Preview } from '@storybook/react-vite';
import {
  selectThemeDebugVariant,
  selectThemeDebugTheme,
  type ThemeDebugVariant,
} from '../src/stories/themeDebugRuntime';
// Relative path: Storybook aliases `@/services/settings` (and its subpaths) to a data mock.
import { findReaderTheme, READER_THEMES, type ReaderTheme } from '../src/services/settings/readerThemes';
import '../src/styles/google-sans.css';
import '../src/styles/golos-text.css';
import '../src/styles/aktiv-grotesk.css';
import '../src/styles/theme.css';
import '../src/styles/framework/index.css';
import '../src/styles/base.css';
import '../src/styles/view.css';
import '../src/styles/ui-theme-classic.css';
import '../src/styles/reader-themes.css';
import './preview.css';

interface RootStateSnapshot {
  theme: string | null;
  uiTheme: string | null;
  os: string | null;
  readerTheme: string | null;
  readerScheme: string | null;
  rootStyle: string;
  bodyAppClasses: string[];
  bodyStyle: string;
  kijiApi: unknown;
}

function restoreAttribute(name: string, value: string | null): void {
  if (value === null) {
    document.documentElement.removeAttribute(name);
    return;
  }
  document.documentElement.setAttribute(name, value);
}

/** Storybook drives its own `sb-*` body classes (e.g. the preparing-story spinner). */
const isStorybookClass = (name: string) => name.startsWith('sb-');

const appBodyClasses = (): string[] => [...document.body.classList].filter((name) => !isStorybookClass(name));

/**
 * Undo body classes the app components added, without touching `sb-*`.
 * Writing back a whole `className` snapshot on remount (every toolbar change)
 * re-applied `sb-show-preparing-story` and left the spinner over a rendered story.
 */
function restoreBodyAppClasses(previous: string[]): void {
  for (const name of appBodyClasses()) {
    if (!previous.includes(name)) document.body.classList.remove(name);
  }
  document.body.classList.add(...previous);
}

function ThemeDebugRoot({
  children,
  theme,
  uiTheme,
  os,
  readerTheme,
}: {
  children: ReactNode;
  theme: 'light' | 'dark';
  uiTheme: 'modern' | 'classic';
  os: 'macos' | 'windows' | 'linux';
  readerTheme: ReaderTheme | undefined;
}) {
  useLayoutEffect(() => {
    const previous: RootStateSnapshot = {
      theme: document.documentElement.getAttribute('data-theme'),
      uiTheme: document.documentElement.getAttribute('data-ui-theme'),
      os: document.documentElement.getAttribute('data-os'),
      readerTheme: document.documentElement.getAttribute('data-reader-theme'),
      readerScheme: document.documentElement.getAttribute('data-reader-scheme'),
      rootStyle: document.documentElement.style.cssText,
      bodyAppClasses: appBodyClasses(),
      bodyStyle: document.body.style.cssText,
      kijiApi: Reflect.get(window, 'kijiAPI'),
    };

    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.setAttribute('data-ui-theme', uiTheme);
    document.documentElement.setAttribute('data-os', os);
    restoreAttribute('data-reader-theme', readerTheme?.id ?? null);
    restoreAttribute('data-reader-scheme', readerTheme ? theme : null);
    document.documentElement.style.colorScheme = theme;
    // Reader presets own their accent; production sets the system accent inline too.
    const presetAccent = readerTheme
      ? getComputedStyle(document.documentElement).getPropertyValue('--rt-accent').trim()
      : '';
    document.documentElement.style.setProperty('--system-accent-color', presetAccent || '#0a84ff');
    document.documentElement.style.setProperty('--max-article-width', '750px');
    document.documentElement.style.setProperty('--max-article-content-width', '720px');
    document.documentElement.style.setProperty('--article-content-font-size', '18px');
    document.documentElement.style.setProperty('--article-content-font-weight', String(readerTheme?.contentFontWeight ?? 500));
    document.documentElement.style.setProperty('--article-content-line-height', String(readerTheme?.contentLineHeight ?? 1.8));
    // Production ThemeProvider sets article fonts inline the same way (default fonts only).
    if (readerTheme) {
      document.documentElement.style.setProperty('--font-family-article-title', readerTheme.titleFont);
      document.documentElement.style.setProperty('--font-family-article-content', readerTheme.bodyFont);
    }
    Reflect.deleteProperty(window, 'kijiAPI');

    return () => {
      restoreAttribute('data-theme', previous.theme);
      restoreAttribute('data-ui-theme', previous.uiTheme);
      restoreAttribute('data-os', previous.os);
      restoreAttribute('data-reader-theme', previous.readerTheme);
      restoreAttribute('data-reader-scheme', previous.readerScheme);
      document.documentElement.style.cssText = previous.rootStyle;
      restoreBodyAppClasses(previous.bodyAppClasses);
      document.body.style.cssText = previous.bodyStyle;
      if (previous.kijiApi === undefined) {
        Reflect.deleteProperty(window, 'kijiAPI');
      } else {
        Reflect.set(window, 'kijiAPI', previous.kijiApi);
      }
    };
  }, [os, readerTheme, theme, uiTheme]);

  return <div className="theme-debug-backdrop">{children}</div>;
}

const withThemeDebug: Decorator = (Story, context) => {
  // Every reader theme has both versions; the Light/Dark toolbar picks one, as in the app.
  const readerTheme = findReaderTheme(context.globals.readerTheme);
  const theme = context.globals.theme === 'dark' ? 'dark' : 'light';
  const uiTheme = context.globals.uiTheme === 'classic' ? 'classic' : 'modern';
  const os = context.globals.platform === 'windows'
    ? 'windows'
    : context.globals.platform === 'linux'
      ? 'linux'
      : 'macos';
  const variant = (context.parameters.kiji?.variant ?? 'sidebar-default') as ThemeDebugVariant;
  selectThemeDebugVariant(variant);
  selectThemeDebugTheme(theme);

  return (
    <ThemeDebugRoot
      key={`${context.id}:${theme}:${uiTheme}:${os}:${readerTheme?.id ?? 'default'}`}
      theme={theme}
      uiTheme={uiTheme}
      os={os}
      readerTheme={readerTheme}
    >
      <Story />
    </ThemeDebugRoot>
  );
};

const preview: Preview = {
  decorators: [withThemeDebug],
  parameters: {
    layout: 'fullscreen',
    controls: {
      expanded: true,
    },
    options: {
      storySort: {
        order: ['Theme Debug', ['Reader Themes', 'Sidebar', 'Article List', 'Article View']],
      },
    },
  },
  initialGlobals: {
    theme: 'light',
    uiTheme: 'modern',
    platform: 'macos',
    readerTheme: 'default',
  },
  globalTypes: {
    theme: {
      description: 'Reader color theme',
      toolbar: {
        icon: 'circlehollow',
        items: [
          { value: 'light', title: 'Light' },
          { value: 'dark', title: 'Dark' },
        ],
      },
    },
    uiTheme: {
      description: 'Surface treatment',
      toolbar: {
        icon: 'paintbrush',
        items: [
          { value: 'modern', title: 'Modern' },
          { value: 'classic', title: 'Classic' },
        ],
      },
    },
    readerTheme: {
      description: 'Reader theme (Light/Dark picks its version)',
      toolbar: {
        icon: 'book',
        dynamicTitle: true,
        items: [
          { value: 'default', title: 'KiJi default' },
          ...READER_THEMES.map((readerTheme) => ({
            value: readerTheme.id,
            title: readerTheme.label,
          })),
        ],
      },
    },
    platform: {
      description: 'Platform-specific CSS',
      toolbar: {
        icon: 'browser',
        items: [
          { value: 'macos', title: 'macOS' },
          { value: 'windows', title: 'Windows' },
          { value: 'linux', title: 'Linux' },
        ],
      },
    },
  },
};

export default preview;

