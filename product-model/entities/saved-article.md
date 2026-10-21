---
domain: library
references:
- kind: code
  role: implementation
  target: src/types/article.ts
- kind: code
  role: implementation
  target: src-tauri/src/db/saved.rs
- kind: code
  role: implementation
  target: src/services/saved/savedArticlesService.ts
---

# Saved article

A copy of an article the user keeps in Saved. It holds its own text, so it stays when its feed or the original article is gone.

## Information kept

- **Title** — The headline, as it was when saved.
- **Link** — The address of the story on its site.
- **Author** — Who wrote it.
- **Published** — When it was published.
- **Saved on** — When it was saved or imported.
- **Content** — The saved text: the reader-mode text, the feed's text, or only the link.
- **Source** — The feed it came from, or the site for a link saved on its own.
- **Last read** — When it was last opened.
