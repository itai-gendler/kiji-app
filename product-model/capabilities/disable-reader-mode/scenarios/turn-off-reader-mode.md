---
kind: primary
routes:
  desktop: KiJi Reader app
steps:
- text: The User chooses Disable reader mode
  kind: actor
  actor: user
  entities:
  - entity: feed
    effect: reads
    facts:
    - Reader mode
  contexts:
    desktop:
      place: kiji-reader::article
- text: The Product shows the text the feed carries and stops waiting for the page
  kind: product
  actor: user
  entities:
  - entity: article
    effect: reads
    facts:
    - Content
  - entity: feed
    effect: reads
    facts: []
  contexts:
    desktop:
      place: kiji-reader::article
- text: The Product remembers that the feed's articles open without reader mode
  kind: product
  actor: user
  entities:
  - entity: feed
    effect: changes
    facts:
    - Reader mode
  - entity: article
    effect: reads
    facts: []
  contexts:
    desktop:
      place: kiji-reader::article
---

# Turn off reader mode

## Trigger

The User prefers the feed's own text.

## Outcome

The article shows the feed's text, and so do the feed's next articles.
