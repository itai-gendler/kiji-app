---
kind: alternate
routes:
  desktop: KiJi Reader app
steps:
- text: The User chooses Delete on an empty station
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
- text: The Product says "This station has no feeds."
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
- text: The Product removes the station
  kind: product
  actor: user
  entities:
  - entity: station
    effect: removes
  contexts:
    desktop:
      place: kiji-reader::stations
---

# Delete an empty station

## Trigger

A station was created by mistake.

## Outcome

The station is gone.
