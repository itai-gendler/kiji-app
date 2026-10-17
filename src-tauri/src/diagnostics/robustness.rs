//! Session counters for robustness invariants (cancel-vs-failure, skipped
//! feeds, charset decoding, store transactions). Fixed atomics only: the set
//! can never grow, so long sessions cannot accumulate state here. The renderer
//! reads a snapshot through `diagnostics_robustness_counters` and logs it with
//! its own counters (`Robustness counters` in the app log).

use serde::Serialize;
use std::sync::atomic::{AtomicU64, Ordering};

#[derive(Clone, Copy, Debug)]
pub enum RobustnessCounter {
    /// Fetch errors with `FEED_REQUEST_CANCELLED` that were not recorded as failures.
    FetchCancelledNotRecorded,
    /// Planned feeds missing from the DB when their chunk ran (deleted mid-cycle).
    ChunkFeedsSkippedMissing,
    /// Backoff computations that hit the overflow-safe cap path.
    BackoffSaturated,
    /// Parsed items with no link and no guid (hash falls back to title/content).
    ItemsWithoutIdentity,
    /// Feed bodies decoded from a declared non-UTF-8 charset.
    BodyDecodedNonUtf8,
    /// Feed bodies that needed lossy UTF-8 replacement.
    BodyDecodedLossy,
    /// Per-feed store transactions rolled back after an error.
    StoreTransactionRollbacks,
    /// Saved-article import rows skipped because the article already exists.
    SavedImportSkippedExisting,
}

const COUNTER_COUNT: usize = 8;

static COUNTERS: [AtomicU64; COUNTER_COUNT] = [
    AtomicU64::new(0),
    AtomicU64::new(0),
    AtomicU64::new(0),
    AtomicU64::new(0),
    AtomicU64::new(0),
    AtomicU64::new(0),
    AtomicU64::new(0),
    AtomicU64::new(0),
];

impl RobustnessCounter {
    fn index(self) -> usize {
        self as usize
    }
}

pub fn record(counter: RobustnessCounter) {
    record_many(counter, 1);
}

pub fn record_many(counter: RobustnessCounter, amount: u64) {
    if amount == 0 {
        return;
    }
    COUNTERS[counter.index()].fetch_add(amount, Ordering::Relaxed);
}

fn read(counter: RobustnessCounter) -> u64 {
    COUNTERS[counter.index()].load(Ordering::Relaxed)
}

#[derive(Debug, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct RobustnessCountersSnapshot {
    pub fetch_cancelled_not_recorded: u64,
    pub chunk_feeds_skipped_missing: u64,
    pub backoff_saturated: u64,
    pub items_without_identity: u64,
    pub body_decoded_non_utf8: u64,
    pub body_decoded_lossy: u64,
    pub store_transaction_rollbacks: u64,
    pub saved_import_skipped_existing: u64,
}

pub fn snapshot() -> RobustnessCountersSnapshot {
    RobustnessCountersSnapshot {
        fetch_cancelled_not_recorded: read(RobustnessCounter::FetchCancelledNotRecorded),
        chunk_feeds_skipped_missing: read(RobustnessCounter::ChunkFeedsSkippedMissing),
        backoff_saturated: read(RobustnessCounter::BackoffSaturated),
        items_without_identity: read(RobustnessCounter::ItemsWithoutIdentity),
        body_decoded_non_utf8: read(RobustnessCounter::BodyDecodedNonUtf8),
        body_decoded_lossy: read(RobustnessCounter::BodyDecodedLossy),
        store_transaction_rollbacks: read(RobustnessCounter::StoreTransactionRollbacks),
        saved_import_skipped_existing: read(RobustnessCounter::SavedImportSkippedExisting),
    }
}

#[tauri::command]
pub fn diagnostics_robustness_counters() -> RobustnessCountersSnapshot {
    snapshot()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn record_increments_only_the_named_counter() {
        let before = snapshot();
        record(RobustnessCounter::ChunkFeedsSkippedMissing);
        record_many(RobustnessCounter::ItemsWithoutIdentity, 3);
        record_many(RobustnessCounter::BodyDecodedLossy, 0);
        let after = snapshot();

        assert_eq!(after.chunk_feeds_skipped_missing, before.chunk_feeds_skipped_missing + 1);
        assert_eq!(after.items_without_identity, before.items_without_identity + 3);
        assert_eq!(after.body_decoded_lossy, before.body_decoded_lossy);
    }
}
