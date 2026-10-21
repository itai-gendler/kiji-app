---
appliesTo:
- type: capability
  id: browse-articles
- type: capability
  id: browse-saved-articles
references:
- kind: code
  role: implementation
  target: src-tauri/src/db/search.rs#create_fts_prefix_query
- kind: code
  role: implementation
  target: src-tauri/src/db/schema.rs
---

# Search matches the beginnings of words in titles, summaries and authors

Every word typed must start a word in the article's title, summary or author; the article text is not searched, and the search stays within the selected feed, station or view.
