# HEAVEN official website

Cloudflare Worker `portfolio` deploys this static site from the `main` branch using `npx wrangler deploy`.

- Static homepage: `public/index.html`
- Wrangler configuration: `wrangler.jsonc`
- Fallback URL: https://portfolio.samueldbarnhurst.workers.dev
- Intended primary domain: https://projectheaven.site

## DNS and routing

The Worker uses the **route** `projectheaven.site/*` in the Cloudflare zone `projectheaven.site`, rather than a Worker **Custom Domain**. This avoids the Cloudflare 100117 error caused by existing A or CNAME records. The existing apex hostname DNS record must be **Proxied** (orange cloud) and the Cloudflare zone active for the route to receive requests. No DNS record is automatically deleted by the deployment. Any contradictory redirect rules may still have to be removed.

`workers_dev: true` and `preview_urls: true` explicitly preserve the Worker URL for diagnostics.

GitHub commits to `main` should trigger a new Cloudflare build while the GitHub integration remains connected.
