---
availability:
- place: kiji-reader
references:
- kind: code
  role: implementation
  target: src/services/scheduler/feedSchedulerService.ts
- kind: code
  role: implementation
  target: src-tauri/src/scheduler/mod.rs
- kind: code
  role: implementation
  target: src-tauri/src/scheduler/run_plan.rs#create_scheduler_run_plan
- kind: code
  role: implementation
  target: src-tauri/src/scheduler/priority.rs#compute_priority
- kind: code
  role: implementation
  target: src-tauri/src/scheduler/refresh_policy.rs#get_feed_failure_backoff_ms
- kind: code
  role: implementation
  target: src-tauri/src/scheduler/native_cycle.rs
---

# Refresh feeds in the background

Check every feed for new articles on the schedule chosen in Settings, most promising feeds first, while KiJi is open.
