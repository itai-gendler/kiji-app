---
appliesTo:
- type: capability
  id: delete-feed
- type: capability
  id: delete-station
- type: entity
  id: article
  effect: removes
references:
- kind: code
  role: implementation
  target: src-tauri/src/db/feeds.rs#delete_feeds_with_articles
- kind: code
  role: implementation
  target: src-tauri/src/db/articles.rs#reassign_article_owners
---

# Articles another feed delivers survive a feed's deletion

When a feed is deleted, its articles go only if no other followed feed delivers them; an article that another feed also delivers stays, under that feed.
