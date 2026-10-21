---
kind: alternate
routes:
  desktop: KiJi Reader app
steps:
- text: The User imports a list that includes feeds they already follow
  kind: actor
  actor: user
  entities:
  - entity: feed
    effect: reads
    facts: []
  contexts:
    desktop:
      place: kiji-reader::add-feeds
- text: The Product does not add those feeds again, counting them as duplicates
  kind: product
  actor: user
  entities:
  - entity: feed
    effect: reads
    facts:
    - Feed address
  contexts:
    desktop:
      place: kiji-reader::add-feeds
- text: The Product still puts each of them into the station its folder names and gives it the list's emoji
  kind: product
  actor: user
  entities:
  - entity: station
    effect: changes
    facts:
    - Feeds
  - entity: feed
    effect: changes
    facts:
    - Icon
  contexts:
    desktop:
      place: kiji-reader::add-feeds
---

# Import feeds already followed

## Trigger

The User imports a list that overlaps their library.

## Outcome

No feed is duplicated; existing feeds join the stations the list puts them in.
