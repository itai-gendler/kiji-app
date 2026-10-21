---
appliesTo:
- type: entity
  id: feed
  effect: reads
permits:
- actors:
  - user
- unattended: true
- related:
  - verb: follows
    entity: user
  - verb: connects
    entity: assistant
  when:
  - entity: assistant-settings
    fact: Library access
    is: 'On'
references:
- kind: code
  role: implementation
  target: src-tauri/src/mcp/query.rs
---

# Assistants read feeds only while library access is on

The user and scheduled refresh read every feed. An assistant reads feeds only while library access is on, and then only shared ones.
