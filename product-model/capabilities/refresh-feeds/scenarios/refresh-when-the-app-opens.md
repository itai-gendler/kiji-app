---
kind: alternate
routes:
  desktop: KiJi Reader app
steps:
- text: KiJi starts with its Settings checking only when the app opens
  kind: condition
  unattended: true
  entities:
  - entity: settings
    effect: reads
    facts:
    - Check for new articles
  contexts:
    desktop:
      place: kiji-reader::article-list
- text: The Product waits for the first click in the sidebar, or 30 seconds, then runs one pass over every feed
  kind: product
  entities:
  - entity: feed
    effect: reads
    facts:
    - Posting frequency
    - Last updated
  contexts:
    desktop:
      place: kiji-reader::article-list
- text: The Product keeps the new stories as unread articles and records each update
  kind: product
  entities:
  - entity: article
    effect: creates
    to: Unread
    facts:
    - Title
    - Summary
    - Content
    - Link
    - Author
    - Published
    - Fetched
    - Starred
    - Saved
  - entity: feed
    effect: changes
    from: Updated
    to: Updated
    facts:
    - Last updated
    - Article counts
    - Posting frequency
  contexts:
    desktop:
      place: kiji-reader::article-list
---

# Refresh only when the app opens

## Trigger

The User prefers one check per session.

## Outcome

Feeds are fetched once per launch and then only when opened or refreshed.

## Edge cases

- With an interval chosen, the first pass after launch waits in the same way.
