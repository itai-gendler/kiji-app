---
singleton: true
references:
- kind: code
  role: implementation
  target: src/services/settings/types.ts#DEFAULT_SETTINGS
- kind: code
  role: implementation
  target: src-tauri/src/settings.rs
- kind: code
  role: implementation
  target: src/services/settings/settingsManager.ts
---

# Settings

The user's preferences for KiJi, kept once on this computer.

## Information kept

- **Check for new articles** — When app opens, every 5, 10, 15 or 30 minutes, every hour, or Never; every 15 minutes until changed.
- **Article cleanup** — The engine that pulls article text out of a web page loaded from a link: Defuddle, the default, or Readability.
- **Saved articles folder** — The folder that keeps a Markdown copy of every saved article; none until the user chooses one.
- **Theme** — Automatic, Light or Dark.
- **Interface style** — Modern or Classic surfaces.
- **Reader theme** — The colours and fonts used for reading, in a light and a dark version.
- **Surface opacity** — How see-through the sidebar fill is.
- **Interface font** — The font of the sidebar, menus and dialogs.
- **App icon** — The app icon variant, or a custom image.
- **Article fonts** — Fonts for titles, body text and East Asian text.
- **Reading layout** — Whether a custom reading layout is on, with its text size, weight, spacing, width and alignment.
- **Library views** — Which of Saved, Unread, All Items and Read appear under Library in the sidebar, and in what order.
