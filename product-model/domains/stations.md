---
references:
- kind: code
  role: implementation
  target: src/components/ManageFeedsWindow/StationsPane.tsx#StationsPane
- kind: code
  role: implementation
  target: src/components/Sidebar/TagManager.tsx#TagManager
---

# Stations

Named groups of feeds: creating, naming, ordering and deleting stations and choosing their feeds. It is the Stations tab of Manage Feeds and the Stations section of the sidebar.

## Boundary

This domain does not own the feeds themselves or the articles listed when a station is opened.
