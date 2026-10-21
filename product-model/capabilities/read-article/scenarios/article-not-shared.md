---
kind: validation
routes:
  assistant: Assistant connection
steps:
- text: The Assistant asks for an article by its id
  kind: actor
  actor: assistant
  entities:
  - entity: article
    effect: reads
    facts: []
  contexts:
    assistant:
      place: assistant-connection
- text: None of the article's feeds is shared
  kind: condition
  actor: assistant
  entities:
  - entity: assistant-settings
    effect: reads
    facts:
    - Shared stations
    - Feeds without a station
  - entity: article
    effect: reads
    facts: []
  - entity: feed
    effect: reads
    facts: []
  contexts:
    assistant:
      place: assistant-connection
- text: The Product answers that no shared article has that id
  kind: product
  actor: assistant
  entities:
  - entity: article
    effect: reads
    facts: []
  contexts:
    assistant:
      place: assistant-connection
references:
- kind: code
  role: implementation
  target: src-tauri/src/mcp/query.rs#article_is_exposed
---

# Ask for an article that is not shared

## Trigger

An assistant asks for an article from a station the user keeps private.

## Outcome

The article is reported as not found, the same as an article that was removed.
