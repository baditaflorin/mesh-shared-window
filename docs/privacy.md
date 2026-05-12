# Privacy threat model — mesh-shared-window

## What other peers in the same room can see

- Your camera, as a JPEG ~4 times per second.
- Your tile label (you choose it).

That's the entire feature — sharing what your camera sees is the point. Pick a _quiet_ view (window, candle, garden) and only share with people who picked the same Room ID.

## Room IDs are not access control

There is no account system, no invite list, no allowlist. Anyone who guesses or learns your Room ID can join. Pick a Room ID that's a bit hard to guess if privacy matters (e.g. `garden-view-2026-friends-only`, not `garden`).

## What other peers CANNOT see

- Audio (we never call `getUserMedia({ audio: true })`).
- Your location.
- Anything else from your device.

## What the signaling server sees

The room name and encrypted SDP offers/answers. No frame data.

## What the TURN server sees

Encrypted DTLS bytes if peers can't connect directly. It cannot decrypt frames.

## What stays local

- Your camera permission.
- The choice of front vs rear camera.
- Your tile label, fps, width, quality settings.

## Permission asked

`navigator.mediaDevices.getUserMedia({ video: true })`. The browser shows the "camera in use" indicator while the app is open.
