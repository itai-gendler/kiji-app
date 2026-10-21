---
kind: alternate
routes:
  desktop: KiJi Reader app
steps:
- text: The User chooses the Can't Update filter
  kind: actor
  actor: user
  entities: []
  contexts:
    desktop:
      place: kiji-reader::feeds
- text: The Product lists only the feeds whose latest update failed, with how many times in a row and when it last
    tried
  kind: product
  actor: user
  entities:
  - entity: feed
    effect: reads
    facts:
    - Name
    - Failed updates
    - Last updated
  contexts:
    desktop:
      place: kiji-reader::feeds
---

# Find feeds that can't update

## Trigger

The tab's subtitle says some feeds can't update.

## Outcome

The failing feeds are listed together; with none, the tab says every feed is updating normally.

## Edge cases

- No Station lists the feeds that are in no station.
