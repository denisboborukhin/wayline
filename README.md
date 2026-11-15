# Wayline

Browser-local flight comparison board. One row per trip option, with outbound, intermediate, connecting, and return flights on a calendar timeline using local airport clocks.

## Run

Requires Node.js 22.18+ (native TypeScript stripping).

```sh
npm ci
npm run setup:scraper
npm run dev
```

Open the local URL printed by Vite. `npm test` verifies the model, HTML parser, timezone/date calculations and endpoint restrictions. `npm run build` checks TypeScript and produces `dist/`. `npm start` previews the build locally with the import endpoint enabled. It is not a production server.

## HTTPS imports

The import middleware checks the request Origin against the actual HTTP or HTTPS connection. Behind a TLS-terminating reverse proxy, set the public origin explicitly (scheme, hostname and optional port, with no path or trailing slash):

```sh
WAYLINE_ORIGIN=https://wayline.example npm start
```

Keep the backend bound to loopback and have the proxy preserve the public host. Forwarded headers alone do not change the allowed origin. Other origins are rejected. This configures origin checking; it does not make the preview server production-ready.

## Import flights

Create an option, add a ticket, paste a Trip.com link and choose **Read site**. The server tries HTML parsing, then renders the page in an isolated anonymous Chromium instance to extract the flight-summary block. It does not connect to your signed-in Chrome profile or retain cookies, page HTML, passenger fields, or screenshots. Returned data contains only ticket/itinerary fields and the source URL. Scraping supports the observed Russian Trip.com itinerary layout; it is not a general flight-search API.

Trip.com can block automated access, require a browser session, or expire passenger links. In that case the form keeps the departure date and selected price from the URL and explains the failure. Open the source page, expand the complete itinerary, copy **only the flight details** (airport codes, flight numbers, dates, times and durations), and paste them under **Paste flight details**. Choose **Parse flight details**, review all flights, then save. A URL is optional for pasted details. The parser reads a full departure date from the text; when the text omits the date or year, select the departure date in the paste section. You can also complete fields manually.

Local times are converted using an airport/IANA timezone dataset. Explicit next-day labels are read from the page; otherwise dates advance to the next chronological local day. Flight and total durations are cross-checked when present. Ambiguous daylight-saving times, unknown airports, mismatched durations and incomplete flight pairs require manual correction. Always review imported dates, UTC offsets and prices before saving. URL prices are selected fares, not refreshed quotes.

Each trip option has a compact flight timeline and one fully editable text box per day. Flight lines such as `Moscow: arrival at 07:00` start inside the same text field as your notes: add text before or after them, edit them, or delete them. **Insert flight info** appends missing flight lines from the current tickets without replacing your text or duplicating unchanged lines. Clearing a box stays cleared after reload. Existing notes from the earlier layout are preserved alongside the initial flight lines. Edited text is not automatically rewritten when a ticket changes; use Insert flight info to add the latest details.

Dates appear once in the top ruler. Flight boxes align to each endpoint's local airport date and time, so an early-morning departure stays on its departure day. Bar widths represent differences between local clocks, not actual flight duration across time zones. A left arrow marks flights whose arrival is earlier on the local calendar or clock; the bar spans both local endpoints. Hover a box for its actual timezone-aware duration and endpoint offsets. Independent tickets stack without connections between them. Notes save automatically by option and date; days containing saved text stay visible if flights are removed. Click blocks or incomplete cards to edit. Add return and intermediate tickets to the same option. Prices apply to whole tickets; currencies are totaled separately. Plans stay in localStorage for this browser and origin; clearing browser data removes them. Markdown export is outside this version.

## Publishing and deployment

This repository is a local-first prototype. Publishing its source on GitHub does not deploy the application. GitHub Actions runs `npm ci`, `npm test` and `npm run build` on pushes and pull requests, using the minimum supported Node version and Node 24. Direct dependency versions are pinned; commit the lockfile when updating them. CI tests parsers and endpoint checks without calling Trip.com or downloading Chromium.

A static host, including GitHub Pages, can serve `dist/` for flight comparison, manual/pasted import and day notes. It cannot run **Read site**, which needs the Node middleware and a Playwright browser. On a static host, use pasted details or manual entry when site import fails. For a GitHub Pages project named `travel_planner`, build with its project base path:

```sh
npm run build -- --base=/travel_planner/
```

Publish the contents of `dist/` through your hosting provider. No publishing or deployment workflow is enabled by this repository. Plans remain in the browser where they were entered; changing host or origin does not transfer existing localStorage data.

For a hosted scraper, integrate `importMiddleware` into a production Node server at `/api/import-flight`, install Chromium and its system dependencies, and configure the public HTTPS origin as described above. Apply deployment-specific access and resource controls before exposing browser scraping to the internet. The included Vite server is for local development and preview only ([Vite deployment guidance](https://vite.dev/guide/static-deploy.html)).

## Verification limits

The flight-only fixture in `src/fixtures/trip-itinerary.txt` was transcribed from the expanded Trip.com itinerary and validates the three-flight Chongqing–Shanghai Pudong–Tbilisi–Yerevan journey on December 30–31, 2026. Live anonymous scraping of that link did not succeed in this environment; signed-in browser visibility does not imply the anonymous scraper can read the same page. The manual parser handles the observed itinerary. Future site markup changes may require parser updates.

Airport dataset attribution and license: [THIRD_PARTY.md](THIRD_PARTY.md).

## License

Application code is licensed under the [MIT License](LICENSE). Airport data retains its separate MIT copyright notice in [THIRD_PARTY.md](THIRD_PARTY.md).
