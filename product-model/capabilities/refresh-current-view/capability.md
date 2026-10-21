---
availability:
- place: kiji-reader
references:
- kind: code
  role: implementation
  target: src/components/Sidebar/SidebarWidgets.tsx
- kind: code
  role: implementation
  target: src/contexts/FeedContext.tsx#FeedProvider
- kind: code
  role: implementation
  target: src/services/feeds/feedsManager.ts#FeedsManager
---

# Refresh the current view

Fetch the selected feed, or every feed of the selected station, now, whenever it was last fetched.
