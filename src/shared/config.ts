export const appConfig = {
  appName: "mesh-shared-window",
  storagePrefix: "mesh-shared-window",
  description:
    "Peer-to-peer mesh: 2-4 friends in different homes each point their camera at a view they like; every phone tiles all the others' feeds into one composite.",
  accentHex: "#5fb0ff",
  version: __APP_VERSION__,
  commit: __GIT_COMMIT__,
  repositoryUrl: "https://github.com/baditaflorin/mesh-shared-window",
  pagesUrl: "https://baditaflorin.github.io/mesh-shared-window/",
  signalingUrl:
    (import.meta.env.VITE_WEBRTC_SIGNALING as string | undefined) ?? "wss://turn.0docker.com/ws",
  turnTokenUrl:
    (import.meta.env.VITE_TURN_TOKEN_URL as string | undefined) ??
    "https://turn.0docker.com/credentials",
  paypalUrl: "https://www.paypal.com/paypalme/florinbadita",
} as const;
