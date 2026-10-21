---
appliesTo:
- type: capability
  id: refresh-feeds
- type: entity
  id: feed
  facts:
  - Posting frequency
references:
- kind: code
  role: implementation
  target: src-tauri/src/scheduler/priority.rs#compute_priority
- kind: code
  role: implementation
  target: src-tauri/src/feeds/frequency.rs#compute_frequency_from_dates
---

# Feeds that post often and are overdue refresh first

Each scheduled pass orders feeds by how often they post, how long past their usual gap they are, and whether their station was opened in the last five minutes; every failed update in a row halves a feed's priority. How often a feed posts is judged from the median gap between its articles' dates.
