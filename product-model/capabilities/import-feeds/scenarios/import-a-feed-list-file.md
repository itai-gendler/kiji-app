---
kind: primary
routes:
  desktop: KiJi Reader app
steps:
- text: The User chooses Import Feeds, or Feed list under From a file in Add Feeds, and picks an .opml file
  kind: actor
  actor: user
  entities:
  - entity: feed
    effect: reads
    facts: []
  contexts:
    desktop:
      place: kiji-reader::add-feeds
- text: The Product adds each feed of the list it does not follow yet, with the list's name and emoji
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
  contexts:
    desktop:
      place: kiji-reader::add-feeds
- text: The Product turns each top-level folder into a station of the same name, puts feeds of nested folders into
    their top-level folder's station, and orders the stations as in the file
  kind: product
  actor: user
  entities:
  - entity: station
    effect: creates
    facts:
    - Name
    - Emoji
    - Position
    - Feeds
    - Created
  - entity: feed
    effect: reads
    facts: []
  contexts:
    desktop:
      place: kiji-reader::add-feeds
- text: The Product says how many feeds it imported and how many it skipped as duplicates, invalid or failed, and
    opens the first imported station
  kind: product
  actor: user
  entities:
  - entity: station
    effect: reads
    facts:
    - Name
  - entity: feed
    effect: reads
    facts: []
  contexts:
    desktop:
      place: kiji-reader::article-list
---

# Import a feed list file

## Trigger

The User moves from another reader.

## Outcome

The feeds are followed in their stations and fill with articles in the background, starting with the imported ones.

## Edge cases

- Feeds at the top level beside folders stay in no station.
- With no station in the list, the first new feed is opened instead.
