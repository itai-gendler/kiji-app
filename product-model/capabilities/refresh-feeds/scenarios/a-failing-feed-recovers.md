---
kind: alternate
routes:
  desktop: KiJi Reader app
steps:
- text: A feed that can't update has waited out its retry time
  kind: condition
  unattended: true
  entities:
  - entity: feed
    effect: reads
    facts:
    - Failed updates
  contexts:
    desktop:
      place: kiji-reader::article-list
- text: The Product fetches it in the next scheduled pass and it answers
  kind: product
  entities:
  - entity: feed
    effect: reads
    facts:
    - Feed address
  contexts:
    desktop:
      place: kiji-reader::article-list
- text: The Product clears its failures and keeps its new stories as unread articles
  kind: product
  entities:
  - entity: feed
    effect: changes
    from: Can't update
    to: Updated
    facts:
    - Last updated
    - Failed updates
    - Article counts
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
  contexts:
    desktop:
      place: kiji-reader::article-list
---

# A failing feed recovers

## Trigger

A site comes back.

## Outcome

The feed counts as updated again and leaves the Can't Update list.
