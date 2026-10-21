---
availability:
- place: kiji-reader
references:
- kind: code
  role: implementation
  target: src-tauri/src/saved/sync_service.rs
- kind: code
  role: implementation
  target: src-tauri/src/saved/export_format.rs
- kind: code
  role: implementation
  target: src/services/saved/sync/savedArticlesSyncBridge.ts
---

# Keep saved articles in a folder

Mirror Saved as Markdown files in the folder chosen in Settings → General, adding a file for each newly saved article and removing it when the article is unsaved.
