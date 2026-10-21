---
kind: alternate
routes:
  desktop: KiJi Reader app
steps:
- text: The User pastes the link of a feed they already follow
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
- text: The Product says "You already follow this feed", naming its stations, and offers Show feed
  kind: product
  actor: user
  entities:
  - entity: feed
    effect: reads
    facts:
    - Name
  - entity: station
    effect: reads
    facts:
    - Name
  contexts:
    desktop:
      place: kiji-reader::add-feeds
- text: The User chooses Show feed
  kind: actor
  actor: user
  entities:
  - entity: feed
    effect: reads
    facts:
    - Name
  contexts:
    desktop:
      place: kiji-reader::add-feeds
- text: The Product opens that feed in the sidebar
  kind: product
  actor: user
  entities:
  - entity: feed
    effect: reads
    facts:
    - Name
  contexts:
    desktop:
      place: kiji-reader::article-list
---

# Paste a feed already followed

## Trigger

The User forgot they follow a site.

## Outcome

No second copy of the feed exists; the existing one is open.
