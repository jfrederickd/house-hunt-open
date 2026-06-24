# Sample data

`sample_opportunities.csv` is the import source for `npm run db:seed`.

It contains **entirely fictional** opportunities (made-up contacts, invented
street names in the fictional suburb of Cliffhaven, Rivermouth) so the app has
something to show out of the box. `db:seed` imports these, then fills in dummy
valuations, facts, flood-risk levels, offers, photos, notes, sale history,
viewings, and per-person criteria assessments so every feature has data.

The importer (`src/lib/import/csv.ts`) demonstrates the cleaning rules: it trims
whitespace, keeps duplicate contact names as separate properties, parses
`DD/MM/YYYY` dates and 12-hour times, and flags an address with no street number
(e.g. "Tui Street") instead of failing.

To re-import after editing: `npm run db:reset` (wipes + re-seeds) or `npm run db:seed`.
