---
appliesTo:
- type: capability
  id: refresh-feeds
- type: capability
  id: browse-articles
- type: entity
  id: feed
  facts:
  - Failed updates
references:
- kind: code
  role: implementation
  target: src-tauri/src/scheduler/refresh_policy.rs#get_feed_failure_backoff_ms
- kind: code
  role: implementation
  target: src-tauri/src/scheduler/run_plan.rs#create_scheduler_run_plan
---

# A feed that fails waits before automatic retries

After a failed update, scheduled refresh leaves a feed alone for five minutes after the first failure, doubling with each further failure up to an hour; for feeds that post five or more times a day the wait is at most 10 minutes, and for feeds that post at least daily at most 40 minutes. Opening the feed or its station respects the wait; Refresh current view and the catch-up after the computer wakes do not.
