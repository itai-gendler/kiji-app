---
type: desktop-app
actors:
- user
references:
- kind: code
  role: implementation
  target: src/App.tsx
- kind: code
  role: implementation
  target: src-tauri/src/lib.rs
- kind: code
  role: implementation
  target: src-tauri/src/shell/menu.rs
- kind: code
  role: implementation
  target: src/services/ui/appMenuModel.ts#buildWindowsAppMenuTree
---

# KiJi Reader app

The desktop app for macOS, Windows and Linux: the main window with its sidebar, article list and article view, article windows, the Manage Feeds window and the Settings window. Commands also sit in the menu bar under File, View and Subscriptions.
