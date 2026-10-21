---
appliesTo:
- type: capability
  id: clear-old-articles
- type: capability
  id: clear-all-articles
references:
- kind: code
  role: implementation
  target: src-tauri/src/db/articles.rs#clean_old_articles
- kind: code
  role: implementation
  target: src/hooks/useApplicationMenuCommands.ts#useApplicationMenuCommands
---

# Clearing old articles keeps saved and starred ones

Clear Articles Older Than 3 Months removes articles whose publication date, or fetch date when they have none, is more than three months old, unless they are saved or starred. Clear All Articles keeps only saved ones.
