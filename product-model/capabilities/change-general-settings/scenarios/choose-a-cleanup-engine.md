---
kind: alternate
routes:
  desktop: KiJi Reader app
steps:
- text: The User picks Defuddle or Readability as the cleanup engine
  kind: actor
  actor: user
  entities:
  - entity: settings
    effect: reads
    facts:
    - Article cleanup
  contexts:
    desktop:
      place: kiji-reader::general-settings
- text: The Product saves the choice for pages loaded from a link
  kind: product
  actor: user
  entities:
  - entity: settings
    effect: changes
    facts:
    - Article cleanup
  contexts:
    desktop:
      place: kiji-reader::general-settings
---

# Choose the cleanup engine

## Trigger

Pages loaded from links come out cluttered or cut short.

## Outcome

The next page loaded from a link is cleaned up by the chosen engine.
