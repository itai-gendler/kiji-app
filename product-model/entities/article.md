---
references:
- kind: code
  role: implementation
  target: src/types/article.ts
- kind: code
  role: implementation
  target: src-tauri/src/db/schema.rs
- kind: code
  role: implementation
  target: src-tauri/src/feeds/article_hash.rs#generate_article_hash
---

# Article

One story KiJi fetched from the feeds the user follows. The same story delivered by two feeds is one article.

## Information kept

- **Title** — The headline.
- **Summary** — The short description the feed gives.
- **Content** — The text the feed carries for the story.
- **Link** — The address of the story on its site.
- **Author** — Who wrote it, when the feed says.
- **Published** — When it was published, or when it was fetched if the feed gives no date.
- **Fetched** — When KiJi first stored it.
- **Starred** — Whether it is starred.
- **Saved** — Whether a saved copy of it exists.
- **Last read** — When it was last opened.

## States

### Unread

Not opened yet, or marked unread again.

### Read

Opened, or marked read.
