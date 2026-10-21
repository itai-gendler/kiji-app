---
id: kiji
summary: A local desktop RSS reader that groups feeds into stations, opens pages in reader mode and keeps saved
  articles, optionally as Markdown files in a folder.
category: news-reader
tags:
- rss
- feed-reader
- desktop
authors:
- name: Yomi Lab
  url: https://github.com/yomilab
license: GPL-3.0-or-later
languages:
- en
limitations:
- Feeds, articles, saved articles and settings are kept on this computer; there is no account and no sync service.
- Feed lists come in and go out as OPML files; saved articles come in from a saved-articles export (.zip) or a list
  of links (.csv).
- Automatic refresh runs only while KiJi is open.
- The folder copy of saved articles is written by KiJi only; changes made to those files are never read back.
- Assistants read only what the user shares, change articles only when the user allows it, and never delete anything.
references:
- kind: doc
  role: intent
  target: README.md
- kind: doc
  role: context
  target: CHANGELOG.md
- kind: code
  role: implementation
  target: src/App.tsx
- kind: code
  role: implementation
  target: src-tauri/src/db/schema.rs
---

# KiJi

KiJi (記事, "article") is a desktop RSS reader that keeps everything on the user's computer. People follow RSS, Atom and JSON feeds, group them into stations, read articles in the app or in reader mode, and save the ones worth keeping. Saved articles can be mirrored as Markdown files in a folder, feed lists move in and out as OPML, and AI apps on the same computer can be allowed to read the library.

## Intent

**記事 · A local, modern RSS reader.**

- **Stations.** Tag feeds into groups
- **Reader mode.** Defuddle + Readability — two engines to parse raw page HTML into article text.
- **Markdown sync.** Sync articles to local folder as markdown.

Privacy: local storage, OPML import/export for portable subscriptions, and saved articles sync to your local machine.
