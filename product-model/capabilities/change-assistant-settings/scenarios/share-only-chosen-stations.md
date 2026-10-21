---
kind: alternate
routes:
  desktop: KiJi Reader app
steps:
- text: The User chooses Only stations I choose and ticks stations
  kind: actor
  actor: user
  entities:
  - entity: assistant-settings
    effect: reads
    facts:
    - Shared stations
  - entity: station
    effect: reads
    facts:
    - Name
  contexts:
    desktop:
      place: kiji-reader::assistant
- text: The Product saves the shared stations
  kind: product
  actor: user
  entities:
  - entity: assistant-settings
    effect: changes
    facts:
    - Shared stations
  - entity: station
    effect: reads
    facts: []
  contexts:
    desktop:
      place: kiji-reader::assistant
---

# Share only chosen stations

## Trigger

Some stations are private.

## Outcome

Assistants see articles only from the ticked stations, plus feeds in no station when those are shared.

## Edge cases

- Feeds without a station, Saved articles, Notes and highlights and The article I'm reading have switches of their own.
