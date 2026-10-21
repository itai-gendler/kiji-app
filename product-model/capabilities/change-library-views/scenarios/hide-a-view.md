---
kind: primary
routes:
  desktop: KiJi Reader app
steps:
- text: The User turns off Show in the sidebar for a view in the Library tab
  kind: actor
  actor: user
  entities:
  - entity: settings
    effect: reads
    facts:
    - Library views
  contexts:
    desktop:
      place: kiji-reader::library
- text: The Product removes the view from Library in the sidebar and keeps its place in the order
  kind: product
  actor: user
  entities:
  - entity: settings
    effect: changes
    facts:
    - Library views
  contexts:
    desktop:
      place: kiji-reader::library
---

# Hide a Library view

## Trigger

The User never uses a view.

## Outcome

The view is no longer in the sidebar; turning it on brings it back in the same place.
