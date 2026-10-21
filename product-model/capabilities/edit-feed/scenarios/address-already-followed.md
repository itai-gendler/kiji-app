---
kind: validation
routes:
  desktop: KiJi Reader app
steps:
- text: The User enters the address of another followed feed and saves
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
- text: The Product says "You already follow a feed at this address." and keeps the editor open with nothing saved
  kind: product
  actor: user
  entities:
  - entity: feed
    effect: reads
    facts: []
  contexts:
    desktop:
      place: kiji-reader::feed
---

# The address is already followed

## Trigger

The User types an address they already follow.

## Outcome

Both feeds stay as they were.

## Edge cases

- An address that does not start with http:// or https:// is refused the same way, with its own message.
