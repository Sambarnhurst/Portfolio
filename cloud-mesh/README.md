# HEAVEN Cloud Mesh — isolated staging service

This is the first **cloud-only room/signaling layer**, not a playable HEAVEN game server. It does not run the Node.js/SQLite authoritative simulation, load the 0.10.8.42 assets, persist worlds, or grant developer access. It can run while the owner's PC is off once separately deployed and configured.

## Safety and deployment

The service is **disabled by default**, lives in its own Worker, and has **no route** on the production \`projectheaven.site\` Worker. Changes here do not deploy or enable the public website. The production site and game gateway remain unchanged.

1. Test locally with \`npx wrangler dev --config cloud-mesh/wrangler.jsonc\` from the repo root (Wrangler resolves the entrypoint relative to this configuration).
2. For a private staging deployment, set the secret: \`npx wrangler secret put MESH_INTERNAL_BETA_KEY --config cloud-mesh/wrangler.jsonc\`. Use a cryptographically random key; **never commit it** or expose it to browser JavaScript.
3. In a separately reviewed staging deployment, set \`MESH_ENABLED\` to \`"true"\` in the service-specific configuration. Leave production routing disconnected until full auth, abuse prevention, and gameplay tests pass.
4. Deploy the staging Worker only with \`npx wrangler deploy --config cloud-mesh/wrangler.jsonc\` after reviewing account billing and the Worker bindings.

The service uses SQLite-backed Durable Objects. Room state expires after two hours and rooms permit 2–12 participants. Room IDs and tickets are cryptographically random. Ticket hashes—not tickets—are stored by the room; only the creator receives its host ticket. The host ticket **is not** a developer credential. Clients exchange WebRTC offers/answers/candidates through the Worker; gameplay packets are **not** authoritative here.

## Backend-only API

\`GET /v1/status\` returns service status, always \`gameplayReady:false\`.

The following operations require \`Authorization: Bearer <MESH_INTERNAL_BETA_KEY>\` from a **trusted backend**, not directly from a web browser:

- \`POST /v1/rooms\` body \`{"title":"Test room","maxPlayers":4}\` creates a room and returns \`roomId\` and one-time \`hostTicket\`.
- \`POST /v1/rooms/<roomId>/join\` body \`{"name":"Player"}\` returns a participant \`ticket\` and ID.
- \`DELETE /v1/rooms/<roomId>\` also requires \`X-Host-Ticket: <hostTicket>\`.

A participant connects to \`GET /v1/rooms/<roomId>/ws\` with WebSocket subprotocols \`["heaven.mesh.v1","ticket.<ticket>"]\`. The host uses \`hostTicket\`. Frames are bounded and only \`{"type":"signal","kind":"offer|answer|candidate","target":"<peerId>","payload":{...}}\` are forwarded. No arbitrary admin or game commands are accepted.

## Remaining launch requirements

- Put the actual 0.10.8.43 game client, server and validated asset manifest in deployable source/artifact storage.
- Host the game runtime on a persistent managed cloud service (for example autoscaled containers or a reserved VPS); do not use browser-player-hosting as a substitute for server-authoritative simulation.
- Implement account signup with email validation, verified session identity, rate limiting, moderation, room browsing/matchmaking, and a trusted API bridge to this broker.
- Integrate multiplayer/game-state protocol, reliable server ownership, anti-cheat, join/leave/reconnect, mobile controls and performance; separately gate owner editor/admin APIs on server-verified identity.
- Run automated API and 2-device browser tests, then stage with a test subdomain before enabling a public Play button.

**Not included:** autonomous GitHub/Cloudflare account linking, DNS changes, billing approval, browser game client changes, or automatic production deployment.

### Browser WebSocket origin restrictions
Set the staging Worker's `MESH_ALLOWED_ORIGINS` variable to a comma-separated list of **exact HTTPS origins** of the approved browser game clients (for example `https://staging.example.test`). A missing or mismatched allowlist blocks browser WebSocket upgrades even if the participant holds a ticket. Non-browser backends may omit Origin only when they send `Authorization: Bearer <MESH_INTERNAL_BETA_KEY>`. Browsers must never receive that secret. The origin check is defense-in-depth and does not replace the cryptographically random WebSocket ticket or real account authentication. Existing production routes remain unchanged.
