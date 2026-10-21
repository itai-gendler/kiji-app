---
appliesTo:
- type: entity
  id: article
  effect: removes
permits:
- actors:
  - user
references:
- kind: code
  role: implementation
  target: src/hooks/useApplicationMenuCommands.ts#useApplicationMenuCommands
---

# Only the user removes articles

Articles go only when the user deletes their feed or station, or clears feeds or articles; nothing removes them on a schedule.
