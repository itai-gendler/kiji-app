---
kind: primary
routes:
  assistant: Assistant connection
steps:
- text: The Assistant asks for a digest of the shared library, a station or a feed for a time range
  kind: actor
  actor: assistant
  entities:
  - entity: feed
    effect: reads
    facts: []
  - entity: station
    effect: reads
    facts: []
  contexts:
    assistant:
      place: assistant-connection
- text: The Product returns the titles, links and summaries of the matching articles, grouped by station and then
    by feed
  kind: product
  actor: assistant
  entities:
  - entity: article
    effect: reads
    facts:
    - Title
    - Link
    - Summary
    - Published
  - entity: station
    effect: reads
    facts:
    - Name
  - entity: feed
    effect: reads
    facts:
    - Name
  contexts:
    assistant:
      place: assistant-connection
---

# Make a digest of a time range

## Trigger

The User asks their assistant to summarise their week.

## Outcome

The assistant has one grouped overview to summarise from.

## Edge cases

- Feeds in no station are grouped under "No station".
