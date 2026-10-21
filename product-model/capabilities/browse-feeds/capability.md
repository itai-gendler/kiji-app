---
availability:
- place: kiji-reader
- place: assistant-connection
domain: feeds
references:
- kind: code
  role: implementation
  target: src/components/ManageFeedsWindow/FeedsPane.tsx#FeedsPane
- kind: code
  role: implementation
  target: src/components/ManageFeedsWindow/manageFeedsModel.ts#filterFeeds
- kind: code
  role: implementation
  target: src-tauri/src/mcp/query.rs
---

# Browse feeds

Look through every subscription with its stations, article count and status, find feeds that can't update or are in no station, and let assistants list the shared stations and feeds.
