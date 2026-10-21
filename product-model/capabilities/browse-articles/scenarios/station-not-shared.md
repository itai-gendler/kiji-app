---
kind: validation
routes:
  assistant: Assistant connection
steps:
- text: The Assistant asks for the articles of a station by name
  kind: actor
  actor: assistant
  entities:
  - entity: article
    effect: reads
    facts: []
  - entity: station
    effect: reads
    facts: []
  contexts:
    assistant:
      place: assistant-connection
- text: The station is not among the shared stations
  kind: condition
  actor: assistant
  entities:
  - entity: assistant-settings
    effect: reads
    facts:
    - Shared stations
  - entity: station
    effect: reads
    facts: []
  contexts:
    assistant:
      place: assistant-connection
- text: The Product answers that no shared station has that name and points the Assistant to the list of stations
  kind: product
  actor: assistant
  entities:
  - entity: station
    effect: reads
    facts: []
  contexts:
    assistant:
      place: assistant-connection
references:
- kind: code
  role: implementation
  target: src-tauri/src/mcp/protocol.rs
---

# Ask for a station that is not shared

## Trigger

An assistant names a station the user has not shared.

## Outcome

Nothing from the station is returned; the station is treated as not found.
