---
kind: alternate
routes:
  desktop: KiJi Reader app
steps:
- text: A feed added from a list has never been fetched
  kind: condition
  unattended: true
  entities:
  - entity: feed
    effect: reads
    facts:
    - Last updated
  contexts:
    desktop:
      place: kiji-reader::article-list
- text: The Product fetches it among the first, together with the other feeds just imported
  kind: product
  entities:
  - entity: feed
    effect: reads
    facts:
    - Feed address
  contexts:
    desktop:
      place: kiji-reader::article-list
- text: The Product keeps its stories as unread articles and records the update
  kind: product
  entities:
  - entity: article
    effect: creates
    to: Unread
    facts:
    - Title
    - Summary
    - Content
    - Link
    - Author
    - Published
    - Fetched
    - Starred
    - Saved
  - entity: feed
    effect: changes
    from: Not updated yet
    to: Updated
    facts:
    - Last updated
    - Article counts
    - Posting frequency
  contexts:
    desktop:
      place: kiji-reader::article-list
---

# First update of a new feed

## Trigger

Feeds were just imported from a feed list.

## Outcome

The imported feeds fill with articles shortly after the import.
