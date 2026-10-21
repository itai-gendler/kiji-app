---
kind: alternate
routes:
  desktop: KiJi Reader app
steps:
- text: The User chooses Delete on a station, then the choice that also removes what only it holds
  kind: actor
  actor: user
  entities:
  - entity: station
    effect: reads
    facts:
    - Name
    - Feeds
  contexts:
    desktop:
      place: kiji-reader::stations
- text: The Product deletes the feeds that are in no other station, with their articles, keeping articles other
    feeds deliver and saved copies
  kind: product
  actor: user
  entities:
  - entity: feed
    effect: removes
    from: Updated
  - entity: article
    as: unread-articles
    effect: removes
    from: Unread
  - entity: article
    as: read-articles
    effect: removes
    from: Read
  - entity: station
    effect: reads
    facts: []
  contexts:
    desktop:
      place: kiji-reader::stations
- text: The Product removes the station; its feeds that are also in other stations stay there
  kind: product
  actor: user
  entities:
  - entity: station
    effect: removes
  - entity: feed
    effect: reads
    facts: []
  contexts:
    desktop:
      place: kiji-reader::stations
---

# Delete a station and its feeds

## Trigger

The User drops a whole topic.

## Outcome

The station and the feeds only it held are gone; shared feeds remain in their other stations.
