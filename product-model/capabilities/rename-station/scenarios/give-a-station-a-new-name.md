---
kind: primary
routes:
  desktop: KiJi Reader app
steps:
- text: The User chooses Rename, or presses Return, on a station and types a name
  kind: actor
  actor: user
  entities:
  - entity: station
    effect: reads
    facts:
    - Name
  contexts:
    desktop:
      place: kiji-reader::stations
- text: The name is not empty and no other station has it, ignoring case
  kind: condition
  actor: user
  entities:
  - entity: station
    effect: reads
    facts:
    - Name
  contexts:
    desktop:
      place: kiji-reader::stations
- text: The Product renames the station everywhere it is shown, keeping its feeds
  kind: product
  actor: user
  entities:
  - entity: station
    effect: changes
    facts:
    - Name
  - entity: feed
    effect: reads
    facts: []
  contexts:
    desktop:
      place: kiji-reader::stations
---

# Give a station a new name

## Trigger

The User names a new station or a station whose topic changed.

## Outcome

The station has the new name in the sidebar and Manage Feeds.
