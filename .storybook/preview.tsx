import { useLayoutEffect, type ReactNode } from 'react';
import type { Decorator, Preview } from '@storybook/react-vite';
import {
  selectThemeDebugVariant,
  selectThemeDebugTheme,
  type ThemeDebugVariant,
} from '../src/stories/themeDebugRuntime';
import '../src/styles/google-sans.css';
import '../src/styles/golos-text.css';
import '../src/styles/aktiv-grotesk.css';
import '../src/styles/theme.css';
import '../src/styles/framework/index.css';
import '../src/styles/base.css';
import '../src/styles/view.css';
import '../src/styles/ui-theme-classic.css';
import './preview.css';

interface RootStateSnapshot {
  theme: string | null;
  uiTheme: string | null;
  os: string | null;
  rootStyle: string;
  bodyClassName: string;
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

function ThemeDebugRoot({
  children,
  theme,
  uiTheme,
  os,
}: {
  children: ReactNode;
  theme: 'light' | 'dark';
  uiTheme: 'modern' | 'classic';
  os: 'macos' | 'windows' | 'linux';
}) {
  useLayoutEffect(() => {
    const previous: RootStateSnapshot = {
      theme: document.documentElement.getAttribute('data-theme'),
      uiTheme: document.documentElement.getAttribute('data-ui-theme'),
      os: document.documentElement.getAttribute('data-os'),
      rootStyle: document.documentElement.style.cssText,
      bodyClassName: document.body.className,
      bodyStyle: document.body.style.cssText,
      kijiApi: Reflect.get(window, 'kijiAPI'),
    };

    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.setAttribute('data-ui-theme', uiTheme);
    document.documentElement.setAttribute('data-os', os);
    document.documentElement.style.colorScheme = theme;
    document.documentElement.style.setProperty('--system-accent-color', '#0a84ff');
    document.documentElement.style.setProperty('--max-article-width', '750px');
    document.documentElement.style.setProperty('--max-article-content-width', '720px');
    document.documentElement.style.setProperty('--article-content-font-size', '18px');
    document.documentElement.style.setProperty('--article-content-font-weight', '500');
    document.documentElement.style.setProperty('--article-content-line-height', '1.8');
    Reflect.deleteProperty(window, 'kijiAPI');

    return () => {
      restoreAttribute('data-theme', previous.theme);
      restoreAttribute('data-ui-theme', previous.uiTheme);
      restoreAttribute('data-os', previous.os);
      document.documentElement.style.cssText = previous.rootStyle;
      document.body.className = previous.bodyClassName;
      document.body.style.cssText = previous.bodyStyle;
      if (previous.kijiApi === undefined) {
        Reflect.deleteProperty(window, 'kijiAPI');
      } else {
        Reflect.set(window, 'kijiAPI', previous.kijiApi);
      }
    };
  }, [os, theme, uiTheme]);

  return <div className="theme-debug-backdrop">{children}</div>;
}

const withThemeDebug: Decorator = (Story, context) => {
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
      key={`${context.id}:${theme}:${uiTheme}:${os}`}
      theme={theme}
      uiTheme={uiTheme}
      os={os}
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
        order: ['Theme Debug', ['Sidebar', 'Article List', 'Article View']],
      },
    },
  },
  initialGlobals: {
    theme: 'light',
    uiTheme: 'modern',
    platform: 'macos',
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

