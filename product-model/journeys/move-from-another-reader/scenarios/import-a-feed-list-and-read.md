---
kind: primary
result: achieved
routes:
  desktop: KiJi Reader app
steps:
- text: The User chooses Import Feeds and picks the .opml file exported from their old reader
  kind: actor
  actor: user
  capability: import-feeds
  entities:
  - entity: feed
    effect: reads
    facts: []
  contexts:
    desktop:
      place: kiji-reader::add-feeds
- text: The Product adds the new feeds and turns the list's folders into stations
  kind: product
  actor: user
  capability: import-feeds
  entities:
  - entity: feed
    effect: creates
    to: Not updated yet
    facts:
    - Name
    - Feed address
    - Icon
    - Reader mode
    - Added
    - Failed updates
    - Position
  - entity: station
    effect: creates
    facts:
    - Name
    - Emoji
    - Position
    - Feeds
    - Created
  contexts:
    desktop:
      place: kiji-reader::add-feeds
- text: The Product opens the first imported station and waits for its feeds' first articles
  kind: product
  actor: user
  capability: import-feeds
  entities:
  - entity: station
    effect: reads
    facts:
    - Name
  - entity: article
    effect: reads
    facts: []
  - entity: feed
    effect: reads
    facts: []
  contexts:
    desktop:
      place: kiji-reader::article-list
- text: The Product fetches the station's feeds and lists their stories as unread articles
  kind: product
  actor: user
  capability: browse-articles
  entities:
  - entity: feed
    effect: changes
    from: Not updated yet
    to: Updated
    facts:
    - Last updated
    - Article counts
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
  - entity: station
    effect: reads
    facts: []
  contexts:
    desktop:
      place: kiji-reader::article-list
- text: The User opens an article of the station
  kind: actor
  actor: user
  capability: read-article
  entities:
  - entity: article
    effect: reads
    facts:
    - Title
  - entity: station
    effect: reads
    facts: []
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

# Import a feed list and read

## Trigger

The User switches to KiJi.

## Outcome

The User is reading in their first imported station.
