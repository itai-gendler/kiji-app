import React, { createContext, useContext, useState, useEffect, useRef, ReactNode, useCallback } from 'react';
import {
  settingsManager,
  DEFAULT_SETTINGS,
  resolveActiveReaderTheme,
  resolveThemedFontFamilies,
  resolveThemedReadingLayout,
} from '@/services/settings';
import type { Theme, UiThemeVariant, FontFamilySettings, ReadingLayoutSettings } from '@/services/settings';
import { applyFontFamiliesToRoot, applyReadingLayoutToRoot, applySurfaceFillOpacityToRoot } from '@/services/settings/styleVariables';
import { isSurfaceFillDragging } from '@/services/settings/surfaceFillOpacity';
import { loadFontsFromFamilyString } from '@/utils/googleFonts';
import { tauriClient } from '@/lib/tauriClient';
import { getRendererWindowType } from '@/utils/rendererWindow';

/** Reader themes restyle reading surfaces only; Settings and Update windows keep the built-in palette. */
const appliesReaderThemeToWindow = (): boolean => {
  const windowType = getRendererWindowType();
  return windowType === 'main' || windowType === 'article';
};

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  fontFamilies: FontFamilySettings;
  updateFontFamilies: (fonts: Partial<FontFamilySettings>) => Promise<void>;
  readingLayout: ReadingLayoutSettings;
  updateReadingLayout: (layout: Partial<ReadingLayoutSettings>) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(DEFAULT_SETTINGS.theme);
  const [effectiveTheme, setEffectiveTheme] = useState<'light' | 'dark'>(() => (
    window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  ));
  const [isInitialized, setIsInitialized] = useState(false);
  const [fontFamilies, setFontFamilies] = useState<FontFamilySettings>(
    DEFAULT_SETTINGS.fontFamilies
  );
  const [readingLayout, setReadingLayout] = useState<ReadingLayoutSettings>(
    DEFAULT_SETTINGS.readingLayout
  );
  const [uiThemeVariant, setUiThemeVariant] = useState<UiThemeVariant>(DEFAULT_SETTINGS.uiThemeVariant);
  const [readerTheme, setReaderTheme] = useState<string>(DEFAULT_SETTINGS.readerTheme);
  const [appliesReaderTheme] = useState(appliesReaderThemeToWindow);
  // One theme for both schemes; reader-themes.css picks its light or dark version.
  // Presets are module constants, so this reference is stable across renders.
  const activeReaderTheme = appliesReaderTheme
    ? resolveActiveReaderTheme(readerTheme)
    : undefined;
  const skipInitialThemePersistRef = useRef(true);

  const getSystemTheme = (): 'light' | 'dark' => (
    window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  );

  const resolveTheme = (themeMode: Theme): 'light' | 'dark' => {
    if (themeMode === 'auto') {
      return getSystemTheme();
    }
    return themeMode;
  };

  // Initialize theme, fonts, and reading layout from persisted settings.
  useEffect(() => {
    const initializeSettings = async () => {
      try {
        // One settings load covers theme, fonts, and reading layout; the
        // per-field getters each issue a separate native IPC round-trip.
        const settings = await settingsManager.getSettings();
        setThemeState(settings.theme);
        setEffectiveTheme(resolveTheme(settings.theme));
        setFontFamilies(settings.fontFamilies);
        setReadingLayout(settings.readingLayout);
        setUiThemeVariant(settings.uiThemeVariant);
        setReaderTheme(settings.readerTheme);
        applySurfaceFillOpacityToRoot(settings.surfaceFillOpacity);
      } catch (error) {
        console.error('Error loading settings:', error);
        // Fallback to auto mode following system preference
        setThemeState(DEFAULT_SETTINGS.theme);
        setEffectiveTheme(getSystemTheme());
      } finally {
        setIsInitialized(true);
      }
    };

    initializeSettings();
  }, []);

  useEffect(() => {
    if (!isInitialized) return;

    const resolvedTheme = resolveTheme(theme);
    setEffectiveTheme(resolvedTheme);
  }, [theme, isInitialized]);

  useEffect(() => {
    if (!isInitialized) return;

    document.documentElement.setAttribute('data-theme', effectiveTheme);
    document.documentElement.style.colorScheme = effectiveTheme;

    // Pin the native NSAppearance to the app theme so macOS window vibrancy
    // (sidebar material, menus, chrome) matches even when the system
    // appearance differs; "system" hands control back to macOS in auto mode.
    tauriClient.system.appearance
      .set({ appearance: theme === 'auto' ? 'system' : effectiveTheme })
      .catch((error) => console.error('Error applying native appearance:', error));
  }, [effectiveTheme, theme, isInitialized]);

  // Apply the surface style variant (modern glass vs classic solid) to the root.
  useEffect(() => {
    if (!isInitialized) return;

    document.documentElement.setAttribute('data-ui-theme', uiThemeVariant);
  }, [uiThemeVariant, isInitialized]);

  // Apply the reader theme palette (reader-themes.css keys every token off this attribute).
  const activeReaderThemeId = activeReaderTheme?.id;
  useEffect(() => {
    if (!isInitialized) return;

    if (activeReaderThemeId) {
      document.documentElement.setAttribute('data-reader-theme', activeReaderThemeId);
      document.documentElement.setAttribute('data-reader-scheme', effectiveTheme);
    } else {
      document.documentElement.removeAttribute('data-reader-theme');
      document.documentElement.removeAttribute('data-reader-scheme');
    }
  }, [activeReaderThemeId, effectiveTheme, isInitialized]);

  // Apply font families to CSS variables (load Google Fonts first)
  useEffect(() => {
    if (!isInitialized) return;

    // A reader theme supplies article fonts only where the user kept the default.
    const effectiveFonts = resolveThemedFontFamilies(fontFamilies, activeReaderTheme);
    // Google Font loads settle in network order, so a superseded run (e.g. the
    // light preset after a quick switch to dark) must not write its fonts last.
    let superseded = false;
    const applyFonts = async () => {
      try {
        // Load Google Fonts if needed
        await Promise.all([
          loadFontsFromFamilyString(effectiveFonts.uiFont),
          loadFontsFromFamilyString(effectiveFonts.articleTitleFont),
          loadFontsFromFamilyString(effectiveFonts.articleContentFont),
          loadFontsFromFamilyString(effectiveFonts.articleNonAsciiFont),
        ]);
      } catch (error) {
        console.error('Error loading fonts:', error);
        // Still apply fonts below even if loading fails so the fallback stacks take effect.
      }

      // Apply fonts after loading so the renderer uses the requested stacks immediately.
      if (!superseded) {
        applyFontFamiliesToRoot(effectiveFonts);
      }
    };

    applyFonts();
    return () => {
      superseded = true;
    };
  }, [fontFamilies, activeReaderTheme, isInitialized]);

  // Apply reading layout variables once settings are loaded so every article
  // surface shares the same typography and width rules.
  useEffect(() => {
    if (!isInitialized) return;
    applyReadingLayoutToRoot(
      resolveThemedReadingLayout(readingLayout, activeReaderTheme, DEFAULT_SETTINGS.readingLayout),
    );
  }, [readingLayout, activeReaderTheme, isInitialized]);

  const updateFontFamilies = async (fonts: Partial<FontFamilySettings>) => {
    try {
      await settingsManager.setFontFamilies(fonts);
      const updatedFonts = await settingsManager.getFontFamilies();
      setFontFamilies(updatedFonts);
    } catch (error) {
      console.error('Error updating font families:', error);
      throw error;
    }
  };

  const updateReadingLayout = async (layout: Partial<ReadingLayoutSettings>) => {
    try {
      await settingsManager.setReadingLayout(layout);
      const updatedReadingLayout = await settingsManager.getReadingLayout();
      setReadingLayout(updatedReadingLayout);
    } catch (error) {
      console.error('Error updating reading layout:', error);
      throw error;
    }
  };

  const persistTheme = useCallback(async (nextTheme: Theme) => {
    try {
      await settingsManager.setTheme(nextTheme);
    } catch (error) {
      console.error('Error saving theme to settings:', error);
    }
  }, []);

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prevTheme) => (
      prevTheme === 'auto' ? 'light' : prevTheme === 'light' ? 'dark' : 'auto'
    ));
  }, []);

  useEffect(() => {
    if (!isInitialized) return;
    if (skipInitialThemePersistRef.current) {
      skipInitialThemePersistRef.current = false;
      return;
    }
    void persistTheme(theme);
  }, [theme, isInitialized, persistTheme]);

  // Listen for system theme changes while in auto mode
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      if (theme === 'auto') {
        setEffectiveTheme(e.matches ? 'dark' : 'light');
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  // Listen for settings changes from other windows
  useEffect(() => {
    if (!window.kijiAPI?.onSettingsChanged) return;

    const handleSettingsChanged = async () => {
      try {
        console.log('[ThemeContext] Settings changed, reloading appearance settings...');
        const settings = await settingsManager.getSettings();
        setThemeState(settings.theme);
        setEffectiveTheme(resolveTheme(settings.theme));
        setFontFamilies(settings.fontFamilies);
        setReadingLayout(settings.readingLayout);
        setUiThemeVariant(settings.uiThemeVariant);
        setReaderTheme(settings.readerTheme);
        if (!isSurfaceFillDragging()) {
          applySurfaceFillOpacityToRoot(settings.surfaceFillOpacity);
        }
      } catch (error) {
        console.error('[ThemeContext] Error reloading appearance settings after settings change:', error);
      }
    };

    return window.kijiAPI.onSettingsChanged(handleSettingsChanged);
  }, []);

  return (
    <ThemeContext.Provider value={{
      theme,
      toggleTheme,
      setTheme,
      fontFamilies,
      updateFontFamilies,
      readingLayout,
      updateReadingLayout,
    }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
