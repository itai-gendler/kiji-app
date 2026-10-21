---
entities:
- entity: feed
  shows:
  - Name
  - Feed address
  - Icon
  collects:
  - Feed address
- entity: station
  shows:
  - Name
references:
- kind: code
  role: implementation
  target: src/components/Sidebar/AddFeedModal.tsx#AddFeedModal
---

# Add Feeds

Adding subscriptions: "From a link" previews the feed or feed list behind a pasted link, and "From a file" imports a feed list or saved articles.
