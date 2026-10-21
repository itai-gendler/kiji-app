---
kind: primary
routes:
  desktop: KiJi Reader app
steps:
- text: The User clicks the article's title or presses O
  kind: actor
  actor: user
  entities:
  - entity: article
    effect: reads
    facts:
    - Title
    - Link
  contexts:
    desktop:
      place: kiji-reader::article
- text: The Product opens the article's link in the default browser
  kind: product
  actor: user
  entities:
  - entity: article
    effect: reads
    facts:
    - Link
  contexts:
    desktop:
      place: kiji-reader::article
---

# Open the page

## Trigger

The User wants the original page.

## Outcome

The page opens in the browser; links inside articles open there too.
