---
availability:
- place: kiji-reader
references:
- kind: code
  role: implementation
  target: src/hooks/useApplicationMenuCommands.ts#useApplicationMenuCommands
- kind: code
  role: implementation
  target: src-tauri/src/db/articles.rs#clean_old_articles
---

# Clear old articles

Remove articles older than three months, keeping saved and starred ones.
