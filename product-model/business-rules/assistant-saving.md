---
appliesTo:
- type: entity
  id: saved-article
  effect: creates
permits:
- actors:
  - user
- related:
  - verb: keeps
    entity: user
  - verb: connects
    entity: assistant
  when:
  - entity: assistant-settings
    fact: Allow changes
    is: 'On'
  - entity: assistant-settings
    fact: Saved articles
    is: 'On'
references:
- kind: code
  role: implementation
  target: src-tauri/src/mcp/write.rs
---

# Assistants save articles only while changes are allowed and Saved is shared

The user saves and imports articles. An assistant saves one only while Allow assistants to make changes and Saved articles are both on.
