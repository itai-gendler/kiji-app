---
appliesTo:
- type: entity
  id: saved-article
  effect: removes
permits:
- actors:
  - user
references:
- kind: code
  role: implementation
  target: src-tauri/src/mcp/write.rs
---

# Only the user removes saved articles

Saved articles leave Saved only when the user unsaves or clears them.
