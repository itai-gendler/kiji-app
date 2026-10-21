---
appliesTo:
- type: capability
  id: export-saved-articles
- type: entity
  id: saved-article
  facts:
  - Content
references:
- kind: code
  role: implementation
  target: src-tauri/src/saved/export_service.rs
- kind: code
  role: implementation
  target: src/services/saved/savedArticlesIOService.ts
---

# A large saved-articles export asks first

Before exporting, KiJi estimates the ZIP size; above 1 GB, or above the free disk space, it shows both and asks before writing.
