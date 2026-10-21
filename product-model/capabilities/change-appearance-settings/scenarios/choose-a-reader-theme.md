---
kind: primary
routes:
  desktop: KiJi Reader app
steps:
- text: The User picks a reader theme, such as Paper, Sepia or High Contrast
  kind: actor
  actor: user
  entities:
  - entity: settings
    effect: reads
    facts:
    - Reader theme
  contexts:
    desktop:
      place: kiji-reader::appearance-settings
- text: The Product applies its light or dark version, following the theme, to the article view
  kind: product
  actor: user
  entities:
  - entity: settings
    effect: changes
    facts:
    - Reader theme
  - entity: article
    effect: reads
    facts: []
  contexts:
    desktop:
      place: kiji-reader::appearance-settings
---

# Choose a reader theme

## Trigger

The User wants reading to look like a book.

## Outcome

Articles use the reader theme's colours and fonts.
