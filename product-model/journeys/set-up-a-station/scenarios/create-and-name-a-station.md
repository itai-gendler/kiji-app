---
kind: primary
result: achieved
routes:
  desktop: KiJi Reader app
steps:
- text: The User chooses New Station in the Stations tab
  kind: actor
  actor: user
  capability: create-station
  entities:
  - entity: station
    effect: reads
    facts: []
  contexts:
    desktop:
      place: kiji-reader::stations
- text: The Product creates an empty station called New Station and puts its name into editing
  kind: product
  actor: user
  capability: create-station
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
- text: The User types the station's name and presses Return
  kind: actor
  actor: user
  capability: rename-station
  entities:
  - entity: station
    effect: reads
    facts:
    - Name
  contexts:
    desktop:
      place: kiji-reader::stations
- text: The Product saves the name
  kind: product
  actor: user
  capability: rename-station
  entities:
  - entity: station
    effect: changes
    facts:
    - Name
  contexts:
    desktop:
      place: kiji-reader::stations
---

# Create and name a station

## Trigger

The User wants a new group of feeds.

## Outcome

The station has its name, ready for feeds.
