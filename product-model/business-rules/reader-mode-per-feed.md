---
appliesTo:
- type: capability
  id: enable-reader-mode
- type: capability
  id: disable-reader-mode
- type: capability
  id: read-article
references:
- kind: code
  role: implementation
  target: src/components/MainArea/ArticleView.tsx#ArticleView
---

# Reader mode is remembered per feed

Turning reader mode on or off for one article sets it for every article of that feed, now and in later sessions. Saved articles and links opened from the clipboard always show their own text and offer no reader-mode switch.
