---
type: agent
actors:
- assistant
references:
- kind: code
  role: implementation
  target: src-tauri/src/mcp/protocol.rs
- kind: code
  role: implementation
  target: src-tauri/src/mcp/transport.rs
- kind: code
  role: implementation
  target: src-tauri/src/mcp/http.rs
- kind: code
  role: implementation
  target: src-tauri/src/mcp/bridge.rs
---

# Assistant connection

How an assistant app on the same computer reaches the user's library while KiJi is open and library access is on: through the local bridge KiJi installs for it, or, when the user allows it, through a web address on this computer that needs the access key. It reads stations, feeds, articles and saved articles, and makes changes only when the user allows them.
