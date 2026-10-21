---
kind: edge
routes:
  assistant: Assistant connection
steps:
- text: The Assistant asks for articles
  kind: actor
  actor: assistant
  entities:
  - entity: article
    effect: reads
    facts: []
  contexts:
    assistant:
      place: assistant-connection
- text: KiJi is not open, or library access is off
  kind: condition
  actor: assistant
  entities:
  - entity: assistant-settings
    effect: reads
    facts:
    - Library access
  contexts:
    assistant:
      place: assistant-connection
- text: The Product answers that KiJi is not open or assistant access is off, and asks for KiJi to be opened and
    access turned on
  kind: product
  actor: assistant
  entities: []
  contexts:
    assistant:
      place: assistant-connection
references:
- kind: code
  role: implementation
  target: src-tauri/src/mcp/bridge.rs
---

# Reach KiJi while it is closed or access is off

## Trigger

An assistant app tries to read while KiJi cannot answer.

## Outcome

The assistant gets no articles and is told how the user turns access on.
