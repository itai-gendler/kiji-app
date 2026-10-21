---
kind: primary
routes:
  assistant: Assistant connection
steps:
- text: The Assistant asks to mark articles read, up to 100 at once, or the one open in KiJi
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
- text: The Product marks the unread ones read, updates unread counts, and the open windows show the change right
    away
  kind: product
  actor: assistant
  entities:
  - entity: article
    effect: changes
    from: Unread
    to: Read
    facts: []
  contexts:
    assistant:
      place: assistant-connection
---

# Mark a batch of articles read

## Trigger

The User tells their assistant they have dealt with a set of articles.

## Outcome

The articles are read in every list and count; the assistant hears how many changed.

## Edge cases

- Articles already read are counted as unchanged; articles it cannot see are reported as not found.
