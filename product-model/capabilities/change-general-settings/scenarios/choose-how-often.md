---
kind: primary
routes:
  desktop: KiJi Reader app
steps:
- text: The User picks how often KiJi checks for news
  kind: actor
  actor: user
  entities:
  - entity: settings
    effect: reads
    facts:
    - Check for new articles
  contexts:
    desktop:
      place: kiji-reader::general-settings
- text: The Product saves it and restarts background refresh on the new schedule
  kind: product
  actor: user
  entities:
  - entity: settings
    effect: changes
    facts:
    - Check for new articles
  contexts:
    desktop:
      place: kiji-reader::general-settings
---

# Choose how often to check

## Trigger

Fifteen minutes is too often or not often enough.

## Outcome

Background refresh follows the new choice from now on.
