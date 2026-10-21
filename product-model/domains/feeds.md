---
references:
- kind: code
  role: implementation
  target: src/components/ManageFeedsWindow/FeedsPane.tsx#FeedsPane
---

# Feeds

The subscriptions themselves: adding a feed, looking through them, editing and deleting them. It is the Feeds tab of Manage Feeds.

## Boundary

This domain does not own how feeds are grouped into stations, how they are imported or exported as lists, or when they are refreshed.
