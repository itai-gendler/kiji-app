---
appliesTo:
- type: capability
  id: import-saved-articles
- type: entity
  id: saved-article
  effect: creates
references:
- kind: code
  role: implementation
  target: src/services/saved/savedArticlesIOService.ts
- kind: code
  role: implementation
  target: src-tauri/src/db/saved.rs
---

# Importing saved articles never duplicates one

An imported article already in Saved, with the same id or the same link, is skipped and counted as already saved.
