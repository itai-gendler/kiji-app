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
  target: src/utils/readingTime.ts
- kind: code
  role: implementation
  target: src-tauri/src/mcp/protocol.rs
---

# Read an article

Open an article to read it with its source, date and reading time; opening a feed article marks it read. Assistants read the full text of shared articles.
