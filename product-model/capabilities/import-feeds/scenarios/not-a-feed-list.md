---
kind: validation
routes:
  desktop: KiJi Reader app
steps:
- text: The User picks a file to import as a feed list
  kind: actor
  actor: user
  entities:
  - entity: feed
    effect: reads
    facts: []
  contexts:
    desktop:
      place: kiji-reader::add-feeds
- text: The file is empty or not an OPML document
  kind: condition
  actor: user
  entities: []
  contexts:
    desktop:
      place: kiji-reader::add-feeds
- text: The Product says the file is not a feed list KiJi can read, and to choose an .opml file exported from another
    reader
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

# The file is not a feed list

## Trigger

The User picked the wrong file.

## Outcome

Nothing is imported.
