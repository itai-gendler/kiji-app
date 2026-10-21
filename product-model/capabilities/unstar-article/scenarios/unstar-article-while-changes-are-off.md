---
kind: validation
routes:
  assistant: Assistant connection
steps:
- text: The Assistant asks to unstar articles, up to 100 at once, or the one open in KiJi
  kind: actor
  actor: assistant
  entities:
  - entity: article
    effect: reads
    facts: []
  contexts:
    assistant:
      place: assistant-connection
- text: Allow assistants to make changes is off
  kind: condition
  actor: assistant
  entities:
  - entity: assistant-settings
    effect: reads
    facts:
    - Allow changes
  contexts:
    assistant:
      place: assistant-connection
- text: The Product refuses and says the user can allow changes in Settings → Assistant
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

# Unstar while changes are off

## Trigger

An assistant tries a change the user has not allowed.

## Outcome

No article changes.
