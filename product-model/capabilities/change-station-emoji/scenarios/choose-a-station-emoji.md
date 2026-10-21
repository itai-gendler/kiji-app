---
kind: primary
routes:
  desktop: KiJi Reader app
steps:
- text: The User chooses an emoji for a station in the Stations tab
  kind: actor
  actor: user
  entities:
  - entity: station
    effect: reads
    facts:
    - Name
    - Emoji
  contexts:
    desktop:
      place: kiji-reader::stations
- text: The Product shows the emoji beside the station in the sidebar and in exported feed lists
  kind: product
  actor: user
  entities:
  - entity: station
    effect: changes
    facts:
    - Emoji
  - entity: feed
    effect: reads
    facts: []
  contexts:
    desktop:
      place: kiji-reader::stations
---

# Choose an emoji for a station

## Trigger

The User wants stations easy to tell apart.

## Outcome

The station carries the emoji; removing it leaves the name alone.
