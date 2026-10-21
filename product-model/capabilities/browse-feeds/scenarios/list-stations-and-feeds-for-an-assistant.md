---
kind: alternate
routes:
  assistant: Assistant connection
steps:
- text: The Assistant asks for the user's stations, or for the feeds of one station
  kind: actor
  actor: assistant
  entities:
  - entity: feed
    effect: reads
    facts: []
  - entity: station
    effect: reads
    facts: []
  - entity: user
    effect: reads
    facts: []
  contexts:
    assistant:
      place: assistant-connection
- text: The Product returns the shared stations with their feed and unread counts, or the shared feeds with their
    ids
  kind: product
  actor: assistant
  entities:
  - entity: station
    effect: reads
    facts:
    - Name
    - Feeds
  - entity: feed
    effect: reads
    facts:
    - Name
    - Feed address
    - Article counts
  - entity: assistant-settings
    effect: reads
    facts:
    - Shared stations
    - Feeds without a station
  contexts:
    assistant:
      place: assistant-connection
references:
- kind: code
  role: implementation
  target: src-tauri/src/mcp/query.rs
- kind: code
  role: implementation
  target: src-tauri/src/mcp/protocol.rs
---

# List stations and feeds for an assistant

## Trigger

An assistant needs station names or feed ids before asking for articles.

## Outcome

Only shared stations and feeds are named.
