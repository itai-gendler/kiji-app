---
kind: alternate
routes:
  desktop: KiJi Reader app
steps:
- text: The User pastes the link of a feed that has no items yet
  kind: actor
  actor: user
  entities:
  - entity: feed
    effect: reads
    facts:
    - Feed address
  contexts:
    desktop:
      place: kiji-reader::add-feeds
- text: The Product previews it with "No articles yet"
  kind: product
  actor: user
  entities:
  - entity: feed
    effect: reads
    facts:
    - Name
    - Feed address
  - entity: article
    effect: reads
    facts: []
  contexts:
    desktop:
      place: kiji-reader::add-feeds
- text: The User chooses Add feed
  kind: actor
  actor: user
  entities:
  - entity: feed
    effect: reads
    facts: []
  contexts:
    desktop:
      place: kiji-reader::add-feeds
- text: The Product follows the feed without storing any article
  kind: product
  actor: user
  entities:
  - entity: feed
    effect: creates
    to: Not updated yet
    facts:
    - Name
    - Feed address
    - Icon
    - Reader mode
    - Added
    - Failed updates
    - Article counts
    - Position
  - entity: article
    effect: reads
    facts: []
  contexts:
    desktop:
      place: kiji-reader::add-feeds
---

# Add a feed with no articles yet

## Trigger

A new site starts its feed.

## Outcome

The feed is followed and shows "Not updated yet" until its first update.
