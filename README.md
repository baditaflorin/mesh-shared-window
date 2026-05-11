# mesh-shared-window

[![Live](https://img.shields.io/badge/live-baditaflorin.github.io%2Fmesh--shared--window-8AEBD6?style=flat-square)](https://baditaflorin.github.io/mesh-shared-window/)
[![Version](https://img.shields.io/github/package-json/v/baditaflorin/mesh-shared-window?style=flat-square&color=5a6e74)](https://github.com/baditaflorin/mesh-shared-window/blob/main/package.json)
[![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](LICENSE)
[![No backend](https://img.shields.io/badge/backend-none-1a160a?style=flat-square)](docs/adr/0001-deployment-mode.md)

> Peer-to-peer mesh: 2–4 friends in different homes each point their camera at a view they like; every phone tiles all the others' feeds into one composite.

**Live:** https://baditaflorin.github.io/mesh-shared-window/

Set a shared room ID with two or three friends. Each of you points your phone (rear camera) at something quiet — a window, a candle, a garden, a fish tank. Each of you sees a tiled composite of _everyone's_ views. Ambient presence without conversation. Don't talk. Just sit by the window together.

## How it works

Same low-fps JPEG-over-Yjs-awareness pattern as [`mesh-mirror`](https://github.com/baditaflorin/mesh-mirror), but tiled — every phone shows every other phone's frame in a grid, not just the predecessor in a chain.

- ~4 fps × 320 px × 50% JPEG ≈ 6 KB/frame ≈ 24 KB/s per phone uplink.
- 4 tiles × 24 KB/s downlink ≈ 100 KB/s. Battery-friendly for hours of ambient presence.
- Crank in Settings if your friends want a sharper view.

## Privacy threat model

See [docs/privacy.md](docs/privacy.md). Every peer sees your camera. Pick a Room ID that's hard to guess if you want some privacy — there are no accounts, no invites, no friend list.

## Architecture

- **Mode A** — pure GitHub Pages.
- **WebRTC** — Yjs awareness over y-webrtc, with self-hosted signaling and TURN.

## Run it locally

```bash
git clone https://github.com/baditaflorin/mesh-shared-window.git
cd mesh-shared-window
npm install
npm run dev
```

## Self-hosted infrastructure

| Repo                                                                   | Endpoint                               | Role                      |
| ---------------------------------------------------------------------- | -------------------------------------- | ------------------------- |
| [signaling-server](https://github.com/baditaflorin/signaling-server)   | `wss://turn.0docker.com/ws`            | y-webrtc protocol fan-out |
| [turn-token-server](https://github.com/baditaflorin/turn-token-server) | `https://turn.0docker.com/credentials` | HMAC TURN creds           |
| [coturn-hetzner](https://github.com/baditaflorin/coturn-hetzner)       | `turn:turn.0docker.com:3479`           | TURN relay                |

## ADRs

- [0001 — Deployment mode](docs/adr/0001-deployment-mode.md)
- [0002 — JPEG-over-awareness for low-bandwidth ambient video](docs/adr/0002-jpeg-frames.md)
- [0003 — Grid topology with auto-sized columns](docs/adr/0003-grid.md)
- [0010 — GitHub Pages publishing](docs/adr/0010-pages-publishing.md)

## License

[MIT](LICENSE) © 2026 Florin Badita
