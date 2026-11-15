# Wayline flight capture

An unpacked Manifest V3 extension for Chrome and Edge. It reads a flight summary from the Trip.com tab you already have open; no scraper server or separate browser is needed.

## Install

1. Open `chrome://extensions` in Chrome or `edge://extensions` in Edge.
2. Enable **Developer mode**.
3. Choose **Load unpacked**, then select this `extension` directory (the directory containing `manifest.json`).
4. Pin **Wayline flight capture** to the toolbar if desired.

After updating the source, click **Reload** on the extension's card. The extension is not published in a browser store.

## Use

1. Open the selected itinerary on Trip.com and expand all connecting flights. The automatic selector supports the observed Russian flight-summary layout.
2. Click the extension icon. If several summaries are available, select the one you want and review the preview. If the layout is unsupported, select only the complete flight details on the page, then click the icon again.
3. Check the departure date. Add it if the page omits its year.
4. Click **Copy itinerary**.
5. In Wayline, add or edit a ticket, paste into **Flight details or extension capture** and choose **Import details**. Review the flights and price, then save.

If clipboard access fails, copy the preview text manually and enter the departure date in Wayline. If flight details are collapsed, blocked or incomplete, expand them or use manual entry. The extension does not search for flights, bypass access restrictions or refresh fares.

## Permissions and privacy

- `activeTab` grants temporary access when you invoke the extension ([Chrome documentation](https://developer.chrome.com/docs/extensions/develop/concepts/activeTab)).
- `scripting` reads the selected text or flight-summary blocks in that tab.
- `clipboardWrite` copies the capture when you press **Copy itinerary**. The extension does not read the clipboard.

There are no persistent host permissions, background scripts, network requests, cookies API access, analytics or saved captures. The extension refuses pages outside supported Trip.com flight URLs. It never falls back to copying the whole page. Form controls and hidden elements are removed from automatically captured summaries. Text you explicitly select is previewed as selected, so select flight details only.

Only the reviewed itinerary text, departure date and a cleaned source link are copied. The link retains route, date, currency and selected-price parameters; session and tracking parameters are omitted. The copied capture stays on your system clipboard until replaced, and an imported source link is saved with its ticket in Wayline. The URL price can be stale. All parsing and timezone checks run in Wayline, without an AI service or backend.
