---
appliesTo:
- type: capability
  id: export-feeds
- type: entity
  id: station
  facts:
  - Name
  - Emoji
references:
- kind: code
  role: implementation
  target: src/services/feeds/opmlExportService.ts
- kind: code
  role: implementation
  target: src/services/feeds/opmlAttributes.ts
---

# An exported feed list mirrors the stations

An exported feed list holds one folder per station that has feeds, in sidebar order, then the feeds in no station; names and emoji are kept so a KiJi import restores the same stations.
