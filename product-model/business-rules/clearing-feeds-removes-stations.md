---
appliesTo:
- type: capability
  id: clear-feeds
- type: entity
  id: station
  effect: removes
references:
- kind: code
  role: implementation
  target: src/hooks/useApplicationMenuCommands.ts#useApplicationMenuCommands
---

# Clearing feeds also deletes every station

Clear Feeds removes every subscription, its articles and then every station, leaving an empty sidebar; Saved is kept.
