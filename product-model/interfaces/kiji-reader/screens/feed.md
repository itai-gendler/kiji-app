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
  collects:
  - Name
  - Feed address
  - Icon
- entity: station
  shows:
  - Name
references:
- kind: code
  role: implementation
  target: src/components/ManageFeedsWindow/FeedsPane.tsx#FeedEditorDialog
---

# Edit Feed

One feed being edited: its name, emoji or site icon, feed address and stations, with its status.
