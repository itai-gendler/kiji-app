---
kind: primary
routes:
  desktop: KiJi Reader app
steps:
- text: The User chooses to export in the File menu or in Import & Export, and picks where to save the OPML file
  kind: actor
  actor: user
  entities: []
  contexts:
    desktop:
      place: kiji-reader::import-and-export
- text: The Product writes each station as a folder holding its feeds, a feed in several stations under each of
    them, then the feeds in no station, keeping names and emoji
  kind: product
  actor: user
  entities:
  - entity: station
    effect: reads
    facts:
    - Name
    - Emoji
    - Position
    - Feeds
  - entity: feed
    effect: reads
    facts:
    - Name
    - Feed address
    - Icon
    - Position
  contexts:
    desktop:
      place: kiji-reader::import-and-export
- text: The Product reports the export as done
  kind: product
  actor: user
  entities: []
  contexts:
    desktop:
      place: kiji-reader::import-and-export
---

# Export all feeds

## Trigger

The User backs up their subscriptions or moves to another reader.

## Outcome

The file holds every feed and every station that has feeds; stations with no feeds are left out.
