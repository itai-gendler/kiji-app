---
availability:
- place: kiji-reader
- place: assistant-connection
domain: library
references:
- kind: code
  role: implementation
  target: src/services/saved/savedArticlesService.ts
- kind: code
  role: implementation
  target: src-tauri/src/db/saved.rs
- kind: code
  role: implementation
  target: src-tauri/src/mcp/protocol.rs
---

# Browse saved articles

Look through Saved, the newest saved first, and search it. Assistants list saved articles when the user shares them.
