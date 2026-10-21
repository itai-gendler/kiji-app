---
kind: alternate
routes:
  desktop: KiJi Reader app
steps:
- text: The User drags a view in the Library tab or under Library in the sidebar
  kind: actor
  actor: user
  entities:
  - entity: settings
    effect: reads
    facts:
    - Library views
  contexts:
    desktop:
      place: kiji-reader::library
- text: The Product saves the new order
  kind: product
  actor: user
  entities:
  - entity: settings
    effect: changes
    facts:
    - Library views
  contexts:
    desktop:
      place: kiji-reader::library
---

# Reorder Library views

## Trigger

The User wants Unread first.

## Outcome

The views appear in the chosen order.
