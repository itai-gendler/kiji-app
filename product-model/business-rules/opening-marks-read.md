---
appliesTo:
- type: capability
  id: read-article
- type: entity
  id: article
  effect: changes
  to: Read
references:
- kind: code
  role: implementation
  target: src/components/MainArea/ArticleView.tsx#ArticleView
---

# Opening an article marks it read, except from Saved

Opening an unread article from a feed, a station or a Library view marks it read and records when it was opened. Opening a saved article shows its saved copy and leaves the feed article's read state as it was. Assistants reading an article never mark it read; only Mark read does.
