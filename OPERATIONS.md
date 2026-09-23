# Running and maintaining the app

The `docs/` folder is the complete independent browser application. Serve it with `python3 -m http.server 8080 --directory docs` and open http://localhost:8080. A local HTTP server is required; opening the HTML file directly is unsupported.

Install development checks with `npm ci`; install browsers with `npx playwright install --with-deps`; run `npm run test:browser`. CI checks Chromium, Firefox, WebKit and a mobile viewport, including automated accessibility rules. These automated checks do not replace assistive-technology testing.

The scheduled availability workflow requests the public app and its JavaScript twice per hour. GitHub may delay scheduled runs and disable inactive repository schedules. Failed-run notifications follow the account's GitHub notification settings; this is not an uptime SLA or a paging service.

For rollback, revert the offending commit and publish the previous known-good assets. Keep the standalone deployment and `docs/` source synchronized. No login, database, uploads, or personal-data storage are needed by this app.
