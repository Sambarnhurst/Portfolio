# HEAVEN Cloud / Mobile Multiplayer Deployment

Status: **cloud-ready candidate built and integration tested locally; not deployed** (2026-10-24).

## Goal
- `projectheaven.site` remains public while the owner's PC is OFF.
- `play.projectheaven.site` delivers the HEAVEN browser game on phone and computer.
- Players sign in and create/join **logical multiplayer sessions** on a continuously reachable cloud-hosted authoritative server. They do not need to host processes on their own phones.
- Developer tools require a server-authorized ADMIN role; normal users cannot invoke developer-only APIs.

## Verified source build
- Based on HEAVEN 0.10.8.43 and assets 0.10.8.42.
- Cloud candidate includes Node.js game server, browser client, 220 asset files, Dockerfile, Compose staging configuration, mobile touch controls, and tests.
- Local integration test: two separate accounts registered, joined one multiplayer lobby, started a match; asset integrity verified 220/220; unprivileged request to admin world studio returned HTTP 403; cloud initial admin setup without private token returned HTTP 403.
- **No phone/browser GPU performance testing completed. No Internet-based two-device test completed.**
- Downloadable cloud candidate is produced separately. This infrastructure documentation does not publish proprietary HEAVEN game assets in this public GitHub repository.

## Deployment blockers
- Cloudflare dashboard check (2026-10-24) showed Workers Free; Cloudflare Containers requires **Workers Paid**. Do not upgrade billing or deploy a paid Container without account-holder approval.
- Cloudflare Containers has **ephemeral local disks**. HEAVEN currently uses SQLite for users, saves and sessions; production therefore requires a real persistent backing-store migration or a separate managed container/VM host with durable volume and backups. A Docker `VOLUME /data` declaration by itself does not make Cloudflare container data persistent.
- Existing `portfolio` Worker and `projectheaven.site` routes must be preserved. Avoid DNS/tunnel change until new host passes device-to-device smoke testing.

## Cutover checklist
1. Provision an authorized continuously reachable host with durable storage, automated backups, HTTPS and WSS.
2. Verify saved SQLite state after container restart/redeploy, and restore existing user data safely.
3. Configure private 32+ character `HEAVEN_ADMIN_SETUP_TOKEN`, `HEAVEN_CLOUD_MODE=1`, `HEAVEN_GAME_DATA_DIR=/data`, and `NODE_ENV=production`. Do not commit credentials.
4. Deploy matching cloud-ready HEAVEN image; initialize owner account privately using the bootstrap token.
5. Confirm /api/health, /api/assets/status (all files), account creation, lobby creation, cross-device join/start, gameplay sync, mobile touch inputs, permissions, performance, and save persistence.
6. Only then switch `play.projectheaven.site` to the cloud-backed game host; retain old route and rollback option.
7. After public validation, add scaling and per-session orchestration. A single cloud server can host multiple logical matches; starting one OS/container per match is **not required** for initial player-facing behavior.

## Automation policy
CI may lint and integration-test. Deployment gates require passing tests and authorized cloud credentials. AI can propose PRs but must not silently overwrite game assets, update production DNS, rotate credentials, or incur paid usage. Never expose administrative tooling to clients based solely on hiding UI elements.

## Documentation
[Cloudflare Containers pricing](https://developers.cloudflare.com/containers/platform/pricing/) • [Container ephemeral storage FAQ](https://developers.cloudflare.com/containers/faq/) • [Durable Objects WebSocket architecture](https://developers.cloudflare.com/durable-objects/best-practices/websockets/).
