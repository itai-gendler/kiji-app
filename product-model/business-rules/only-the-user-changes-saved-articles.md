---
appliesTo:
- type: entity
  id: saved-article
  effect: changes
permits:
- actors:
  - user
references:
- kind: code
  role: implementation
  target: src/services/saved/savedArticlesService.ts
---

# Only the user changes saved articles

A saved article keeps the text it was saved with; only opening it by the user changes it, recording when it was last read.
