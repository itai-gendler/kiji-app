---
appliesTo:
- type: entity
  id: article
- type: capability
  id: browse-articles
references:
- kind: code
  role: implementation
  target: src-tauri/src/feeds/article_hash.rs#generate_article_hash
- kind: code
  role: implementation
  target: src-tauri/src/db/articles.rs
---

# An article is one story, whichever feeds deliver it

KiJi tells articles apart by their link, ignoring the part after # and tracking parameters such as utm_source, fbclid or ref; without a link, by the feed's item id, then the title, then the first hundred words. The same story from two feeds is therefore one article: reading it in one feed marks it read in the other, a station lists it once, and a refresh never brings back as new an article KiJi already keeps.

## Rationale

Sites post the same story under several feeds and add tracking parameters to their links; without this a reader would see and count each story more than once.
