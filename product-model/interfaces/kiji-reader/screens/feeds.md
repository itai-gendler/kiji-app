---
entities:
- entity: feed
  shows:
  - Name
  - Feed address
  - Icon
  - Added
  - Last updated
  - Failed updates
  - Article counts
- entity: station
  shows:
  - Name
references:
- kind: code
  role: implementation
  target: src/components/ManageFeedsWindow/FeedsPane.tsx#FeedsPane
---

# Manage Feeds: Feeds

The Feeds tab of Manage Feeds: every subscription with its icon, site, stations, article count and status, with search, the All, Can't Update and No Station filters, sorting, and several feeds selected at once.
