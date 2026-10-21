---
kind: primary
routes:
  desktop: KiJi Reader app
steps:
- text: The User opens Add Feeds and pastes a feed link, with or without https://
  kind: actor
  actor: user
  entities:
  - entity: feed
    effect: reads
    facts:
    - Feed address
  contexts:
    desktop:
      place: kiji-reader::add-feeds
- text: 'Half a second after the typing stops, the Product fetches the link and previews the feed: its title and
    icon, its site, how many articles it has and the latest three titles'
  kind: product
  actor: user
  entities:
  - entity: feed
    effect: reads
    facts:
    - Name
    - Feed address
    - Icon
  - entity: article
    effect: reads
    facts: []
  contexts:
    desktop:
      place: kiji-reader::add-feeds
- text: The User chooses Add feed
  kind: actor
  actor: user
  entities:
  - entity: feed
    effect: reads
    facts:
    - Name
  contexts:
    desktop:
      place: kiji-reader::add-feeds
- text: The Product follows the feed, keeps its articles as unread and stores its icon
  kind: product
  actor: user
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
- text: The Product opens the new feed in the sidebar and lists its articles
  kind: product
  actor: user
  entities:
  - entity: feed
    effect: reads
    facts:
    - Name
  - entity: article
    effect: reads
    facts:
    - Title
    - Summary
    - Published
  contexts:
    desktop:
      place: kiji-reader::article-list
---

# Add a feed from its link

## Trigger

The User found a site they want to follow.

## Outcome

The feed is in the sidebar among the feeds in no station, selected, with its articles listed.

## Edge cases

- The new feed goes after the other feeds that are in no station.
- If its articles or icon cannot be stored, the feed is still added and its articles load when it opens.
