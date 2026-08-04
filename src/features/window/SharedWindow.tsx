import { useEffect, useMemo, useRef, useState } from "react";
import { createRoomSync } from "../sync/yjsRoom";
import { maybeFetchTurnCredentials } from "../sync/iceConfig";
import { startFrameStream, type FrameStreamHandle } from "./frameStream";

type AwarenessState = { label?: string; frame?: string };

type Awareness = {
  clientID: number;
  setLocalStateField: (key: string, value: unknown) => void;
  getStates: () => Map<number, Record<string, unknown>>;
  on: (event: string, cb: () => void) => void;
  off: (event: string, cb: () => void) => void;
};

type Tile = { id: number; label: string; frame: string | undefined; isSelf: boolean };

type Props = {
  roomId: string;
  myLabel: string;
  fps: number;
  width: number;
  quality: number;
  facingMode: "user" | "environment";
};

export function SharedWindow({ roomId, myLabel, fps, width, quality, facingMode }: Props) {
  const [armed, setArmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tiles, setTiles] = useState<Tile[]>([]);
  const handleRef = useRef<FrameStreamHandle | null>(null);

  const mesh = useMemo(() => {
    if (!armed) return null;
    return createRoomSync(roomId);
  }, [armed, roomId]);

  useEffect(() => {
    if (!armed) return;
    void maybeFetchTurnCredentials();
  }, [armed]);

  useEffect(() => {
    return () => {
      handleRef.current?.stop();
      mesh?.provider?.destroy();
    };
  }, [mesh]);

  // Kept in a ref (not a dependency) so the frame-publish callback below
  // always sees the latest label without needing to reopen the camera when
  // the label changes — see the label-sync effect further down.
  const myLabelRef = useRef(myLabel);
  useEffect(() => {
    myLabelRef.current = myLabel;
  }, [myLabel]);

  useEffect(() => {
    if (!armed || !mesh?.provider) return undefined;
    let cancelled = false;
    const awareness = (mesh.provider as unknown as { awareness: Awareness }).awareness;
    awareness.setLocalStateField("window", { label: myLabelRef.current, frame: undefined });

    void (async () => {
      try {
        const h = await startFrameStream(fps, width, quality, facingMode, (dataUrl) => {
          if (cancelled) return;
          awareness.setLocalStateField("window", { label: myLabelRef.current, frame: dataUrl });
        });
        if (cancelled) {
          h.stop();
          return;
        }
        handleRef.current = h;
      } catch (err) {
        setError(`Camera access failed: ${(err as Error).message}`);
      }
    })();

    return () => {
      cancelled = true;
      handleRef.current?.stop();
      handleRef.current = null;
    };
    // myLabel is intentionally excluded: it must not tear down and reopen
    // the camera (see the label-sync effect below, which is what actually
    // reacts to label edits).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [armed, mesh, fps, width, quality, facingMode]);

  // Publish label edits into awareness immediately, without touching the
  // camera. Previously this lived in the effect above (keyed on `myLabel`),
  // so every keystroke in the "Your tile label" field tore down the active
  // MediaStream and called getUserMedia() again — flashing the tile to
  // "opening…" for every peer and hammering the camera hardware while
  // typing. Preserve whatever frame is already published for this peer.
  useEffect(() => {
    if (!armed || !mesh?.provider) return;
    const awareness = (mesh.provider as unknown as { awareness: Awareness }).awareness;
    const current = awareness.getStates().get(awareness.clientID) as
      | { window?: AwarenessState }
      | undefined;
    awareness.setLocalStateField("window", { label: myLabel, frame: current?.window?.frame });
  }, [armed, mesh, myLabel]);

  useEffect(() => {
    if (!mesh?.provider) return undefined;
    const awareness = (mesh.provider as unknown as { awareness: Awareness }).awareness;
    const selfId = awareness.clientID;
    const refresh = () => {
      const states = awareness.getStates();
      const arr: Tile[] = [];
      states.forEach((state, id) => {
        const w = state["window"] as Record<string, unknown> | undefined;
        if (!w || typeof w !== "object") return;
        // Awareness state is attacker-controlled: any peer who knows the
        // room ID (no auth — see docs/privacy.md) can publish arbitrary
        // JSON, e.g. `{ label: { evil: true } }`. Without these guards a
        // non-string `label` throws inside `.localeCompare()` below, and a
        // non-string `frame` gets handed straight to `<img src>` — both
        // during every peer's render, so one malformed peer freezes the
        // whole room's tile grid. Coerce to the expected shape instead of
        // trusting the wire.
        const label = typeof w.label === "string" ? w.label : "";
        const frame = typeof w.frame === "string" ? w.frame : undefined;
        arr.push({ id, label, frame, isSelf: id === selfId });
      });
      arr.sort((a, b) => a.label.localeCompare(b.label));
      setTiles(arr);
    };
    awareness.on("change", refresh);
    refresh();
    return () => {
      awareness.off("change", refresh);
    };
  }, [mesh]);

  if (!armed) {
    return (
      <div className="window-arm">
        <h1>mesh-shared-window</h1>
        <p>
          Two to four friends, different homes. Each phone aims at a view its owner likes — a
          window, a candle, a bookshelf, a garden. Every phone tiles all of your views into one
          composite. Ambient presence without conversation.
        </p>
        <p className="window-meta">
          Your tile is labelled <strong>{myLabel || "Anonymous"}</strong>. Pick a label and the
          shared room ID in Settings.
        </p>
        <button type="button" className="window-arm-button" onClick={() => setArmed(true)}>
          Open camera & join
        </button>
      </div>
    );
  }

  return (
    <div className="window-stage">
      <div className="window-hud">
        {tiles.length} tile{tiles.length === 1 ? "" : "s"} in this room
      </div>
      {error && <p className="window-error">{error}</p>}
      <div
        className="window-grid"
        style={
          {
            "--cols": gridCols(tiles.length),
          } as React.CSSProperties
        }
      >
        {tiles.map((tile) => (
          <div className={`window-tile${tile.isSelf ? " window-tile-self" : ""}`} key={tile.id}>
            {tile.frame ? (
              <img className="window-frame" src={tile.frame} alt="" />
            ) : (
              <div className="window-tile-empty">opening…</div>
            )}
            <div className="window-tile-label">
              {tile.label || "untitled"}
              {tile.isSelf && <span className="window-tile-you"> · you</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function gridCols(n: number): number {
  if (n <= 1) return 1;
  if (n <= 4) return 2;
  if (n <= 9) return 3;
  return 4;
}
