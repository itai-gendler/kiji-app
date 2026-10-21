---
kind: primary
routes:
  desktop: KiJi Reader app
steps:
- text: The User opens Edit Feed from the Feeds tab, or from Edit feed in the sidebar
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
- text: The User changes the name and chooses Save
  kind: actor
  actor: user
  entities:
  - entity: feed
    effect: reads
    facts:
    - Name
  contexts:
    desktop:
      place: kiji-reader::feed
- text: The Product saves the name and shows it in the sidebar, the lists and the article views
  kind: product
  actor: user
  entities:
  - entity: feed
    effect: changes
    facts:
    - Name
  - entity: article
    effect: reads
    facts: []
  contexts:
    desktop:
      place: kiji-reader::feed
---

# Rename a feed

## Trigger

A feed's own title is too long or unclear.

## Outcome

The feed shows the new name everywhere.

## Edge cases

- Save stays unavailable while the name or the address is empty.
