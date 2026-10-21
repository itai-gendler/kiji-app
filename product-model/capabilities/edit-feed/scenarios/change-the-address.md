---
kind: alternate
routes:
  desktop: KiJi Reader app
steps:
- text: The User enters a new feed address and saves
  kind: actor
  actor: user
  entities:
  - entity: feed
    effect: reads
    facts:
    - Feed address
  contexts:
    desktop:
      place: kiji-reader::feed
- text: The address is a full web address that no other followed feed uses
  kind: condition
  actor: user
  entities:
  - entity: feed
    effect: reads
    facts:
    - Feed address
  contexts:
    desktop:
      place: kiji-reader::feed
- text: The Product saves the new address and fetches from it from then on
  kind: product
  actor: user
  entities:
  - entity: feed
    effect: changes
    facts:
    - Feed address
  contexts:
    desktop:
      place: kiji-reader::feed
---

# Change the feed address

## Trigger

A site moved its feed.

## Outcome

The feed keeps its articles and stations and updates from the new address.
