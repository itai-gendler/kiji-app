---
kind: validation
routes:
  assistant: Assistant connection
steps:
- text: The Assistant asks for saved articles
  kind: actor
  actor: assistant
  entities:
  - entity: saved-article
    effect: reads
    facts: []
  contexts:
    assistant:
      place: assistant-connection
- text: Saved articles are not shared
  kind: condition
  actor: assistant
  entities:
  - entity: assistant-settings
    effect: reads
    facts:
    - Saved articles
  - entity: saved-article
    effect: reads
    facts: []
  contexts:
    assistant:
      place: assistant-connection
- text: The Product refuses and says saved articles are not shared
  kind: product
  actor: assistant
  entities:
  - entity: saved-article
    effect: reads
    facts: []
  contexts:
    assistant:
      place: assistant-connection
---

# Ask for saved articles that are not shared

## Trigger

An assistant asks for Saved while the user keeps it private.

## Outcome

Nothing from Saved is returned.
