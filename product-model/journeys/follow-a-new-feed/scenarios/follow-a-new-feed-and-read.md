---
kind: primary
result: achieved
routes:
  desktop: KiJi Reader app
steps:
- text: The User pastes the feed's link in Add Feeds
  kind: actor
  actor: user
  capability: add-feed
  entities:
  - entity: feed
    effect: reads
    facts:
    - Feed address
  contexts:
    desktop:
      place: kiji-reader::add-feeds
- text: The Product previews the feed
  kind: product
  actor: user
  capability: add-feed
  entities:
  - entity: feed
    effect: reads
    facts:
    - Name
    - Feed address
    - Icon
  contexts:
    desktop:
      place: kiji-reader::add-feeds
- text: The User chooses Add feed
  kind: actor
  actor: user
  capability: add-feed
  entities:
  - entity: feed
    effect: reads
    facts:
    - Name
  contexts:
    desktop:
      place: kiji-reader::add-feeds
- text: The Product follows the feed and keeps its articles as unread
  kind: product
  actor: user
  capability: add-feed
  entities:
  - entity: feed
    effect: creates
    to: Updated
    facts:
    - Name
    - Feed address
    - Icon
    - Reader mode
    - Added
    - Last updated
    - Failed updates
    - Article counts
    - Position
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
      place: kiji-reader::add-feeds
- text: The Product opens the new feed and lists its articles
  kind: product
  actor: user
  capability: add-feed
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
- text: The User opens the newest article
  kind: actor
  actor: user
  capability: read-article
  entities:
  - entity: article
    effect: reads
    facts:
    - Title
  contexts:
    desktop:
      place: kiji-reader::article-list
- text: The Product shows it and marks it read
  kind: product
  actor: user
  capability: read-article
  entities:
  - entity: article
    effect: changes
    from: Unread
    to: Read
    facts:
    - Last read
  contexts:
    desktop:
      place: kiji-reader::article
---

# Follow a new feed and read it

## Trigger

The User found a site worth following.

## Outcome

The User is reading the feed's newest article.
