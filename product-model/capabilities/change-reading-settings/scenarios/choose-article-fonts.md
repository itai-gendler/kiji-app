---
kind: primary
routes:
  desktop: KiJi Reader app
steps:
- text: The User picks fonts for Titles, Body text or East Asian text
  kind: actor
  actor: user
  entities:
  - entity: settings
    effect: reads
    facts:
    - Article fonts
  contexts:
    desktop:
      place: kiji-reader::reading-settings
- text: The Product applies them to the article list and the article view
  kind: product
  actor: user
  entities:
  - entity: settings
    effect: changes
    facts:
    - Article fonts
  - entity: article
    effect: reads
    facts: []
  contexts:
    desktop:
      place: kiji-reader::reading-settings
---

# Choose article fonts

## Trigger

The User prefers another typeface for reading.

## Outcome

Articles use the chosen fonts.
