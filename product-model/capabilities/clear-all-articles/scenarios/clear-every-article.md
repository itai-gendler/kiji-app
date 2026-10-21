---
kind: primary
routes:
  desktop: KiJi Reader app
steps:
- text: The User chooses Clear All Articles in the File menu
  kind: actor
  actor: user
  entities:
  - entity: article
    as: read-articles
    effect: reads
    facts: []
  contexts:
    desktop:
      place: kiji-reader
- text: The Product asks "Clear all feed articles?", saying feeds and saved articles stay
  kind: product
  actor: user
  entities:
  - entity: saved-article
    effect: reads
    facts: []
  - entity: article
    as: read-articles
    effect: reads
    facts: []
  - entity: feed
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
- text: The Product removes every article that is not saved and says how many it cleared
  kind: product
  actor: user
  entities:
  - entity: article
    as: read-articles
    effect: removes
    from: Read
  - entity: article
    as: unread-articles
    effect: removes
    from: Unread
  contexts:
    desktop:
      place: kiji-reader
---

# Clear every article

## Trigger

The User wants a clean start but keeps their subscriptions.

## Outcome

Feeds stay followed with no articles until their next update; saved articles remain.

## Edge cases

- With no feeds or nothing to clear, the sidebar says "No articles" and nothing is asked.
