---
kind: alternate
routes:
  desktop: KiJi Reader app
steps:
- text: The User unticks feeds in Choose feeds and saves
  kind: actor
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
      place: kiji-reader::station-feeds
- text: The Product takes the unticked feeds out of the station
  kind: product
  actor: user
  entities:
  - entity: station
    effect: changes
    facts:
    - Feeds
  - entity: feed
    effect: reads
    facts: []
  contexts:
    desktop:
      place: kiji-reader::station-feeds
---

# Untick feeds of a station

## Trigger

The User trims a station.

## Outcome

The station groups only the ticked feeds.
