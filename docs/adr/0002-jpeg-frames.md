---
status: accepted
date: 2026-05-11
---

# 0002 — JPEG-over-awareness for low-bandwidth ambient video

## Context

Two-to-four phones in different homes, watching each other's "windows" for an hour or two. Real-time video tracks (RTCPeerConnection.addTrack) would give crisp video but drain phones. Ambient presence doesn't need crisp.

## Decision

Same approach as `mesh-mirror`: each phone draws its camera into an offscreen canvas at the chosen fps, encodes as JPEG, publishes via Yjs awareness. Every other phone reads and renders.

Defaults tuned for ambient use:

- **4 fps** (vs 7 for mesh-mirror) — calmer, less battery.
- **320 px wide** — still recognizable.
- **50% JPEG quality** — ~6 KB per frame.
- **Rear camera default** — pointing at "a view" is the use case.

## Consequences

- ~24 KB/s per phone uplink. Phones can run this for hours.
- The pixelated `image-rendering: pixelated` CSS gives a Polaroid-y quality to the frames; we don't fight it.
- No audio — explicitly out of scope. This is a _view_-sharing app, not a video call.

## Alternatives considered

- **Raw RTCPeerConnection video tracks.** Crisp but battery-heavy and adds complexity. Could be a v2 toggle.
- **Periodic still photos (1 fps).** Closer to a "slow webcam" aesthetic; users can already pick this via the fps slider.
