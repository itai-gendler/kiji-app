---
availability:
- place: kiji-reader
domain: import-and-export
references:
- kind: code
  role: implementation
  target: src/services/saved/savedArticlesIOService.ts
- kind: code
  role: implementation
  target: src-tauri/src/saved/export_service.rs
- kind: code
  role: implementation
  target: src-tauri/src/saved/export_format.rs
---

# Export saved articles

Save every saved article to a ZIP file with a Markdown file per article, an index and a list another app can import.
