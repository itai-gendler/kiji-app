---
availability:
- place: kiji-reader
- place: assistant-connection
references:
- kind: code
  role: implementation
  target: src/components/MainArea/ArticleView.tsx#ArticleView
- kind: code
  role: implementation
  target: src/services/saved/savedArticlesService.ts
- kind: code
  role: implementation
  target: src-tauri/src/db/saved.rs
- kind: code
  role: implementation
  target: src-tauri/src/mcp/write.rs
---

# Save an article

Keep a copy of an article in Saved, with its text, so it stays after its feed is gone. Assistants save articles when the user allows it.
