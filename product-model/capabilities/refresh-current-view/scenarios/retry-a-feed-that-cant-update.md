---
kind: alternate
routes:
  desktop: KiJi Reader app
steps:
- text: The User chooses Refresh current view with a feed that can't update selected
  kind: actor
  actor: user
  entities:
  - entity: feed
    effect: reads
    facts:
    - Name
  contexts:
    desktop:
      place: kiji-reader::article-list
- text: The Product fetches it at once instead of waiting for its next retry
  kind: product
  actor: user
  entities:
  - entity: feed
    effect: reads
    facts:
    - Feed address
  contexts:
    desktop:
      place: kiji-reader::article-list
- text: 'The fetch succeeds: the Product clears the failures and records the update'
  kind: product
  actor: user
  entities:
  - entity: feed
    effect: changes
    from: Can't update
    to: Updated
    facts:
    - Last updated
    - Failed updates
    - Article counts
  contexts:
    desktop:
      place: kiji-reader::article-list
---

# Retry a feed that can't update

## Trigger

A site that was down is back.

## Outcome

The feed counts as updated again and is refreshed on schedule.
