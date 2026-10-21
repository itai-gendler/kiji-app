---
kind: primary
routes:
  desktop: KiJi Reader app
steps:
- text: The User chooses Delete on a feed in the Feeds tab, or Delete Feed… in Edit Feed
  kind: actor
  actor: user
  entities:
  - entity: feed
    effect: reads
    facts:
    - Name
  contexts:
    desktop:
      place: kiji-reader::feeds
- text: The Product asks "Delete “Name”? Its articles are removed too. Articles you saved stay in Saved."
  kind: product
  actor: user
  entities:
  - entity: feed
    effect: reads
    facts:
    - Name
  - entity: article
    as: unread-articles
    effect: reads
    facts: []
  contexts:
    desktop:
      place: kiji-reader::feeds
- text: The User confirms
  kind: actor
  actor: user
  entities: []
  contexts:
    desktop:
      place: kiji-reader::feeds
- text: The Product removes the feed, takes it out of its stations, and removes its articles except those another
    followed feed also delivers
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
    effect: changes
    facts:
    - Feeds
  contexts:
    desktop:
      place: kiji-reader::feeds
---

# Delete one feed

## Trigger

The User no longer wants a site.

## Outcome

The feed and its articles are gone from the sidebar and lists; saved copies remain in Saved.
