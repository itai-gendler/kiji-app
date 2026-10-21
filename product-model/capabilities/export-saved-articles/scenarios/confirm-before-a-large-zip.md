---
kind: alternate
routes:
  desktop: KiJi Reader app
steps:
- text: The User exports saved articles
  kind: actor
  actor: user
  entities:
  - entity: saved-article
    effect: reads
    facts: []
  contexts:
    desktop:
      place: kiji-reader
- text: The ZIP is estimated at more than 1 GB, or at more than the free disk space
  kind: condition
  actor: user
  entities:
  - entity: saved-article
    effect: reads
    facts:
    - Content
  contexts:
    desktop:
      place: kiji-reader
- text: The Product shows the number of articles, the estimated size and the free space, and asks before exporting
  kind: product
  actor: user
  entities:
  - entity: article
    effect: reads
    facts: []
  contexts:
    desktop:
      place: kiji-reader
- text: The User confirms
  kind: actor
  actor: user
  entities: []
  contexts:
    desktop:
      place: kiji-reader
- text: The Product writes the ZIP in the background
  kind: product
  actor: user
  entities:
  - entity: saved-article
    effect: reads
    facts:
    - Title
    - Link
    - Content
    - Saved on
    - Source
  contexts:
    desktop:
      place: kiji-reader
---

# Confirm a large export

## Trigger

The User has saved a great deal.

## Outcome

The export runs only after the User accepted its size.
