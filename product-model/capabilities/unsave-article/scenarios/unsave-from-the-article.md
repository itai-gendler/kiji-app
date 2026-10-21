---
kind: primary
routes:
  desktop: KiJi Reader app
steps:
- text: The User chooses Unsave article on a saved article
  kind: actor
  actor: user
  entities:
  - entity: article
    effect: reads
    facts:
    - Saved
  - entity: saved-article
    effect: reads
    facts: []
  contexts:
    desktop:
      place: kiji-reader::article
- text: The Product removes the copy from Saved
  kind: product
  actor: user
  entities:
  - entity: saved-article
    effect: removes
  contexts:
    desktop:
      place: kiji-reader::article
- text: The Product marks the feed article as not saved
  kind: product
  actor: user
  entities:
  - entity: article
    effect: changes
    facts:
    - Saved
  - entity: feed
    effect: reads
    facts: []
  contexts:
    desktop:
      place: kiji-reader::article
---

# Unsave the open article

## Trigger

The User no longer needs the copy.

## Outcome

The article is gone from Saved; the feed article itself stays.
