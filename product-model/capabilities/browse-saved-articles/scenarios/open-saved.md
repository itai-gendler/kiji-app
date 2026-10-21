---
kind: primary
routes:
  desktop: KiJi Reader app
steps:
- text: The User selects Saved under Library
  kind: actor
  actor: user
  entities:
  - entity: settings
    effect: reads
    facts:
    - Library views
  contexts:
    desktop:
      place: kiji-reader::article-list
- text: The Product lists the saved articles, the most recently saved first, with their source and date
  kind: product
  actor: user
  entities:
  - entity: saved-article
    effect: reads
    facts:
    - Title
    - Source
    - Published
    - Saved on
  contexts:
    desktop:
      place: kiji-reader::article-list
---

# Open Saved

## Trigger

The User wants the articles they kept.

## Outcome

Saved lists every saved article, including links saved on their own and imported ones.
