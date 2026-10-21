---
kind: primary
routes:
  desktop: KiJi Reader app
steps:
- text: The User chooses Clear Saved Articles in the File menu
  kind: actor
  actor: user
  entities:
  - entity: saved-article
    effect: reads
    facts: []
  contexts:
    desktop:
      place: kiji-reader
- text: The Product asks "Clear all saved articles?"
  kind: product
  actor: user
  entities:
  - entity: saved-article
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
- text: The Product removes every saved article one by one, showing its progress, and marks their feed articles
    as not saved
  kind: product
  actor: user
  entities:
  - entity: saved-article
    effect: removes
  - entity: article
    effect: changes
    facts:
    - Saved
  - entity: feed
    effect: reads
    facts: []
  contexts:
    desktop:
      place: kiji-reader
---

# Clear all saved articles

## Trigger

The User empties Saved.

## Outcome

Saved is empty; the feed articles are still there, no longer marked saved.

## Edge cases

- With nothing in Saved, the sidebar says "No saved" and nothing is asked.
