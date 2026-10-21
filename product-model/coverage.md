---
scope: 'The KiJi desktop app: its windows, feed and article services, native storage, refresh scheduling, saved-article
  export and folder copy, and assistant access.'
method: Static reading of the tracked TypeScript and Rust source at the pinned commit; nothing was built or run.
covered:
- description: Main window sidebar, article list and article view, and the article window.
  paths:
  - src/components/Sidebar/
  - src/components/MainArea/
  - src/components/ArticleWindow/
  - src/contexts/
  - src/stores/
- description: Manage Feeds window with its Feeds, Stations, Library and Import & Export tabs.
  paths:
  - src/components/ManageFeedsWindow/
- description: Settings window panes for General, Appearance, Reading, Shortcuts and Assistant.
  paths:
  - src/components/SettingsWindow/
- description: Feed, article, OPML, station, saved-article, settings and refresh services in the renderer.
  paths:
  - src/services/feeds/
  - src/services/articles/
  - src/services/saved/
  - src/services/tags/
  - src/services/settings/
  - src/services/scheduler/
  - src/services/tasks/
  - src/workers/
  - src/utils/
- description: Menus, keyboard shortcuts, dialogs and window messaging.
  paths:
  - src/services/ui/
  - src/services/shortcuts/
  - src/hooks/useApplicationMenuCommands.ts
  - src/hooks/useAppEffects.ts
  - src-tauri/src/shell/menu.rs
  - src-tauri/src/shell/share.rs
- description: Native storage, feed fetching and parsing, refresh scheduling, settings and saved-article export
    and folder copy.
  paths:
  - src-tauri/src/db/
  - src-tauri/src/feeds/
  - src-tauri/src/scheduler/
  - src-tauri/src/saved/
  - src-tauri/src/settings.rs
  - src-tauri/src/net/
  - src/lib/
- description: System appearance, app icon and sleep and wake signals.
  paths:
  - src-tauri/src/system/
- description: Assistant access server, its local bridge and web-address endpoint, and client setup.
  paths:
  - src-tauri/src/mcp/
  - src-tauri/mcp/
  - src/services/assistant/
exclusions:
- description: Diagnostics, performance tracing and logging.
  paths:
  - src/services/diagnostics/
  - src/services/performance/
  - src/services/logger/
  - src-tauri/src/diagnostics/
- description: End-to-end harness, test suites and developer scripts.
  paths:
  - test/
  - scripts/
  - src/services/e2e/
  - src-tauri/src/e2e/
  - src/hooks/useE2eArticleViewProbes.ts
  - src/hooks/useE2eCommandHandler.ts
  - src/hooks/useE2eHarness.ts
  - src/hooks/useE2eUiProbes.ts
  - src/hooks/FeedE2eCollectionHost.tsx
- description: Storybook configuration and theme fixtures.
  paths:
  - .storybook/
  - src/stories/
- description: Fonts, styles, icons and screenshots.
  paths:
  - src/assets/
  - src/styles/
  - public/
  - screenshots/
  - src-tauri/icons/
  - src-tauri/icons-dark/
  - src-tauri/icons-ripple/
  - src-tauri/icons-ripple-dark/
- description: Packaging, signing, CI and build configuration.
  paths:
  - .github/
  - src-tauri/tauri.conf.json
  - src-tauri/tauri.macos.conf.json
  - src-tauri/Cargo.toml
  - src-tauri/build.rs
  - src-tauri/capabilities/
  - package.json
  - vite.config.ts
unmapped:
- description: About and update window, update checks and update downloads.
  paths:
  - src/components/UpdateWindow/
  - src/services/system/
  - src/hooks/useAppUpdatePrompt.ts
- description: 'Contact pane: support email, feedback draft and error report file.'
  paths:
  - src/components/SettingsWindow/panes/ContactPane.tsx
  - src-tauri/src/diagnostics/export.rs
- description: 'Article body rendering: galleries, embeds, audio player, PDF viewer and full-window images.'
  paths:
  - src/components/common/ArticleContent/
  - src/components/common/ArticlePdf/
  - src/components/common/AudioPlayer/
  - src/components/MainArea/ArticleImageLightbox.tsx
- description: Link and image context menus in articles, including image download.
  paths:
  - src-tauri/src/shell/context_menu.rs
- description: Site icon discovery and icon colour analysis.
  paths:
  - src/services/favicons/
- description: Window chrome, column resizing and remembered window positions.
  paths:
  - src/components/WindowChrome/
  - src/components/TrafficLights/
  - src-tauri/src/shell/window.rs
  - src-tauri/src/shell/window_bounds.rs
  - src/services/ui/layoutColumnResize.ts
limitations: []
---

# Coverage
