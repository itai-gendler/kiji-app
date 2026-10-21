---
kind: alternate
routes:
  desktop: KiJi Reader app
steps:
- text: The User turns on Custom layout and sets text size, weight, spacing, width and alignment
  kind: actor
  actor: user
  entities:
  - entity: settings
    effect: reads
    facts:
    - Reading layout
  contexts:
    desktop:
      place: kiji-reader::reading-settings
- text: The Product applies the layout to the article view
  kind: product
  actor: user
  entities:
  - entity: settings
    effect: changes
    facts:
    - Reading layout
  - entity: article
    effect: reads
    facts: []
  contexts:
    desktop:
      place: kiji-reader::reading-settings
---

# Set a custom layout

## Trigger

The User wants narrower columns or larger text.

## Outcome

Articles use the custom layout until it is turned off.
