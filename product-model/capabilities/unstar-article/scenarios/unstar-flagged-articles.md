---
kind: primary
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
- text: The Product removes the star from the starred ones
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

# Unstar flagged articles

## Trigger

The User is done with flagged articles.

## Outcome

The articles are no longer starred and can be cleared with other old articles.

## Edge cases

- Articles not starred are counted as unchanged.
