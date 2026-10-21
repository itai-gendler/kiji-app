---
kind: alternate
routes:
  desktop: KiJi Reader app
steps:
- text: The User chooses an emoji in Edit Feed and saves
  kind: actor
  actor: user
  entities:
  - entity: feed
    effect: reads
    facts:
    - Icon
  contexts:
    desktop:
      place: kiji-reader::feed
- text: The Product shows the emoji in place of the site's icon
  kind: product
  actor: user
  entities:
  - entity: feed
    effect: changes
    facts:
    - Icon
  contexts:
    desktop:
      place: kiji-reader::feed
---

# Choose an emoji

## Trigger

The site's icon is missing or hard to tell apart.

## Outcome

The emoji marks the feed; Use the site icon brings the icon back.
