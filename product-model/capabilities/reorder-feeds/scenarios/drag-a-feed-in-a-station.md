---
kind: primary
routes:
  desktop: KiJi Reader app
steps:
- text: The User drags a feed above or below another feed of the same station in the sidebar
  kind: actor
  actor: user
  entities:
  - entity: station
    effect: reads
    facts:
    - Name
    - Feeds
  - entity: feed
    effect: reads
    facts: []
  contexts:
    desktop:
      place: kiji-reader::article-list
- text: The Product saves the new order of the station's feeds
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
      place: kiji-reader::article-list
---

# Drag a feed within a station

## Trigger

The User wants a station's favourite feeds first.

## Outcome

The station lists its feeds in the new order.
