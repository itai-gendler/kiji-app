---
kind: alternate
routes:
  desktop: KiJi Reader app
steps:
- text: The User chooses Choose feeds on a station and ticks feeds
  kind: actor
  actor: user
  entities:
  - entity: station
    effect: reads
    facts:
    - Name
  - entity: feed
    effect: reads
    facts:
    - Name
  contexts:
    desktop:
      place: kiji-reader::station-feeds
- text: The User saves
  kind: actor
  actor: user
  entities: []
  contexts:
    desktop:
      place: kiji-reader::station-feeds
- text: The Product adds the ticked feeds to the station
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

# Choose a station's feeds

## Trigger

The User builds a station from the station's side.

## Outcome

The station groups the ticked feeds; "A feed can be in several stations."
