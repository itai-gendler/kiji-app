---
entities:
- entity: feed
  shows:
  - Name
  - Icon
- entity: station
  shows:
  - Name
  - Emoji
  - Position
  - Feeds
- entity: article
  shows:
  - Title
  - Summary
  - Published
- entity: saved-article
  shows:
  - Title
  - Source
  - Published
- entity: settings
  shows:
  - Library views
references:
- kind: code
  role: implementation
  target: src/components/Sidebar/Sidebar.tsx
- kind: code
  role: implementation
  target: src/components/MainArea/SharedArticleList.tsx
- kind: code
  role: implementation
  target: src/components/MainArea/ArticleListItem.tsx#ArticleListItem
- kind: code
  role: implementation
  target: src/components/Sidebar/SidebarSyncIndicator.tsx
---

# Article list

The main window: the sidebar with the Library views, the stations and their feeds, and the feeds in no station, beside the list of articles for whichever view, station or feed is selected. The bottom of the sidebar says what is syncing.
