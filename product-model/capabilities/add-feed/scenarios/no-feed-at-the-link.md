---
kind: validation
routes:
  desktop: KiJi Reader app
steps:
- text: The User pastes a link
  kind: actor
  actor: user
  entities: []
  contexts:
    desktop:
      place: kiji-reader::add-feeds
- text: The page at the link is not an RSS, Atom or JSON feed
  kind: condition
  actor: user
  entities:
  - entity: feed
    effect: reads
    facts: []
  contexts:
    desktop:
      place: kiji-reader::add-feeds
- text: The Product says there is no feed at this link, suggests the site's RSS or Atom link instead, and offers
    Try again
  kind: product
  actor: user
  entities:
  - entity: feed
    effect: reads
    facts: []
  contexts:
    desktop:
      place: kiji-reader::add-feeds
---

# No feed at the link

## Trigger

The User pasted a page rather than its feed.

## Outcome

Nothing is added.

## Edge cases

- A site that takes too long to answer gets its own message to check the connection.
