---
kind: alternate
routes:
  desktop: KiJi Reader app
steps:
- text: The computer wakes, or KiJi comes back, after a scheduled pass was due
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
- text: The Product runs the overdue pass at once, retrying feeds that are waiting after failed updates, and the
    feeds of the open station first
  kind: product
  entities:
  - entity: feed
    effect: reads
    facts:
    - Failed updates
  - entity: station
    effect: reads
    facts: []
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
    from: Can't update
    to: Updated
    facts:
    - Last updated
    - Failed updates
    - Article counts
  contexts:
    desktop:
      place: kiji-reader::article-list
---

# Catch up after the computer wakes

## Trigger

The laptop lid opens in the morning.

## Outcome

Overnight articles arrive within moments; feeds that failed during the night are retried rather than left waiting.
