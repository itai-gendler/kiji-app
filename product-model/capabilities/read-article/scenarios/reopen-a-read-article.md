---
kind: alternate
routes:
  desktop: KiJi Reader app
steps:
- text: The User opens an article already read
  kind: actor
  actor: user
  entities:
  - entity: article
    effect: reads
    facts:
    - Title
  contexts:
    desktop:
      place: kiji-reader::article-list
- text: The Product shows it and records when it was opened again
  kind: product
  actor: user
  entities:
  - entity: article
    effect: changes
    facts:
    - Last read
  contexts:
    desktop:
      place: kiji-reader::article
---

# Reopen a read article

## Trigger

The User goes back to something they read before.

## Outcome

The article moves to the top of the Read view.
