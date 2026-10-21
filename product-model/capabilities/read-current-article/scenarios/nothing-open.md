---
kind: edge
routes:
  assistant: Assistant connection
steps:
- text: The Assistant asks for the article open in KiJi
  kind: actor
  actor: assistant
  entities:
  - entity: article
    effect: reads
    facts: []
  contexts:
    assistant:
      place: assistant-connection
- text: No article is open, or sharing the article being read is off
  kind: condition
  actor: assistant
  entities:
  - entity: assistant-settings
    effect: reads
    facts:
    - Current article
  - entity: article
    effect: reads
    facts: []
  contexts:
    assistant:
      place: assistant-connection
- text: The Product answers that no article is open, or that sharing it is turned off in Settings → Assistant
  kind: product
  actor: assistant
  entities:
  - entity: article
    effect: reads
    facts: []
  - entity: settings
    effect: reads
    facts: []
  contexts:
    assistant:
      place: assistant-connection
---

# Ask when nothing is open

## Trigger

An assistant asks for the open article at the wrong moment.

## Outcome

The assistant is told what the user needs to do.
