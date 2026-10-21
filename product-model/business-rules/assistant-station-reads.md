---
appliesTo:
- type: entity
  id: station
  effect: reads
permits:
- actors:
  - user
- unattended: true
- related:
  - verb: owns
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

# Assistants read stations only while library access is on

The user and scheduled refresh read every station. An assistant reads stations only while library access is on, and then only shared ones.
