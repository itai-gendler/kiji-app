---
appliesTo:
- type: entity
  id: article
  effect: reads
permits:
- actors:
  - user
- unattended: true
- related:
  - verb: delivers
    entity: feed
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
  target: src-tauri/src/mcp/query.rs#article_is_exposed
---

# Assistants read articles only while library access is on

The user reads every article. An assistant reads articles only while Let assistants read your KiJi library is on, and then only those shared with it.
