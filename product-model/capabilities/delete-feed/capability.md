---
availability:
- place: kiji-reader
domain: feeds
references:
- kind: code
  role: implementation
  target: src/components/ManageFeedsWindow/FeedsPane.tsx#DeleteFeedsDialog
- kind: code
  role: implementation
  target: src-tauri/src/db/feeds.rs#delete_feeds_with_articles
- kind: code
  role: implementation
  target: src-tauri/src/db/articles.rs#delete_orphan_unsaved_articles
---

# Delete a feed

Stop following one or more feeds and remove their articles; saved copies stay in Saved.
