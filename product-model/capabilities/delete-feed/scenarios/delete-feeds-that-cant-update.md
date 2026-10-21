---
kind: alternate
routes:
  desktop: KiJi Reader app
steps:
- text: The User filters the Feeds tab to Can't Update and selects the feeds
  kind: actor
  actor: user
  entities:
  - entity: feed
    effect: reads
    facts:
    - Name
    - Failed updates
  contexts:
    desktop:
      place: kiji-reader::feeds
- text: The User chooses Delete… and confirms "Delete N feeds?"
  kind: actor
  actor: user
  entities:
  - entity: feed
    effect: reads
    facts: []
  contexts:
    desktop:
      place: kiji-reader::feeds
- text: The Product removes the selected feeds and their articles in one go, keeping articles other feeds deliver
    and saved copies
  kind: product
  actor: user
  entities:
  - entity: feed
    effect: removes
    from: Can't update
  - entity: article
    as: unread-articles
    effect: removes
    from: Unread
  - entity: article
    as: read-articles
    effect: removes
    from: Read
  - entity: station
    effect: changes
    facts:
    - Feeds
  contexts:
    desktop:
      place: kiji-reader::feeds
---

# Delete feeds that can't update

## Trigger

Several sites have stopped publishing.

## Outcome

The dead feeds are gone and the Can't Update filter is empty.

## Edge cases

- Delete or Backspace deletes the selected feeds after the same confirmation.
