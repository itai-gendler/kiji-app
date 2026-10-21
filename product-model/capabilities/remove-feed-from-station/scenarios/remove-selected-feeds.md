---
kind: primary
routes:
  desktop: KiJi Reader app
steps:
- text: The User selects feeds in the Feeds tab and chooses Remove from Station
  kind: actor
  actor: user
  entities:
  - entity: feed
    effect: reads
    facts:
    - Name
  - entity: station
    effect: reads
    facts: []
  contexts:
    desktop:
      place: kiji-reader::feeds
- text: The User picks one of their stations
  kind: actor
  actor: user
  entities:
  - entity: station
    effect: reads
    facts:
    - Name
  contexts:
    desktop:
      place: kiji-reader::feeds
- text: The Product takes the feeds out of that station
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
      place: kiji-reader::feeds
---

# Remove selected feeds from a station

## Trigger

Feeds ended up in the wrong station.

## Outcome

The feeds stay followed; a feed left in no station shows among the feeds in no station.
