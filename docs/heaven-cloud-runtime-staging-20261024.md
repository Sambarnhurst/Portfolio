# HEAVEN cloud runtime staging — 2026-10-24

## Goal
Open `projectheaven.site` from phone or PC, create and join multiplayer game rooms without the owner's PC. Preserve owner-only developer tools.

## Current staging artifacts (kept in ChatGPT Library → /PORTFOLIO, NOT in this public repository)
- `HEAVEN_CLOUD_GAME_ONLY_0.10.8.43_SECURITY_READY.zip` — 26.6 MB, reuses the three permanent asset packs.
- `HEAVEN_CLOUD_COMPLETE_0.10.8.43_DOCKER_READY.zip` — 158.3 MB, contains game, all three 0.10.8.42 asset ZIPs, Dockerfile, Compose, docs, and tests.
- **Never commit unpublished game code or owner data into this public Portfolio repository.** The source game remains a separately supplied artifact.

## Actual changes to the game package
- Added strict GET /api/ready contract (200 only when 220/220 hashed assets installed, ADMIN initialized, authoritative simulation ticking; 503 otherwise).
- Added HEAVEN_CLOUD_HOSTED=1 mode that always rejects HTTP first-ADMIN bootstrap; private terminal bootstrap script initializes credentials without posting a password to the internet.
- Hardened local-only setup by checking actual loopback socket address as well as Host, preventing forged Host header bypass.
- Added Dockerfile and Compose starter for a single persistent Node/SQLite/WebSocket game runtime. 127.0.0.1:8820 is bound only locally until external security approval.
- Kept SQLite DB, saves and cached assets in durable /data volume.

## Validation
- Real Node HTTP smoke: health 200; ready 503 before ADMIN; 220/220 assets verified; ready 200 after ADMIN setup in disposable data dir.
- New security unit tests 2/2 passing; JS syntax checks passed; release ZIP CRC checks passed.
- Broad legacy npm test remains **NOT PASSING**; many earlier tests reference asset files outside the reusable packs and targeted hydrated tests retain at least one failing camera-aiming regression. Full run timed out.
- Docker build, external authentication penetration testing, mobile renderer, real multiplayer browser tests and cloud hosting **not yet validated**.

## Independent signaling broker on this branch
`cloud-mesh/` contains a disabled-by-default staging Durable Object WebSocket signaling broker. Its separate Wrangler config uses the 2026 `exports.MeshRoom` declarative SQLite format (preferred over legacy migrations). Github Actions tests and Cloudflare dry-run packaging passed. No customer-facing endpoints are enabled. It has no server-authoritative game simulation and is not yet connected to game user identities.

## Launch gates, in order
1. Reproduce and fix failing legacy tests; execute game UI smoke on real mobile + desktop browsers (touch control support remains unverified).
2. Review Node API/WebSocket authorization thoroughly; assert USER cannot invoke ADMIN editor APIs, including direct endpoint access.
3. Provision approved managed game host and persistent volume in a staging environment; do not incur fees without an approved plan.
4. Run private admin initialization; test readiness, world save and recovery across restart, and asset integrity.
5. Connect game identity to room lifecycle and matchmaking; avoid exposing shared broker backend secrets to browsers.
6. Test 2 real devices and simultaneous lobbies, reconnection, physics/terrain consistency, and load.
7. Only then plan autoscaling per-room game instances or logical isolated room allocations; a signaling Durable Object is not a game server.
8. Deploy to an approved staging hostname; preserve production `projectheaven.site`, `/dev`, `play.projectheaven.site` and DNS until go-live acceptance.

## Operational policy
Do not expose private game ZIPs or data via public GitHub. Do not change production Cloudflare routes, access controls, or turn on public multiplayer before test gates and user approval. Scheduled build cycle can continue working on safe staging code/tests and report evidence, but cannot promise uninterrupted background execution or automatic production deployment.
