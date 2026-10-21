---
kind: alternate
routes:
  desktop: KiJi Reader app
steps:
- text: The User pastes a link to an .opml file in Add Feeds
  kind: actor
  actor: user
  entities:
  - entity: feed
    effect: reads
    facts: []
  contexts:
    desktop:
      place: kiji-reader::add-feeds
- text: The Product fetches the list and says how many feeds are ready to import, and that folders become stations
  kind: product
  actor: user
  entities:
  - entity: feed
    effect: reads
    facts: []
  - entity: station
    effect: reads
    facts: []
  contexts:
    desktop:
      place: kiji-reader::add-feeds
- text: The User chooses Import N feeds
  kind: actor
  actor: user
  entities:
  - entity: feed
    effect: reads
    facts: []
  contexts:
    desktop:
      place: kiji-reader::add-feeds
- text: The Product adds the new feeds and creates the stations as for a file
  kind: product
  actor: user
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
- text: The Product opens the first imported station
  kind: product
  actor: user
  entities:
  - entity: station
    effect: reads
    facts:
    - Name
  contexts:
    desktop:
      place: kiji-reader::article-list
---

# Import a feed list from a link

## Trigger

Someone shares their reading list as a link.

## Outcome

The list's feeds are followed in their stations.

## Edge cases

- A list with no feeds offers nothing to import.
