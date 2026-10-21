---
kind: alternate
routes:
  desktop: KiJi Reader app
steps:
- text: KiJi starts with a folder chosen, or five seconds pass after the User chose a different folder
  kind: condition
  unattended: true
  entities:
  - entity: settings
    effect: reads
    facts:
    - Saved articles folder
  - entity: user
    effect: reads
    facts: []
  contexts:
    desktop:
      place: kiji-reader::article-list
- text: The Product writes a file for every saved article missing from the folder and adds them to the index, never
    overwriting or deleting a file already there
  kind: product
  entities:
  - entity: saved-article
    effect: reads
    facts:
    - Title
    - Link
    - Content
  contexts:
    desktop:
      place: kiji-reader::article-list
---

# Catch up the folder

## Trigger

The User turns on the folder copy for the first time, or KiJi starts.

## Outcome

Every saved article has a file in the folder, imported ones included; files the User edited or added stay as they are.
