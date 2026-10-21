---
entities:
- entity: station
  shows:
  - Name
  - Emoji
  - Position
  - Feeds
  collects:
  - Name
  - Emoji
references:
- kind: code
  role: implementation
  target: src/components/ManageFeedsWindow/StationsPane.tsx#StationsPane
---

# Manage Feeds: Stations

The Stations tab of Manage Feeds: every station in sidebar order with its emoji and feed count.
