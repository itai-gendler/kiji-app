---
domain: feeds
relations:
- entity: article
  verb: delivers
  cardinality: many-to-many
references:
- kind: code
  role: implementation
  target: src-tauri/src/db/schema.rs
- kind: code
  role: implementation
  target: src/services/feeds/feedsManager.ts#FeedsManager
- kind: code
  role: implementation
  target: src/components/ManageFeedsWindow/manageFeedsModel.ts#describeFeedStatus
- kind: code
  role: implementation
  target: src-tauri/src/feeds/frequency.rs#compute_frequency_from_dates
---

# Feed

One subscription: an RSS, Atom or JSON Feed address KiJi fetches for new articles.

## Information kept

- **Name** — The title shown for the feed, taken from the feed when it is added and editable afterwards.
- **Feed address** — The link KiJi fetches; no two feeds share one.
- **Icon** — The site's icon, or an emoji the user chose in its place.
- **Reader mode** — Whether its articles open in reader mode, as last chosen on one of its articles.
- **Added** — When the feed was added.
- **Last updated** — When KiJi last fetched it successfully.
- **Failed updates** — How many updates in a row have failed, and when the latest one failed.
- **Article counts** — How many of its articles KiJi keeps, and how many of those are unread.
- **Posting frequency** — How often it publishes, judged from the gaps between its articles' dates.
- **Position** — Its place among the feeds that are in no station.

## States

### Not updated yet

Added but never fetched successfully.

### Updated

The latest update succeeded.

### Can't update

The latest update failed; KiJi shows how many times in a row and waits before trying again on its own.
