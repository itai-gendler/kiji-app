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

# An overdue refresh catches up when the computer wakes

When the computer wakes after a scheduled pass was due, KiJi runs it at once, retries feeds that are waiting after failed updates, and does the open station's feeds first. When app opens and Never run no catch-up.
