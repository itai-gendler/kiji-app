use serde::Serialize;
use std::sync::atomic::{AtomicU64, Ordering};
use tauri::{AppHandle, Emitter, Manager};

pub const MAIN_WEBVIEW_LABEL: &str = "main";

pub const TICK_WAKE_GLOBAL: &str = "__kijiSchedulerTick";
#[cfg_attr(not(target_os = "macos"), allow(dead_code))]
pub const SLEEP_WAKE_GLOBAL: &str = "__kijiSchedulerSleep";
pub const RESUME_WAKE_GLOBAL: &str = "__kijiSchedulerResume";

static WAKE_ID_COUNTER: AtomicU64 = AtomicU64::new(1);

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SchedulerWakePayload {
    pub wake_id: u64,
    pub driver_generation: u64,
    pub kind: String,
}

pub fn next_wake_id() -> u64 {
    WAKE_ID_COUNTER.fetch_add(1, Ordering::SeqCst)
}

pub fn build_wake_script(global_name: &str, payload: &SchedulerWakePayload) -> String {
    let json = serde_json::to_string(payload).unwrap_or_else(|_| {
        format!(
            r#"{{"wakeId":{},"driverGeneration":{},"kind":"{}"}}"#,
            payload.wake_id, payload.driver_generation, payload.kind
        )
    });
    format!("globalThis.{global_name}?.({json})")
}

/// Emit the same wake payload on both Tauri event and eval channels.
/// Both channels must stay alive; the renderer dedupes by wakeId.
pub fn emit_scheduler_wake_to_main_webview(
    app: &AppHandle,
    event: &str,
    global_name: &str,
    kind: &str,
    driver_generation: u64,
    log_label: &str,
) -> SchedulerWakePayload {
    let payload = SchedulerWakePayload {
        wake_id: next_wake_id(),
        driver_generation,
        kind: kind.to_string(),
    };
    let wake_script = build_wake_script(global_name, &payload);

    if let Some(main_window) = app.get_webview_window(MAIN_WEBVIEW_LABEL) {
        if let Err(error) = main_window.emit(event, &payload) {
            eprintln!("[{log_label}] Failed to emit {event} to main webview: {error}");
        }

        if let Err(error) = main_window.eval(&wake_script) {
            eprintln!("[{log_label}] Failed to wake {event} handler in main webview: {error}");
        }
        return payload;
    }

    if let Err(error) = app.emit(event, &payload) {
        eprintln!("[{log_label}] Failed to emit {event}: {error}");
    }
    payload
}

pub fn emit_scheduler_payload_to_main_webview<T: Serialize>(
    app: &AppHandle,
    event: &str,
    payload: &T,
    log_label: &str,
) {
    if let Some(main_window) = app.get_webview_window(MAIN_WEBVIEW_LABEL) {
        if let Err(error) = main_window.emit(event, payload) {
            eprintln!("[{log_label}] Failed to emit {event} payload to main webview: {error}");
        }
        return;
    }

    if let Err(error) = app.emit(event, payload) {
        eprintln!("[{log_label}] Failed to emit {event} payload: {error}");
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn wake_scripts_include_payload_and_optional_call() {
        let payload = SchedulerWakePayload {
            wake_id: 42,
            driver_generation: 7,
            kind: "tick".to_string(),
        };
        let script = build_wake_script(TICK_WAKE_GLOBAL, &payload);
        assert!(script.contains("__kijiSchedulerTick?.("));
        assert!(script.contains("\"wakeId\":42"));
        assert!(script.contains("\"driverGeneration\":7"));
        assert!(script.contains("\"kind\":\"tick\""));
    }

    #[test]
    fn wake_globals_are_distinct() {
        assert_ne!(TICK_WAKE_GLOBAL, SLEEP_WAKE_GLOBAL);
        assert_ne!(TICK_WAKE_GLOBAL, RESUME_WAKE_GLOBAL);
        assert_ne!(SLEEP_WAKE_GLOBAL, RESUME_WAKE_GLOBAL);
    }

    #[test]
    fn main_webview_label_matches_tauri_main_window() {
        assert_eq!(MAIN_WEBVIEW_LABEL, "main");
    }

    #[test]
    fn wake_ids_are_monotonic() {
        let first = next_wake_id();
        let second = next_wake_id();
        assert!(second > first);
    }
}
