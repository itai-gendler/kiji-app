---
kind: validation
routes:
  assistant: Assistant connection
steps:
- text: The Assistant asks to save an article
  kind: actor
  actor: assistant
  entities:
  - entity: article
    effect: reads
    facts: []
  contexts:
    assistant:
      place: assistant-connection
- text: Changes are not allowed, or saved articles are not shared
  kind: condition
  actor: assistant
  entities:
  - entity: assistant-settings
    effect: reads
    facts:
    - Allow changes
    - Saved articles
  - entity: saved-article
    effect: reads
    facts: []
  contexts:
    assistant:
      place: assistant-connection
- text: The Product refuses and says which switch in Settings → Assistant the user can turn on
  kind: product
  actor: assistant
  entities:
  - entity: settings
    effect: reads
    facts: []
  - entity: user
    effect: reads
    facts: []
  contexts:
    assistant:
      place: assistant-connection
---

# Changes are not allowed

## Trigger

An assistant tries to save while the user has not allowed it.

## Outcome

Nothing is saved.
