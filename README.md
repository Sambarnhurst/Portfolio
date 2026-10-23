# HEAVEN official website

Cloudflare Worker `portfolio` automatically deploys this static site using `npx wrangler deploy`.

- Cloudflare configuration: `wrangler.jsonc`
- Homepage: `public/index.html`
- Production branch: `main`
- Custom domain: `projectheaven.site` (attach under Cloudflare > Workers & Pages > portfolio > Settings/Domains)

Changes committed to main will trigger a new Cloudflare build once the GitHub integration is authorized.
