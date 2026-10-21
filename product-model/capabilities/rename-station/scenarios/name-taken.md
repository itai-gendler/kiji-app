---
kind: validation
routes:
  desktop: KiJi Reader app
steps:
- text: The User types the name of another station
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
- text: The Product says "A station with that name already exists." and keeps the old name
  kind: product
  actor: user
  entities:
  - entity: station
    effect: reads
    facts: []
  contexts:
    desktop:
      place: kiji-reader::stations
---

# The name is taken

## Trigger

Two stations would share a name.

## Outcome

The station keeps its name.

## Edge cases

- An empty name is ignored and the old name kept.
