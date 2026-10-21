---
kind: person
acts: external
relations:
- entity: feed
  verb: follows
  cardinality: one-to-many
- entity: station
  verb: owns
  cardinality: one-to-many
- entity: saved-article
  verb: keeps
  cardinality: one-to-many
- entity: assistant
  verb: connects
  cardinality: one-to-many
references:
- kind: code
  role: implementation
  target: src/App.tsx
---

# User

The person reading in KiJi on their own computer. There is no sign-in: whoever uses the app owns its feeds, stations and saved articles.
