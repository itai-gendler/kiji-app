---
kind: alternate
routes:
  desktop: KiJi Reader app
steps:
- text: The User selects Read under Library
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
- text: The Product lists the read articles, the most recently read first
  kind: product
  actor: user
  entities:
  - entity: article
    effect: reads
    facts:
    - Title
    - Summary
    - Published
    - Last read
  contexts:
    desktop:
      place: kiji-reader::article-list
---

# Open Read

## Trigger

The User wants to find an article they already read.

## Outcome

The articles read most recently are at the top.

## Edge cases

- All Items lists every article, read or not, newest first.
