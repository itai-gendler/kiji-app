---
kind: alternate
routes:
  desktop: KiJi Reader app
steps:
- text: The User selects a station in the sidebar
  kind: actor
  actor: user
  entities:
  - entity: station
    effect: reads
    facts:
    - Name
  contexts:
    desktop:
      place: kiji-reader::article-list
- text: The Product lists the articles of every feed in the station together, newest first, each story once
  kind: product
  actor: user
  entities:
  - entity: station
    effect: reads
    facts:
    - Feeds
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
- text: The Product moves the station's feeds to the front of background refresh for the next five minutes and says
    it is syncing the station
  kind: product
  actor: user
  entities:
  - entity: feed
    effect: reads
    facts:
    - Last updated
  - entity: station
    effect: reads
    facts: []
  contexts:
    desktop:
      place: kiji-reader::article-list
- text: The Product adds the new stories those feeds deliver to the open list as unread articles
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
  target: src/services/feeds/stationSwitchLimits.ts
- kind: code
  role: implementation
  target: src/services/scheduler/feedSchedulerService.ts
---

# Open a station

## Trigger

The User wants to catch up on one group of feeds.

## Outcome

The list shows the station's articles and fills in as its feeds update.

## Edge cases

- A story delivered by two feeds in the station appears once.
