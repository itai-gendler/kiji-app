---
appliesTo:
- type: entity
  id: saved-article
  effect: reads
permits:
- actors:
  - user
- unattended: true
- related:
  - verb: keeps
    entity: user
  - verb: connects
    entity: assistant
  when:
  - entity: assistant-settings
    fact: Library access
    is: 'On'
  - entity: assistant-settings
    fact: Saved articles
    is: 'On'
references:
- kind: code
  role: implementation
  target: src-tauri/src/mcp/protocol.rs
---

# Assistants read saved articles only while Saved is shared

The user reads every saved article, and the folder copy reads them to write their files. An assistant reads them only while library access and Saved articles are both on.
