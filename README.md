# Project Heaven — Developer Portfolio

This is the source of the public website and secured developer workspace for **https://projectheaven.site**.

Cloudflare Worker: `portfolio`  
GitHub repository: `Sambarnhurst/Portfolio`  
Live fallback (public routes only): https://portfolio.samueldbarnhurst.workers.dev

## Structure

| Path | Function |
| --- | --- |
| `/` | Public personal developer homepage |
| `/projects.html` | Public project library with HEAVEN, AI, tools, and apps |
| `/heaven.html` | Dedicated HEAVEN game overview |
| `/game/` | Placeholder portal until actual HEAVEN browser build is published |
| `/forge.html` | Certification Tracker & Code Workstation v4.0 details |
| `/ai-workstation.html` | Local Agent Studio Professional v2.0 details |
| `/community-project.html` | Legacy Community HEAVEN project archive / rebuild overview |
| `/dev` | Private developer content dashboard (requires Cloudflare Access) |
| `/api/projects` | Published project listing only |
| `/api/admin/projects` | Private project management API |
| `public/` | Files accessible to all visitors |
| `src/` | Worker route handlers, private admin UI, and starter project data |
| `database/` | Cloudflare D1 SQL migration |

The public and developer experiences are genuinely separate: the admin HTML is bundled in the Worker and is never an asset in `public/`.

## Deployment

Existing Cloudflare Git integration is configured to build the main branch with:

```sh
npx wrangler deploy
```

The existing Worker route `projectheaven.site/*` stays intact. The Worker also serves static files from `public/` via the `ASSETS` binding.

Do not switch to a Worker Custom Domain while the existing proxied DNS/route setup is working; keep the already-functional route to avoid the previous 100117 DNS conflict.

## 1. Secure the developer workspace

**The developer dashboard deliberately fails closed until Access is configured.** It does not accept a client-side password, hidden URL, or unverified identity header.

In **Cloudflare Zero Trust → Access controls → Applications**, create a **Self-hosted** application called `Project Heaven Developer`. Add both protected paths to the **same** Access application (they must share one application audience identifier):

- `projectheaven.site/dev*`
- `projectheaven.site/api/admin/*`

Create an **Allow** policy matching only your own login email, using the desired identity provider / one-time PIN verification. Do **not** protect `projectheaven.site/*`, because the public website must remain accessible to visitors. Cloudflare Access will intercept the protected paths and handle sign-in.

Copy the application's **Application Audience (AUD) tag**, and find your Zero Trust team domain (for example `example.cloudflareaccess.com`).

In **Workers & Pages → portfolio → Settings → Variables and Secrets** (or via `npx wrangler secret put KEY`), set these three secrets:

- `CF_ACCESS_TEAM_DOMAIN`: your actual `<team>.cloudflareaccess.com` hostname, without a path
- `CF_ACCESS_AUD`: the exact Access application AUD tag
- `CF_DEV_EMAIL`: the email address permitted to open the developer dashboard

The Worker validates the signed Access JWT (RS256), token issuer, audience, expiry, and exact developer email for **every request** to `/dev` and `/api/admin/*`. It also blocks private routes on the public `workers.dev` fallback hostname.

Do not commit secrets to this public repository. If any secret is absent, `/dev` responds with a setup error instead of displaying the dashboard.

## 2. Activate saving and publishing with D1

The website initially uses a built-in list verified from the user-supplied `Portfolio(1).zip` so the public pages work with no database. The HEAVEN FPS, Code Cube Forge, and AI workstation remain three packaged projects. The old Project HEAVEN Community snapshot is described publicly as a prototype awaiting a rebuild; it is not hosted as a functioning social website. Trading bot and investments folders remain unpublished. The secured developer page can display these in read-only mode. Add D1 when you're ready to create, edit, publish, and archive projects from the website.

Create the database:

```sh
npx wrangler d1 create portfolio-content
```

Copy the `database_id` from the result. Add this **sibling property** to `wrangler.jsonc` (not inside `assets`):

```json
"d1_databases": [
  {
    "binding": "DB",
    "database_name": "portfolio-content",
    "database_id": "YOUR_D1_DATABASE_UUID"
  }
]
```

Run the schema and starter-project seed:

```sh
npx wrangler d1 execute portfolio-content --remote --file=database/0001-projects.sql
```

For an **already initialized** D1 database created from the previous project inventory, apply the optional community-prototype record update instead of re-running the initial seed:

```sh
npx wrangler d1 execute portfolio-content --remote --file=database/0002-community-prototype.sql
```

Commit the new `wrangler.jsonc` binding, then deploy:

```sh
npx wrangler deploy
```

Once D1 is bound and migrated, `/dev` supports:
- New project creation
- Editing project summaries, links, labels, and categories
- Draft/private vs published visibility
- Featured project placement on the homepage
- Deletion and display ordering

**Important:** D1 stores project metadata; it is not a file-upload service. Items marked **draft** are excluded from the public API and public cards. Project notes are private to the dashboard.

## Actual inventory from Portfolio(1).zip (October 23, 2026)

The uploaded outer ZIP is not deployed as a public artifact. Its local structure is documented in [PORTFOLIO_INVENTORY.md](PORTFOLIO_INVENTORY.md). The private developer API `/api/admin/inventory` exposes the recorded file names after Cloudflare Access authentication. None of the source archives are available for public download from the website yet.

## 3. Publishing game builds and project files

`/game/` is an intentional placeholder. The existing HEAVEN game archives and external asset packs are **not** hosted here yet, and the site must not claim that the browser game is playable.

When the game is ready:
1. Prepare a browser-ready, tested HEAVEN distribution and asset manifest.
2. Host the game frontend at `/game/` and large downloadable assets in an appropriate object-storage service, such as Cloudflare R2, respecting upload and transfer limits.
3. Test runtime asset paths, server features, content loading, and multiplayer connections using the deployment URL.
4. Only then update the game page with a genuine Play action and change the project to **Live**.

## Security and maintenance

- Do not place admin HTML, unpublished project data, credentials, or game development secrets in `public/`.
- The Worker checks authorization before returning any private HTML or API data.
- All admin writes are JSON-only and require same-origin requests.
- The public project card renderer uses DOM text nodes rather than injecting untrusted HTML.
- Project URL input accepts only root-relative URLs or HTTP(S) links and disallows links to the private dashboard.
- Configure and test the Access login **before** expecting `/dev` to be usable.

## Project HEAVEN Community archive

`Portfolio/HEAVEN COMMUNITY PROJECT/PROJECT HEAVEN.zip` is a legacy browser-saved website snapshot, not the HEAVEN FPS. Do not deploy its saved `index.html` over the active portfolio homepage or assume its community endpoints exist. See `PORTFOLIO_INVENTORY.md` for the file-level audit. The public community project page is an informational overview only. A future rebuild needs new auth, persistent API and UI integration.
