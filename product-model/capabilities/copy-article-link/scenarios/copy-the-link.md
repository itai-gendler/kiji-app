---
kind: primary
routes:
  desktop: KiJi Reader app
steps:
- text: The User presses Y while reading
  kind: actor
  actor: user
  entities:
  - entity: article
    effect: reads
    facts:
    - Link
  contexts:
    desktop:
      place: kiji-reader::article
- text: The Product copies the article's link
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

# Copy the link

## Trigger

The User wants to paste the link somewhere.

## Outcome

The link is on the clipboard.

## Edge cases

- If copying fails, a message says so.
