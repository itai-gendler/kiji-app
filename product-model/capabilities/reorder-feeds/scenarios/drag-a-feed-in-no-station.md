---
kind: alternate
routes:
  desktop: KiJi Reader app
steps:
- text: The User drags a feed that is in no station above or below another such feed
  kind: actor
  actor: user
  entities:
  - entity: feed
    effect: reads
    facts:
    - Name
  - entity: station
    effect: reads
    facts: []
  contexts:
    desktop:
      place: kiji-reader::article-list
- text: The Product saves the new order of the feeds in no station
  kind: product
  actor: user
  entities:
  - entity: feed
    effect: changes
    facts:
    - Position
  - entity: station
    effect: reads
    facts: []
  contexts:
    desktop:
      place: kiji-reader::article-list
---

# Drag a feed among feeds in no station

## Trigger

The User orders the loose feeds.

## Outcome

The feeds in no station appear in the new order.
