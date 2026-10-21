---
appliesTo:
- type: capability
  id: sync-saved-articles
- type: entity
  id: settings
  facts:
  - Saved articles folder
references:
- kind: code
  role: implementation
  target: src-tauri/src/saved/sync_service.rs
---

# The folder copy adds files and never overwrites them

KiJi writes a file for a saved article only when no file of that name is in the folder, removes a file only when its article is unsaved, and leaves every other file in the folder alone. The articles.md index lists the files it wrote.
