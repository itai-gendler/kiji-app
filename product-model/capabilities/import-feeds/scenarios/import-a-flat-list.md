---
kind: alternate
routes:
  desktop: KiJi Reader app
steps:
- text: The User imports a feed list whose entries are all feeds, with no folders
  kind: actor
  actor: user
  entities:
  - entity: feed
    effect: reads
    facts: []
  contexts:
    desktop:
      place: kiji-reader::add-feeds
- text: The Product names a station after the file, or after the last part of the link it came from, or after the
    list's title unless that title is generic, such as Feeds or Subscriptions
  kind: product
  actor: user
  entities:
  - entity: station
    effect: creates
    facts:
    - Name
    - Emoji
    - Position
    - Feeds
    - Created
  - entity: feed
    effect: reads
    facts: []
  contexts:
    desktop:
      place: kiji-reader::add-feeds
- text: The Product adds the new feeds and puts every feed of the list into that station
  kind: product
  actor: user
  entities:
  - entity: feed
    effect: creates
    to: Not updated yet
    facts:
    - Name
    - Feed address
    - Icon
    - Reader mode
    - Added
    - Failed updates
    - Position
  - entity: station
    effect: reads
    facts: []
  contexts:
    desktop:
      place: kiji-reader::add-feeds
- text: The Product says how many feeds it imported and skipped
  kind: product
  actor: user
  entities:
  - entity: feed
    effect: reads
    facts: []
  contexts:
    desktop:
      place: kiji-reader::add-feeds
- text: The Product opens the station
  kind: product
  actor: user
  entities:
  - entity: station
    effect: reads
    facts:
    - Name
  contexts:
    desktop:
      place: kiji-reader::article-list
---

# Import a list without folders

## Trigger

The User imports a plain list, such as one exported from a reader without folders.

## Outcome

All the list's feeds are in one station named after the file, for example tech-blogs.opml becomes "tech blogs".

## Edge cases

- A Feeds.opml that KiJi exported from a library without stations is such a list: imported again, its feeds land in a station called Feeds.
- A name that is already a station adds the feeds to that station.
