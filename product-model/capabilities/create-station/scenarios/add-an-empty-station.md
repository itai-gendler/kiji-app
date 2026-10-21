---
kind: primary
routes:
  desktop: KiJi Reader app
steps:
- text: The User chooses New Station in the Stations tab
  kind: actor
  actor: user
  entities:
  - entity: station
    effect: reads
    facts: []
  contexts:
    desktop:
      place: kiji-reader::stations
- text: The Product creates an empty station called New Station, or New Station 2 and so on when that name is taken,
    after the other stations
  kind: product
  actor: user
  entities:
  - entity: station
    effect: creates
    facts:
    - Name
    - Position
    - Feeds
    - Created
  contexts:
    desktop:
      place: kiji-reader::stations
- text: The Product puts the new station's name into editing
  kind: product
  actor: user
  entities:
  - entity: station
    effect: reads
    facts:
    - Name
  contexts:
    desktop:
      place: kiji-reader::stations
---

# Add an empty station

## Trigger

The User wants a new group of feeds.

## Outcome

An empty station is at the end of the list with its name ready to type over.
