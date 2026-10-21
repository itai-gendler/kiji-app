---
kind: validation
routes:
  desktop: KiJi Reader app
steps:
- text: The User presses P in an article window
  kind: actor
  actor: user
  entities:
  - entity: article
    effect: reads
    facts: []
  contexts:
    desktop:
      place: kiji-reader::article
- text: The clipboard holds no web address
  kind: condition
  actor: user
  entities: []
  contexts:
    desktop:
      place: kiji-reader::article
- text: The Product says no valid URL was found in the clipboard
  kind: product
  actor: user
  entities: []
  contexts:
    desktop:
      place: kiji-reader::article
---

# No link in the clipboard

## Trigger

The clipboard holds something other than a link.

## Outcome

Nothing is loaded.
