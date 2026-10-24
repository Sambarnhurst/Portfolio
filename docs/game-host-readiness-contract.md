# HEAVEN live game-host readiness contract

The public portfolio Worker (`src/index.js`) requests `https://play.projectheaven.site/api/ready` and deliberately fails closed: the game is only advertised as online when the upstream response is HTTP 200 with `ok: true`, `service` beginning with `HEAVEN`, and `ready: true`.

## Verified integration gap — 2026-10-23

The owner-supplied HEAVEN 0.10.8.43 Windows game archive exposes `GET /api/health` but does **not** expose `GET /api/ready`. Therefore, even if the Node process and tunnel become reachable, the unpatched game build will not satisfy the public portfolio's readiness contract. Do not weaken the Worker to equate liveness with multiplayer readiness.

A separate **game-only readiness hotfix** was built and tested outside this repository; it adds `GET /api/ready` to the actual game server while retaining the three reusable 0.10.8.42 asset ZIPs and existing gameplay, WebSocket, and database code. It has **not** been installed on the owner's Windows PC. This repository does not contain the game server source, so the game fix cannot be deployed from a Portfolio commit.

Expected responses from a compatible game host:

- **200**: `{"ok":true,"service":"HEAVEN GAME DEV","version":"0.10.8.43","ready":true,"runtime":{"onlinePlayers":0}}` — only after assets, initial admin setup, database and runtime tick are ready.
- **503**: same signature with `ready:false` — game process is reachable but preparing.
- **Unreachable / unexpected response / other error**: public Worker returns `{"online":false}`.

## Owner-side diagnostics (non-destructive)

From the Windows PC, after launching the local game:

```powershell
curl.exe -i http://127.0.0.1:8820/api/health
curl.exe -i http://127.0.0.1:8820/api/ready
Get-Service Cloudflared,ProjectHeavenCaddy | Select-Object Name,Status,StartType
```

- Health fails: investigate the Node server process, startup logs, port binding, and game asset import.
- Health 200 but readiness 404: old game build; install a compatible game-only update.
- Readiness 503: game reachable but setup or assets incomplete; check local admin setup and asset status.
- Readiness 200 locally but public `/api/game-health` offline: investigate existing tunnel, hostname routing, origin port, and edge response. Do not infer a tunnel outage from an external testing provider's `invalid_url` error.
- Anonymous `/dev` and `/api/admin/*` must remain protected by Cloudflare Access. Do not disable or bypass Access.

**No automatic Windows service restart, DNS change, private secret disclosure, or production deployment is authorized by this document.**

## Isolated hotfix validation

On a temporary test instance using the owner-provided archive, the hotfix passed `node --check`, two readiness predicate tests, and real HTTP requests: health 200, readiness 503 before first-admin setup, readiness 200 after setup with all three asset parts imported and 220/220 assets verified. These tests do not establish public reachability.
