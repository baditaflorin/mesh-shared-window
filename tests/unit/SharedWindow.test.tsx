import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
import { SharedWindow } from "../../src/features/window/SharedWindow";

/**
 * Regression coverage for a bug found in the 2026-08 TRL re-audit:
 * `awareness.getStates()` values come straight from other peers on the
 * network. Any peer who knows the room ID (there is no auth — see
 * docs/privacy.md) can publish arbitrary JSON there. Before the fix,
 * `SharedWindow`'s tile-refresh logic trusted `label`/`frame` to already be
 * strings; a peer publishing `{ window: { label: { toString: null } } }`
 * made `.localeCompare()` throw inside the awareness "change" handler,
 * which breaks the tile list for every peer in the room (the crash happens
 * while processing the *shared* state, not just for the malformed peer).
 *
 * `y-webrtc` and the camera are mocked out so the test can drive a fake
 * "remote peer" deterministically and synchronously.
 */

type Listener = () => void;

class FakeAwareness {
  clientID: number;
  states = new Map<number, Record<string, unknown>>();
  private listeners = new Set<Listener>();

  constructor(clientID: number) {
    this.clientID = clientID;
    this.states.set(clientID, {});
  }

  setLocalStateField(key: string, value: unknown) {
    const cur = this.states.get(this.clientID) ?? {};
    this.states.set(this.clientID, { ...cur, [key]: value });
    this.emit();
  }

  getStates() {
    return this.states;
  }

  on(event: string, cb: Listener) {
    if (event === "change") this.listeners.add(cb);
  }

  off(event: string, cb: Listener) {
    if (event === "change") this.listeners.delete(cb);
  }

  emit() {
    this.listeners.forEach((l) => l());
  }

  /** Simulate a remote peer publishing a (possibly malformed) awareness state. */
  setRemote(id: number, state: Record<string, unknown>) {
    this.states.set(id, state);
    this.emit();
  }
}

let latestAwareness: FakeAwareness | null = null;

vi.mock("y-webrtc", () => {
  return {
    WebrtcProvider: class {
      awareness: FakeAwareness;
      constructor() {
        this.awareness = new FakeAwareness(1);
        latestAwareness = this.awareness;
      }
      destroy() {}
    },
  };
});

const startFrameStreamMock = vi.fn(async () => ({ stop: vi.fn() }));

vi.mock("../../src/features/window/frameStream", () => ({
  startFrameStream: (...args: unknown[]) =>
    startFrameStreamMock(...(args as Parameters<typeof startFrameStreamMock>)),
}));

vi.mock("../../src/features/sync/iceConfig", () => ({
  maybeFetchTurnCredentials: vi.fn(async () => undefined),
  loadSignalingUrl: () => "ws://localhost:1/never-connects",
  loadIceServers: () => [],
}));

describe("SharedWindow — adversarial awareness state", () => {
  beforeEach(() => {
    latestAwareness = null;
    startFrameStreamMock.mockClear();
  });

  it("does not crash the tile list when a peer publishes a non-string label/frame", async () => {
    const { container } = render(
      <SharedWindow
        roomId="room-1"
        myLabel="Me"
        fps={4}
        width={320}
        quality={0.5}
        facingMode="environment"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /open camera & join/i }));

    await waitFor(() => expect(latestAwareness).not.toBeNull());
    const awareness = latestAwareness!;

    // A well-behaved peer first, to prove the happy path still renders.
    act(() => {
      awareness.setRemote(2, { window: { label: "Bob", frame: "data:image/jpeg;base64,AAA" } });
    });
    expect(await screen.findByText("Bob")).toBeInTheDocument();

    // A malformed/adversarial peer: label is an object, frame is a number.
    // This must not throw inside the awareness "change" handler.
    expect(() => {
      act(() => {
        awareness.setRemote(3, { window: { label: { evil: true }, frame: 12345 } });
      });
    }).not.toThrow();

    // The room must still render — including the legitimate peers — instead
    // of the tile list silently freezing because `refresh()` threw before
    // calling `setTiles`.
    expect(screen.getByText("Bob")).toBeInTheDocument();
    expect(screen.getByText(/3 tiles/)).toBeInTheDocument();

    // The malformed tile renders with a safe fallback label, not "[object
    // Object]", and does not attempt to use the non-string frame as an <img> src.
    expect(screen.getByText("untitled")).toBeInTheDocument();
    const images = Array.from(container.querySelectorAll("img"));
    expect(images.every((img) => img.src.startsWith("data:image/") || img.src === "")).toBe(true);
  });

  it("does not reopen the camera when only the label changes", async () => {
    const { rerender } = render(
      <SharedWindow
        roomId="room-1"
        myLabel="Me"
        fps={4}
        width={320}
        quality={0.5}
        facingMode="environment"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /open camera & join/i }));
    await waitFor(() => expect(startFrameStreamMock).toHaveBeenCalledTimes(1));

    rerender(
      <SharedWindow
        roomId="room-1"
        myLabel="Me, edited"
        fps={4}
        width={320}
        quality={0.5}
        facingMode="environment"
      />,
    );

    // Give any (buggy) effect a tick to fire before asserting it didn't.
    await act(async () => {
      await Promise.resolve();
    });
    expect(startFrameStreamMock).toHaveBeenCalledTimes(1);

    // But the label change must still reach this peer's own awareness state.
    await waitFor(() => {
      const mine = latestAwareness!.getStates().get(1) as { window?: { label?: string } };
      expect(mine.window?.label).toBe("Me, edited");
    });
  });
});
