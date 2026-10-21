---
kind: primary
routes:
  desktop: KiJi Reader app
steps:
- text: The interval chosen in Settings has passed since the last pass
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
- text: 'The Product orders the feeds: those that post often and those unfetched for longer than they usually wait
    come first, feeds of a station just opened before all; feeds waiting after failed updates are left out'
  kind: product
  entities:
  - entity: feed
    effect: reads
    facts:
    - Posting frequency
    - Last updated
    - Failed updates
  - entity: station
    effect: reads
    facts: []
  contexts:
    desktop:
      place: kiji-reader::article-list
- text: The Product fetches the feeds in that order and keeps each new story as an unread article
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
    effect: reads
    facts: []
  contexts:
    desktop:
      place: kiji-reader::article-list
- text: The Product records each successful update and how often each feed posts
  kind: product
  entities:
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

# Refresh on schedule

## Trigger

KiJi has stayed open through another refresh interval, 15 minutes unless changed in Settings → General.

## Outcome

New articles are in their feeds, stations and the Unread view; the sidebar said "Syncing all" while it ran.

## Edge cases

- A feed that answers "not modified" counts as updated and adds nothing.
- Opening a station pauses the pass; it picks up again once the station has loaded.
