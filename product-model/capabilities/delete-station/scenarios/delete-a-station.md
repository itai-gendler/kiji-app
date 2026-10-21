---
kind: primary
routes:
  desktop: KiJi Reader app
steps:
- text: The User chooses Delete on a station
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
- text: The Product says its feeds stay in the library, outside any station, and offers Delete Station and Delete
    Station and Feeds
  kind: product
  actor: user
  entities:
  - entity: station
    effect: reads
    facts:
    - Feeds
  - entity: feed
    effect: reads
    facts: []
  contexts:
    desktop:
      place: kiji-reader::stations
- text: The User chooses Delete Station
  kind: actor
  actor: user
  entities:
  - entity: station
    effect: reads
    facts: []
  contexts:
    desktop:
      place: kiji-reader::stations
- text: The Product removes the station; feeds that were only there now show among the feeds in no station
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

# Delete a station and keep its feeds

## Trigger

A topic is no longer useful as a group.

## Outcome

The station is gone; every feed is still followed.
