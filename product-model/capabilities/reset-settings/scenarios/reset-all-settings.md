---
kind: primary
routes:
  desktop: KiJi Reader app
steps:
- text: The User presses Command-Shift-R
  kind: actor
  actor: user
  entities: []
  contexts:
    desktop:
      place: kiji-reader
- text: The Product asks to reset all settings to defaults, saying feeds and articles are kept and the app will
    reload
  kind: product
  actor: user
  entities:
  - entity: article
    effect: reads
    facts: []
  - entity: feed
    effect: reads
    facts: []
  - entity: settings
    effect: reads
    facts: []
  contexts:
    desktop:
      place: kiji-reader
- text: The User confirms
  kind: actor
  actor: user
  entities: []
  contexts:
    desktop:
      place: kiji-reader
- text: The Product puts every setting back to its default, the theme matching the system's current appearance,
    and reloads
  kind: product
  actor: user
  entities:
  - entity: settings
    effect: changes
    facts:
    - Check for new articles
    - Article cleanup
    - Saved articles folder
    - Theme
    - Interface style
    - Reader theme
    - Surface opacity
    - Interface font
    - Article fonts
    - Reading layout
    - Library views
  contexts:
    desktop:
      place: kiji-reader
---

# Reset all settings

## Trigger

Settings got into a state the User cannot untangle.

## Outcome

KiJi reloads with default settings; feeds, stations, articles and saved articles are untouched.

## Edge cases

- The folder copy of saved articles stops, since no folder is chosen any more.
