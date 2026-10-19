//! Where the app listens for local assistant connections. Shared by the app
//! and the stdio bridge (`kiji-app --mcp`), which runs without Tauri, so the
//! location is derived from environment variables, not `app_data_dir()`.
//! Unix: the socket path. Windows: the endpoint file (see `transport`).

use std::path::PathBuf;

pub const APP_IDENTIFIER: &str = "com.yomilab.kiji";
/// Overrides the socket path / pipe name (tests and side-by-side builds).
pub const ENDPOINT_OVERRIDE_ENV: &str = "KIJI_MCP_ENDPOINT";

#[cfg(unix)]
pub fn local_endpoint() -> Option<PathBuf> {
    if let Some(path) = std::env::var_os(ENDPOINT_OVERRIDE_ENV).filter(|value| !value.is_empty()) {
        return Some(PathBuf::from(path));
    }
    let home = std::env::var_os("HOME").filter(|value| !value.is_empty()).map(PathBuf::from)?;
    let data_dir = if cfg!(target_os = "macos") {
        home.join("Library").join("Application Support")
    } else {
        std::env::var_os("XDG_DATA_HOME")
            .filter(|value| !value.is_empty())
            .map(PathBuf::from)
            .unwrap_or_else(|| home.join(".local").join("share"))
    };
    Some(data_dir.join(APP_IDENTIFIER).join("mcp.sock"))
}

/// Windows: `mcp-endpoint.json` (port + per-launch key) in the user's own
/// `%APPDATA%\com.yomilab.kiji` (same folder as `kiji.db`).
#[cfg(windows)]
pub fn local_endpoint() -> Option<PathBuf> {
    if let Some(path) = std::env::var_os(ENDPOINT_OVERRIDE_ENV).filter(|value| !value.is_empty()) {
        return Some(PathBuf::from(path));
    }
    let app_data = std::env::var_os("APPDATA").filter(|value| !value.is_empty()).map(PathBuf::from)?;
    Some(app_data.join(APP_IDENTIFIER).join("mcp-endpoint.json"))
}

#[cfg(not(any(unix, windows)))]
pub fn local_endpoint() -> Option<PathBuf> {
    None
}
