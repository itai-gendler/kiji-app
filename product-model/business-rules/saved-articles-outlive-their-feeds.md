---
appliesTo:
- type: capability
  id: delete-feed
- type: capability
  id: delete-station
- type: capability
  id: clear-feeds
- type: capability
  id: clear-all-articles
- type: capability
  id: clear-old-articles
references:
- kind: code
  role: implementation
  target: src-tauri/src/db/articles.rs#delete_orphan_unsaved_articles
- kind: code
  role: implementation
  target: src-tauri/src/db/articles.rs#clean_old_articles
---

# Saved articles stay when feeds and articles go

Deleting a feed or a station with its feeds, clearing feeds, and clearing old or all articles never remove a saved article or the feed article it was saved from.
