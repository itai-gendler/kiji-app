---
kind: alternate
routes:
  desktop: KiJi Reader app
steps:
- text: Settings say never to check automatically
  kind: condition
  unattended: true
  entities:
  - entity: settings
    effect: reads
    facts:
    - Check for new articles
  contexts:
    desktop:
      place: kiji-reader::article-list
- text: The Product runs no scheduled passes, not even after the computer wakes
  kind: product
  entities: []
  contexts:
    desktop:
      place: kiji-reader::article-list
---

# Never refresh automatically

## Trigger

The User wants KiJi to fetch only when asked.

## Outcome

Feeds update only when the User opens or refreshes them.
