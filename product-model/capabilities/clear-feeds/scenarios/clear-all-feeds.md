---
kind: primary
routes:
  desktop: KiJi Reader app
steps:
- text: The User chooses Clear Feeds in the File menu
  kind: actor
  actor: user
  entities:
  - entity: feed
    effect: reads
    facts: []
  contexts:
    desktop:
      place: kiji-reader
- text: The Product asks "Clear all feeds?", saying every subscription and its articles go and saved articles stay
    in Saved
  kind: product
  actor: user
  entities:
  - entity: saved-article
    effect: reads
    facts: []
  - entity: article
    as: unread-articles
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
- text: The Product removes every feed and its articles, then every station
  kind: product
  actor: user
  entities:
  - entity: feed
    effect: removes
    from: Updated
  - entity: article
    as: unread-articles
    effect: removes
    from: Unread
  - entity: article
    as: read-articles
    effect: removes
    from: Read
  - entity: station
    effect: removes
  contexts:
    desktop:
      place: kiji-reader
- text: The Product says in the sidebar how many feeds it cleared
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

# Clear all feeds

## Trigger

The User starts over.

## Outcome

The sidebar has no stations and no feeds; Saved is unchanged.
