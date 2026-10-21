---
availability:
- place: kiji-reader
- place: assistant-connection
references:
- kind: code
  role: implementation
  target: src/contexts/FeedContext.tsx#FeedProvider
- kind: code
  role: implementation
  target: src/constants.ts
- kind: code
  role: implementation
  target: src-tauri/src/db/search.rs#create_fts_prefix_query
- kind: code
  role: implementation
  target: src/components/MainArea/ArticleListSearchInput.tsx
- kind: code
  role: implementation
  target: src-tauri/src/mcp/query.rs#list_articles
---

# Browse articles

Look through the articles of one feed, one station or a Library view, newest first, and narrow the list with a search. Assistants list and search the articles the user shares.
