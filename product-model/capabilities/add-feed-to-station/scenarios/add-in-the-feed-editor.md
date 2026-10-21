---
kind: alternate
routes:
  desktop: KiJi Reader app
steps:
- text: The User ticks a station under Stations in Edit Feed and saves
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
      place: kiji-reader::feed
- text: The Product adds the feed to that station
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
      place: kiji-reader::feed
---

# Tick a station in Edit Feed

## Trigger

The User is already editing the feed.

## Outcome

The feed is in the ticked station too.
