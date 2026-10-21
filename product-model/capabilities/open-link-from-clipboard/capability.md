---
availability:
- place: kiji-reader
references:
- kind: code
  role: implementation
  target: src/components/MainArea/ArticleView.tsx#ArticleView
- kind: code
  role: implementation
  target: src/services/articles/postlightParserService.ts
- kind: code
  role: implementation
  target: src/services/articles/articleExtractionService.ts#extractArticleContentFromHtml
---

# Open a link from the clipboard

Read any web page as an article: an article window loads the link on the clipboard and shows its text.
