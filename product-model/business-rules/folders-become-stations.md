---
appliesTo:
- type: capability
  id: import-feeds
- type: entity
  id: station
  effect: creates
references:
- kind: code
  role: implementation
  target: src/services/feeds/opmlStationResolution.ts#deriveOpmlDefaultStationName
- kind: code
  role: implementation
  target: src/services/feeds/opmlImportService.ts#parseOpmlEntries
- kind: code
  role: implementation
  target: src/services/feeds/applyOpmlImportEntries.ts#applyOpmlImportEntries
---

# Imported folders become stations

Each top-level folder of an imported feed list becomes a station of its name, or of the station name KiJi itself wrote into the file; feeds in nested folders join their top-level folder's station. A list made only of feeds becomes one station named after the file, the last part of its link, or its title unless that title is generic. Feeds already followed join the stations the list puts them in and take its emoji, and the imported stations come first, in the file's order.
