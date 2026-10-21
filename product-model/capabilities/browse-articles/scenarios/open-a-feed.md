---
kind: primary
routes:
  desktop: KiJi Reader app
steps:
- text: The User selects a feed in the sidebar
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
- text: The Product lists the articles it keeps from that feed, newest first
  kind: product
  actor: user
  entities:
  - entity: article
    effect: reads
    facts:
    - Title
    - Summary
    - Published
  - entity: feed
    effect: reads
    facts: []
  contexts:
    desktop:
      place: kiji-reader::article-list
- text: The feed was last fetched more than a minute ago and is not waiting after failed updates
  kind: condition
  actor: user
  entities:
  - entity: feed
    effect: reads
    facts:
    - Last updated
    - Failed updates
  contexts:
    desktop:
      place: kiji-reader::article-list
- text: The Product fetches the feed and adds its new stories to the list as unread articles
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
  - entity: feed
    effect: changes
    facts:
    - Last updated
    - Article counts
  contexts:
    desktop:
      place: kiji-reader::article-list
references:
- kind: code
  role: implementation
  target: src/contexts/FeedContext.tsx#FeedProvider
- kind: code
  role: implementation
  target: src/constants.ts
---

# Open a feed

## Trigger

The User wants to read what one feed has published.

## Outcome

The list shows the feed's articles, including any it published since the last update.

## Edge cases

- A feed fetched within the last minute, or waiting after failed updates, shows only what KiJi already keeps.
- An unchanged feed adds nothing; the list stays as it was.
