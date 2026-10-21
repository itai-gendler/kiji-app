---
appliesTo:
- type: capability
  id: mark-article-read
- type: capability
  id: mark-article-unread
- type: capability
  id: star-article
- type: capability
  id: unstar-article
- type: capability
  id: save-article
references:
- kind: code
  role: implementation
  target: src-tauri/src/mcp/write.rs
---

# Assistants change at most 100 articles at once and delete nothing

A change asked by an assistant names up to 100 articles, or the one open in KiJi when it names none; articles it cannot see are left out and reported as not found. Assistants have no way to remove articles, saved articles, feeds or stations.
