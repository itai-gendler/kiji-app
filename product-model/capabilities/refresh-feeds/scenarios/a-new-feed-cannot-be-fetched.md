---
kind: edge
routes:
  desktop: KiJi Reader app
steps:
- text: A feed added from a list has never been fetched
  kind: condition
  unattended: true
  entities:
  - entity: feed
    effect: reads
    facts:
    - Last updated
  contexts:
    desktop:
      place: kiji-reader::article-list
- text: The site does not answer in time or sends no readable feed
  kind: condition
  entities:
  - entity: feed
    effect: reads
    facts:
    - Feed address
  contexts:
    desktop:
      place: kiji-reader::article-list
- text: The Product counts the failed update and waits before trying it again
  kind: product
  entities:
  - entity: feed
    effect: changes
    from: Not updated yet
    to: Can't update
    facts:
    - Failed updates
  contexts:
    desktop:
      place: kiji-reader::article-list
---

# A new feed cannot be fetched

## Trigger

An imported list holds an address that no longer serves a feed.

## Outcome

The feed is listed under Can't Update with no articles; deleting it or fixing its address are the ways out.
