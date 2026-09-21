#[cfg(target_os = "macos")]
use crate::scheduler::webview_delivery::{
    emit_scheduler_wake_to_main_webview, RESUME_WAKE_GLOBAL, SLEEP_WAKE_GLOBAL,
};
use tauri::{AppHandle, Manager};

#[cfg_attr(not(target_os = "macos"), allow(dead_code))]
pub const SCHEDULER_SYSTEM_SLEEP_EVENT: &str = "scheduler:system-sleep";
pub const SCHEDULER_SYSTEM_RESUME_EVENT: &str = "scheduler:system-resume";

pub fn start_system_power_watch(app: &AppHandle) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        start_macos_power_watch(app)?;
    }
    #[cfg(not(target_os = "macos"))]
    {
        let _ = app;
    }

    Ok(())
}

#[cfg(target_os = "macos")]
fn start_macos_power_watch(app: &AppHandle) -> Result<(), String> {
    use std::ptr::NonNull;

    use block2::RcBlock;
    use objc2_app_kit::{
        NSWorkspace, NSWorkspaceDidWakeNotification, NSWorkspaceWillSleepNotification,
    };
    use objc2_foundation::{NSNotification, NSOperationQueue};

    let workspace = NSWorkspace::sharedWorkspace();
    let center = workspace.notificationCenter();

    let sleep_app = app.clone();
    let sleep_block = RcBlock::new(move |_notification: NonNull<NSNotification>| {
        emit_scheduler_power_event(
            &sleep_app,
            SCHEDULER_SYSTEM_SLEEP_EVENT,
            SLEEP_WAKE_GLOBAL,
            "sleep",
        );
    });

    let wake_app = app.clone();
    let wake_block = RcBlock::new(move |_notification: NonNull<NSNotification>| {
        emit_scheduler_power_event(
            &wake_app,
            SCHEDULER_SYSTEM_RESUME_EVENT,
            RESUME_WAKE_GLOBAL,
            "resume",
        );
    });

    unsafe {
        center.addObserverForName_object_queue_usingBlock(
            Some(NSWorkspaceWillSleepNotification),
            None,
            Some(&NSOperationQueue::mainQueue()),
            &sleep_block,
        );
        center.addObserverForName_object_queue_usingBlock(
            Some(NSWorkspaceDidWakeNotification),
            None,
            Some(&NSOperationQueue::mainQueue()),
            &wake_block,
        );
    }

    // Observers live for the process lifetime.
    std::mem::forget((sleep_block, wake_block));

    Ok(())
}

#[cfg(target_os = "macos")]
fn emit_scheduler_power_event(app: &AppHandle, event: &str, global_name: &str, kind: &str) {
    let driver_generation = app
        .try_state::<std::sync::Arc<crate::scheduler::FeedSchedulerState>>()
        .map(|state| state.current_driver_generation())
        .unwrap_or(0);
    emit_scheduler_wake_to_main_webview(app, event, global_name, kind, driver_generation, "Power");
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::scheduler::webview_delivery::{RESUME_WAKE_GLOBAL, SLEEP_WAKE_GLOBAL};

    #[test]
    fn power_events_use_main_webview_wake_globals() {
        assert_eq!(SCHEDULER_SYSTEM_SLEEP_EVENT, "scheduler:system-sleep");
        assert_eq!(SCHEDULER_SYSTEM_RESUME_EVENT, "scheduler:system-resume");
        assert_eq!(SLEEP_WAKE_GLOBAL, "__kijiSchedulerSleep");
        assert_eq!(RESUME_WAKE_GLOBAL, "__kijiSchedulerResume");
    }
}
