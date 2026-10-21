---
entities:
- entity: station
  shows:
  - Name
  - Emoji
  - Feeds
- entity: feed
  shows:
  - Name
  - Icon
references:
- kind: code
  role: implementation
  target: src/components/ManageFeedsWindow/StationsPane.tsx#StationFeedsDialog
---

# Feeds in a Station

Choosing which feeds one station groups, from every feed the user follows.
