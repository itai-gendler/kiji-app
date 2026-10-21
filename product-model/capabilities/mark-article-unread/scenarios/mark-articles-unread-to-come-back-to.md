---
kind: primary
routes:
  assistant: Assistant connection
steps:
- text: The Assistant asks to mark articles unread, up to 100 at once, or the one open in KiJi
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
- text: The Product marks the read ones unread, updates unread counts, and the open windows show the change right
    away
  kind: product
  actor: assistant
  entities:
  - entity: article
    effect: changes
    from: Read
    to: Unread
    facts: []
  contexts:
    assistant:
      place: assistant-connection
---

# Mark articles unread to come back to

## Trigger

The User wants to come back to some articles later.

## Outcome

The articles are unread again in every list and count.

## Edge cases

- Articles already unread are counted as unchanged.
