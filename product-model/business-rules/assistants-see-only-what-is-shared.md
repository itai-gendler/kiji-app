---
appliesTo:
- type: capability
  id: browse-articles
- type: capability
  id: browse-feeds
- type: capability
  id: read-article
- type: capability
  id: read-current-article
- type: capability
  id: make-digest
- type: capability
  id: browse-saved-articles
- type: entity
  id: assistant-settings
  facts:
  - Shared stations
  - Feeds without a station
  - Saved articles
  - Current article
references:
- kind: code
  role: implementation
  target: src-tauri/src/mcp/query.rs#article_is_exposed
- kind: code
  role: implementation
  target: src-tauri/src/mcp/protocol.rs
---

# Assistants see only what the user shares

An article is visible to assistants when one of its feeds is in a shared station, or is in no station while feeds without a station are shared. Saved articles are visible only while Saved articles is on, and their highlights and notes only while Notes and highlights is on too. The article open in KiJi is visible while The article I'm reading is on, even when its station is not shared. Anything not visible is reported as not found.
