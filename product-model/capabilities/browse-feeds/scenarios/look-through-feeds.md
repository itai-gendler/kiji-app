---
kind: primary
routes:
  desktop: KiJi Reader app
steps:
- text: The User opens Manage Feeds
  kind: actor
  actor: user
  entities:
  - entity: feed
    effect: reads
    facts: []
  contexts:
    desktop:
      place: kiji-reader::feeds
- text: The Product lists every feed with its icon, site, stations, article count and status, the most recently
    added first
  kind: product
  actor: user
  entities:
  - entity: feed
    effect: reads
    facts:
    - Name
    - Feed address
    - Icon
    - Added
    - Last updated
    - Failed updates
    - Article counts
  - entity: station
    effect: reads
    facts:
    - Name
  - entity: article
    effect: reads
    facts: []
  contexts:
    desktop:
      place: kiji-reader::feeds
- text: The User searches by name, address or station name, or changes the sort order
  kind: actor
  actor: user
  entities:
  - entity: feed
    effect: reads
    facts:
    - Name
    - Feed address
  - entity: station
    effect: reads
    facts: []
  contexts:
    desktop:
      place: kiji-reader::feeds
---

# Look through feeds

## Trigger

The User wants an overview of their subscriptions.

## Outcome

Every feed, or every match of the search, is listed with its status, such as "Updated 5 min ago" or "Not updated yet".

## Edge cases

- With no feeds, the tab offers Add Feed… and importing a list from another reader.
