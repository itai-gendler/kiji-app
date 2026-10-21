---
kind: alternate
routes:
  desktop: KiJi Reader app
steps:
- text: The User chooses Clear Feeds with no feeds
  kind: actor
  actor: user
  entities:
  - entity: feed
    effect: reads
    facts: []
  contexts:
    desktop:
      place: kiji-reader
- text: The Product says "No feeds" in the sidebar and asks nothing
  kind: product
  actor: user
  entities:
  - entity: feed
    effect: reads
    facts: []
  contexts:
    desktop:
      place: kiji-reader::article-list
---

# No feeds to clear

## Trigger

There is nothing to clear.

## Outcome

Nothing changes.
