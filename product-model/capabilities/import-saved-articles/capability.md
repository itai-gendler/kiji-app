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
  target: src/services/tasks/taskOperations.ts
- kind: code
  role: implementation
  target: src-tauri/src/db/saved.rs
---

# Import saved articles

Bring articles into Saved from a saved-articles export (.zip) or from a list of links (.csv).
