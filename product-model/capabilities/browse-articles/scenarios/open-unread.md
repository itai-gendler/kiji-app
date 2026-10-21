---
kind: alternate
routes:
  desktop: KiJi Reader app
steps:
- text: The User selects Unread under Library
  kind: actor
  actor: user
  entities:
  - entity: settings
    effect: reads
    facts:
    - Library views
  contexts:
    desktop:
      place: kiji-reader::article-list
- text: The Product lists every unread article from every feed, newest first, without fetching anything
  kind: product
  actor: user
  entities:
  - entity: article
    effect: reads
    facts:
    - Title
    - Summary
    - Published
  - entity: feed
    effect: reads
    facts: []
  contexts:
    desktop:
      place: kiji-reader::article-list
---

# Open Unread

## Trigger

The User wants everything not read yet, whatever its feed.

## Outcome

The list holds only unread articles, whatever feed or station they come from.
