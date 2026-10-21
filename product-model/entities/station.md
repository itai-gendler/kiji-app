---
domain: stations
relations:
- entity: feed
  verb: groups
  cardinality: many-to-many
references:
- kind: code
  role: implementation
  target: src/types/tag.ts
- kind: code
  role: implementation
  target: src-tauri/src/db/tags.rs
- kind: code
  role: implementation
  target: src/services/tags/tagsManager.ts
---

# Station

A named group of feeds, shown under Stations in the sidebar. A feed can be in several stations or in none.

## Information kept

- **Name** — Unique among stations, ignoring case.
- **Emoji** — An optional emoji shown beside the name.
- **Position** — Its place among the stations in the sidebar.
- **Feeds** — The feeds grouped in it, in their order.
- **Created** — When the station was created.
