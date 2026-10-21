---
kind: primary
routes:
  desktop: KiJi Reader app
steps:
- text: The User drags a station above or below another, in the sidebar or the Stations tab
  kind: actor
  actor: user
  entities:
  - entity: station
    effect: reads
    facts:
    - Name
    - Position
  contexts:
    desktop:
      place: kiji-reader::stations
- text: The Product saves the new order and shows it in the sidebar and in Manage Feeds
  kind: product
  actor: user
  entities:
  - entity: station
    effect: changes
    facts:
    - Position
  - entity: feed
    effect: reads
    facts: []
  contexts:
    desktop:
      place: kiji-reader::stations
---

# Drag a station

## Trigger

The User wants the most read stations at the top.

## Outcome

Stations appear in the chosen order.

## Edge cases

- Option-Up and Option-Down move the focused station in the Stations tab.
