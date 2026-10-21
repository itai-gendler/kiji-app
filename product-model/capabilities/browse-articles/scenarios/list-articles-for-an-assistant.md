---
kind: alternate
routes:
  assistant: Assistant connection
steps:
- text: The Assistant asks for the articles of a station, a feed, the starred or unread ones, or the whole shared
    library, within a time range
  kind: actor
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
  - entity: station
    effect: reads
    facts: []
  contexts:
    assistant:
      place: assistant-connection
- text: The Product returns the matching articles newest first, each story once, with title, feed, date, link and
    a short summary
  kind: product
  actor: assistant
  entities:
  - entity: article
    effect: reads
    facts:
    - Title
    - Summary
    - Link
    - Published
  - entity: feed
    effect: reads
    facts:
    - Name
  contexts:
    assistant:
      place: assistant-connection
references:
- kind: code
  role: implementation
  target: src-tauri/src/mcp/query.rs#list_articles
- kind: code
  role: implementation
  target: src-tauri/src/mcp/time_range.rs
---

# List articles for an assistant

## Trigger

The User asks their assistant what arrived in a station or a time span.

## Outcome

The assistant has a page of articles from shared feeds, and a cursor for the next page.

## Edge cases

- Time ranges can be relative, such as the last day or this week.
- Keyword search over titles, summaries and authors takes the same scope and time range.
