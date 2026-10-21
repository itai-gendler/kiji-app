---
kind: alternate
routes:
  desktop: KiJi Reader app
steps:
- text: The User chooses Refresh current view with a station selected
  kind: actor
  actor: user
  entities:
  - entity: station
    effect: reads
    facts:
    - Name
  contexts:
    desktop:
      place: kiji-reader::article-list
- text: The Product fetches every feed of the station now and says how many it has done
  kind: product
  actor: user
  entities:
  - entity: station
    effect: reads
    facts:
    - Feeds
  - entity: feed
    effect: changes
    from: Updated
    to: Updated
    facts:
    - Last updated
    - Failed updates
    - Article counts
    - Posting frequency
  contexts:
    desktop:
      place: kiji-reader::article-list
- text: The Product adds their new stories to the list as unread articles
  kind: product
  actor: user
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
  contexts:
    desktop:
      place: kiji-reader::article-list
---

# Refresh a station

## Trigger

The User wants one group of feeds up to date now.

## Outcome

The station's list includes everything its feeds have now.
