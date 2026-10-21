---
kind: primary
routes:
  desktop: KiJi Reader app
steps:
- text: The User chooses Share article
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
- text: The Product opens the system share menu with the article's title and link
  kind: product
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
---

# Share the open article

## Trigger

The User wants to send the article elsewhere.

## Outcome

The system share menu offers its destinations.

## Edge cases

- Articles without a link cannot be shared.
