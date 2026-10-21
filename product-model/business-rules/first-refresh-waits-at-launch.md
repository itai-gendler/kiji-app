---
appliesTo:
- type: capability
  id: refresh-feeds
- type: entity
  id: settings
  facts:
  - Check for new articles
references:
- kind: code
  role: implementation
  target: src/services/scheduler/feedSchedulerService.ts
---

# The first refresh after launch waits for the user or half a minute

After KiJi starts, the first scheduled pass waits until the user first clicks in the sidebar, or until 30 seconds pass, so the library opens without the whole refresh competing with it.
