---
entities:
- entity: settings
  shows:
  - Check for new articles
  - Article cleanup
  - Saved articles folder
  collects:
  - Check for new articles
  - Article cleanup
  - Saved articles folder
references:
- kind: code
  role: implementation
  target: src/components/SettingsWindow/panes/GeneralPane.tsx#GeneralPane
---

# Settings: General

Settings → General: how often KiJi checks for new articles, which engine cleans up pages, and whether saved articles are kept in a folder.
