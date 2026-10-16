import type { ReactNode } from 'react';
import type {
  FontFamilySettings,
  ReadingLayoutSettings,
  Theme,
} from '../../src/services/settings/types';
import {
  getThemeDebugTheme,
  selectThemeDebugTheme,
  setThemeDebugRootTheme,
} from '../../src/stories/themeDebugRuntime';

const fontFamilies: FontFamilySettings = {
  uiFont: "'Google Sans', system-ui, -apple-system, 'PingFang SC', sans-serif",
  articleTitleFont: "'Aktiv Grotesk', system-ui, -apple-system, 'PingFang SC', sans-serif",
  articleContentFont: "'Aktiv Grotesk', system-ui, -apple-system, 'PingFang SC', sans-serif",
  articleNonAsciiFont: "'Aktiv Grotesk', system-ui, -apple-system, 'PingFang SC', sans-serif",
};

const readingLayout: ReadingLayoutSettings = {
  enabled: false,
  fontSize: 18,
  fontWeight: 500,
  lineSpacing: 1.8,
  characterSpacing: 0,
  wordSpacing: 0,
  maxWidth: 720,
  justifyText: false,
};

const asyncNoop = async (): Promise<void> => {};

export function ThemeProvider({ children }: { children: ReactNode }) {
  return children;
}

export function useTheme() {
  const theme = getThemeDebugTheme();

  return {
    theme,
    toggleTheme: () => {
      const nextTheme: Theme = theme === 'dark' ? 'light' : 'dark';
      selectThemeDebugTheme(nextTheme);
      setThemeDebugRootTheme(nextTheme);
    },
    setTheme: (nextTheme: Theme) => {
      selectThemeDebugTheme(nextTheme);
      setThemeDebugRootTheme(nextTheme);
    },
    fontFamilies,
    updateFontFamilies: asyncNoop,
    readingLayout,
    updateReadingLayout: asyncNoop,
  };
}

