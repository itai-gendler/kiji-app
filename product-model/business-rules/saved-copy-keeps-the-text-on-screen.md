---
appliesTo:
- type: capability
  id: save-article
- type: entity
  id: saved-article
  effect: creates
references:
- kind: code
  role: implementation
  target: src/components/MainArea/ArticleView.tsx#ArticleView
- kind: code
  role: implementation
  target: src/utils/articleContentSave.ts
---

# A saved article keeps the text that was on screen

Saving keeps a copy of the article's text at that moment: the reader-mode text when reader mode is on, otherwise the text the feed carries. A PDF or a page KiJi cannot show as text is saved as its link only. The copy does not change when the feed article does.
