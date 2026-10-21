---
appliesTo:
- type: entity
  id: article
  effect: changes
permits:
- actors:
  - user
- related:
  - verb: delivers
    entity: feed
  - verb: follows
    entity: user
  - verb: connects
    entity: assistant
  when:
  - entity: assistant-settings
    fact: Allow changes
    is: 'On'
references:
- kind: code
  role: implementation
  target: src-tauri/src/mcp/write.rs
---

# Assistants change articles only while changes are allowed

The user changes articles by reading, saving and clearing them. An assistant marks articles read or unread, stars or unstars them and marks them saved only while Allow assistants to make changes is on.
