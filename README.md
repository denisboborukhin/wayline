# Wayline

Browser-local flight comparison board. One row per trip option, with outbound, intermediate, connecting, and return flights on a calendar timeline using local airport clocks.

## Run

Requires Node.js 22.18+ (native TypeScript stripping).

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite. `npm test` verifies the model, import parser, timezone/date calculations and timeline. `npm run build` checks TypeScript and produces the static application in `dist/`. `npm start` previews that build locally; no scraper backend is required.

## Import flights with the browser extension

Install the unpacked [Wayline flight capture extension](extension/README.md) in Chrome or Edge:

1. Open `chrome://extensions` (Chrome) or `edge://extensions` (Edge), enable **Developer mode** and choose **Load unpacked**.
2. Select the repository's `extension` directory containing `manifest.json`.
3. On Trip.com, open your selected itinerary and expand all connecting flights, then click the extension icon.
4. Select a summary if several are available, review the preview and departure date, then choose **Copy itinerary**.
5. In Wayline, add a ticket, paste into **Flight details or extension capture** under **Import flight details**, then choose **Import details**. Review all flights and prices before saving.

The capture includes flight-summary text, a departure date and a cleaned source link. Session and tracking parameters are removed. Route, date, currency and selected-price parameters are retained; the price is not refreshed. An existing manually entered price takes precedence over an imported price. The extension uses temporary active-tab access when you invoke it, does not access cookies or browser history, makes no network requests and does not store captures. Clipboard contents remain until replaced. Full permissions and privacy details are in the [extension README](extension/README.md#permissions-and-privacy).

The automatic selector supports the observed Russian Trip.com flight-summary layout. If a summary cannot be found, select only the expanded flight details on the page before invoking the extension. It never falls back to copying the whole page. If the page cannot show the itinerary, or your browser does not support this extension, paste the flight details manually or fill the ticket fields yourself. A URL is optional for pasted details. When the text omits the departure date or year, select it in Wayline before importing.

**Read link** reads only information encoded in a pasted URL, such as route, departure date and selected price. It cannot retrieve exact flight times from the site. The old server scraper and `/api/import-flight` endpoint have been removed.

Local times are converted using an airport/IANA timezone dataset. Explicit next-day labels are read from the page; otherwise dates advance to the next chronological local day. Flight and total durations are cross-checked when present. Ambiguous daylight-saving times, unknown airports, mismatched durations and incomplete flight pairs require manual correction. Always review imported dates, UTC offsets and prices before saving. URL prices are selected fares, not refreshed quotes.

Each trip option has a compact flight timeline and one fully editable text box per day. Flight lines such as `Moscow: arrival at 07:00` start inside the same text field as your notes: add text before or after them, edit them, or delete them. **Insert flight info** appends missing flight lines from the current tickets without replacing your text or duplicating unchanged lines. Clearing a box stays cleared after reload. Existing notes from the earlier layout are preserved alongside the initial flight lines. Edited text is not automatically rewritten when a ticket changes; use Insert flight info to add the latest details.

Dates appear once in the top ruler. Flight boxes align to each endpoint's local airport date and time, so an early-morning departure stays on its departure day. Bar widths represent differences between local clocks, not actual flight duration across time zones. A left arrow marks flights whose arrival is earlier on the local calendar or clock; the bar spans both local endpoints. Hover a box for its actual timezone-aware duration and endpoint offsets. Independent tickets stack without connections between them. Notes save automatically by option and date; days containing saved text stay visible if flights are removed. Click blocks or incomplete cards to edit. Add return and intermediate tickets to the same option. Prices apply to whole tickets; currencies are totaled separately. Plans stay in localStorage for this browser and origin; clearing browser data removes them.

**Export Markdown** downloads a calendar for the weeks between each option’s first and last flight or dated note. Each monthly table runs Monday–Sunday, with a row of day numbers above the notes and flight lines. Empty days within those weeks stay visible. A separate table lists known ticket totals by option and currency and flags missing prices.

## Publishing and deployment

This repository is a local-first prototype. CI deploys the application to GitHub Pages after checks pass on the repository’s default branch. Pull requests and other branches run checks without deployment. GitHub Actions runs installation, unit tests and builds on the minimum supported Node version and Node 24. A separate browser job installs Chromium and verifies extension capture and app integration against synthetic Trip.com pages; it does not contact Trip.com. Direct dependency versions are pinned; commit the lockfile when updating them.

The whole app can run on a static host, including GitHub Pages. Flight parsing, extension capture import, flight comparison and notes need no backend, public origin setting or server-side Chromium installation. The Pages workflow reads the base path from GitHub Pages configuration, supporting project sites and root/custom-domain sites. For a manual build of a GitHub Pages project named `travel_planner`, use its project base path:

```sh
npm run build -- --base=/travel_planner/
```

To enable deployment after pushing the repository to GitHub:

1. In **Settings → Pages → Build and deployment**, set **Source** to **GitHub Actions**.
2. Push to the repository’s default branch, or run **CI** manually from the **Actions** tab with the default branch selected.
3. Wait for the unit/build and browser jobs, then the Pages build and deploy jobs. The deployed URL appears in the `github-pages` environment and deployment step.

Deployment uses GitHub’s built-in token with Pages and OIDC write permissions limited to the deploy job; no personal access token is required. In-progress deployments finish before the next deployment starts. Follow the [GitHub Pages workflow setup](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages) if repository or organization policies restrict Actions or the `github-pages` environment.

For other static hosts, publish the contents of `dist/` yourself. Install the extension separately from the source directory; it is not published in a browser store. Plans remain in the browser where they were entered; changing host or origin does not transfer existing localStorage data. The included Vite server is for local development and preview only ([Vite deployment guidance](https://vite.dev/guide/static-deploy.html)).

To run browser checks locally (Chromium is a development-only dependency):

```sh
npx playwright install chromium
npm run build
npm run test:browser
```

## Verification limits

The flight-only fixture in `src/fixtures/trip-itinerary.txt` was transcribed from the expanded Trip.com itinerary and validates the three-flight Chongqing–Shanghai Pudong–Tbilisi–Yerevan journey on December 30–31, 2026. The extension and clipboard flow are verified against synthetic pages using this fixture. Live Trip.com markup and access can vary; a future layout change may require selector or parser updates. Manual paste remains available.

Airport dataset attribution and license: [THIRD_PARTY.md](THIRD_PARTY.md).

## AI usage

Wayline was developed with substantial AI assistance, including implementation, interface design, documentation, tests and code review. The project owner directed the requirements and design decisions. Verification included automated tests, TypeScript/build checks and browser checks; known limitations are documented above.

The application does not call AI models at runtime. Flight imports use URL parsing, rule-based itinerary parsing and user-invoked browser-extension capture, without sending itinerary data to an AI service.

## License

Application code is licensed under the [MIT License](LICENSE). Airport data retains its separate MIT copyright notice in [THIRD_PARTY.md](THIRD_PARTY.md).
