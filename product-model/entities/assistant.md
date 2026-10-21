---
kind: system
acts: external
references:
- kind: code
  role: implementation
  target: src-tauri/src/mcp/mod.rs
- kind: code
  role: implementation
  target: src-tauri/src/mcp/bridge.rs
- kind: doc
  role: intent
  target: CHANGELOG.md
---

# Assistant

An AI app on the same computer that the user connects to KiJi. It asks for stations, feeds and articles on the user's behalf and, when the user allows it, marks articles read or unread, stars them or saves them.
