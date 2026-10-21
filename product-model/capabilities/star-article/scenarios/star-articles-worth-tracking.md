---
kind: primary
routes:
  assistant: Assistant connection
steps:
- text: The Assistant asks to star articles, up to 100 at once, or the one open in KiJi
  kind: actor
  actor: assistant
  entities:
  - entity: article
    effect: reads
    facts: []
  contexts:
    assistant:
      place: assistant-connection
- text: Changes are allowed, and each article comes from a shared feed or is the one open in KiJi
  kind: condition
  actor: assistant
  entities:
  - entity: assistant-settings
    effect: reads
    facts:
    - Allow changes
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
- text: The Product stars the articles not starred yet
  kind: product
  actor: assistant
  entities:
  - entity: article
    effect: changes
    facts:
    - Starred
  contexts:
    assistant:
      place: assistant-connection
---

# Star articles worth tracking

## Trigger

The User asks their assistant to flag articles worth keeping track of.

## Outcome

The articles are starred, so clearing old articles keeps them and assistants can list them as starred.

## Edge cases

- Articles already starred are counted as unchanged.
