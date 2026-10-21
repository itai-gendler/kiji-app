---
kind: primary
routes:
  desktop: KiJi Reader app
steps:
- text: The User chooses Refresh current view, or presses Command-R, with a feed selected
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
- text: The Product fetches the feed now, even if it was fetched a moment ago or is waiting after failed updates
  kind: product
  actor: user
  entities:
  - entity: feed
    effect: changes
    from: Updated
    to: Updated
    facts:
    - Last updated
    - Failed updates
    - Article counts
    - Posting frequency
  contexts:
    desktop:
      place: kiji-reader::article-list
- text: The Product adds the new stories to the list as unread articles
  kind: product
  actor: user
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
  contexts:
    desktop:
      place: kiji-reader::article-list
---

# Refresh a feed

## Trigger

The User expects something new from a site.

## Outcome

The list shows whatever the feed has now.
