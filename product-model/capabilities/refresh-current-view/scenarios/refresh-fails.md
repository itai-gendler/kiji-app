---
kind: edge
routes:
  desktop: KiJi Reader app
steps:
- text: The User chooses Refresh current view with a feed selected
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
- text: The site does not answer within five seconds, or sends something that is not a feed
  kind: condition
  actor: user
  entities:
  - entity: feed
    effect: reads
    facts:
    - Feed address
  contexts:
    desktop:
      place: kiji-reader::article-list
- text: The Product counts one more failed update for the feed and records when it failed
  kind: product
  actor: user
  entities:
  - entity: feed
    effect: changes
    from: Updated
    to: Can't update
    facts:
    - Failed updates
  contexts:
    desktop:
      place: kiji-reader::article-list
---

# The refresh fails

## Trigger

The site is down or the address no longer serves a feed.

## Outcome

The list keeps what KiJi had; Manage Feeds shows the feed as Can't update.

## Edge cases

- With a Library view selected, Refresh reloads the list from what KiJi keeps, without fetching.
