---
appliesTo:
- type: capability
  id: browse-articles
- type: capability
  id: refresh-current-view
references:
- kind: code
  role: implementation
  target: src/constants.ts
- kind: code
  role: implementation
  target: src/contexts/FeedContext.tsx#FeedProvider
---

# Opening a feed fetches it at most once a minute

Selecting a feed or a station fetches only the feeds not fetched in the last minute and not waiting after failed updates; otherwise it shows what KiJi keeps. Refresh current view fetches regardless.
