---
entities:
- entity: article
  shows:
  - Title
  - Author
  - Published
  - Content
  - Link
  - Saved
- entity: feed
  shows:
  - Name
  - Reader mode
- entity: saved-article
  shows:
  - Title
  - Author
  - Published
  - Content
  - Source
references:
- kind: code
  role: implementation
  target: src/components/MainArea/ArticleView.tsx#ArticleView
- kind: code
  role: implementation
  target: src/components/ArticleWindow/ArticleWindow.tsx#ArticleWindow
---

# Article view

One article being read, in the main window or in its own window: its title, source, author, publication date and reading time, and its text or the reader-mode text, with the actions for reader mode, saving and sharing.
