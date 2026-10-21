---
kind: primary
routes:
  desktop: KiJi Reader app
steps:
- text: The User chooses Clear Articles Older Than 3 Months in the File menu
  kind: actor
  actor: user
  entities:
  - entity: article
    as: read-articles
    effect: reads
    facts: []
  contexts:
    desktop:
      place: kiji-reader
- text: The Product asks first, saying feeds, starred articles and saved articles stay
  kind: product
  actor: user
  entities:
  - entity: saved-article
    effect: reads
    facts: []
  - entity: article
    as: read-articles
    effect: reads
    facts: []
  - entity: feed
    effect: reads
    facts: []
  contexts:
    desktop:
      place: kiji-reader
- text: The User confirms
  kind: actor
  actor: user
  entities: []
  contexts:
    desktop:
      place: kiji-reader
- text: The Product removes every article published more than three months ago, or fetched then when it has no date,
    unless it is saved or starred, and frees the disk space
  kind: product
  actor: user
  entities:
  - entity: article
    as: read-articles
    effect: removes
    from: Read
  - entity: article
    as: unread-articles
    effect: removes
    from: Unread
  contexts:
    desktop:
      place: kiji-reader
---

# Clear articles older than 3 months

## Trigger

The library has grown large.

## Outcome

Only recent, saved and starred articles remain; feeds are untouched.
