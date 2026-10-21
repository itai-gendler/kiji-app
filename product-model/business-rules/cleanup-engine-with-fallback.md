---
appliesTo:
- type: capability
  id: open-link-from-clipboard
- type: capability
  id: import-saved-articles
- type: entity
  id: settings
  facts:
  - Article cleanup
references:
- kind: code
  role: implementation
  target: src/services/articles/articleExtractionService.ts#extractArticleContentFromHtml
- kind: code
  role: implementation
  target: src/services/articles/postlightParserService.ts
---

# Pages loaded from a link use the chosen cleanup engine, then the other

A page opened from the clipboard or imported from a list of links is cleaned up by the engine chosen under Article cleanup, Defuddle unless changed. If that engine fails or finds no text, the other engine tries once before KiJi gives up on the page.
