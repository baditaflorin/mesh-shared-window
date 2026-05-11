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

type Tile = { id: number; label: string; frame: string | undefined };

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

  useEffect(() => {
    if (!armed || !mesh?.provider) return undefined;
    let cancelled = false;
    const awareness = (mesh.provider as unknown as { awareness: Awareness }).awareness;
    awareness.setLocalStateField("window", { label: myLabel, frame: undefined });

    void (async () => {
      try {
        const h = await startFrameStream(fps, width, quality, facingMode, (dataUrl) => {
          if (cancelled) return;
          awareness.setLocalStateField("window", { label: myLabel, frame: dataUrl });
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
  }, [armed, mesh, myLabel, fps, width, quality, facingMode]);

  useEffect(() => {
    if (!mesh?.provider) return undefined;
    const awareness = (mesh.provider as unknown as { awareness: Awareness }).awareness;
    const refresh = () => {
      const states = awareness.getStates();
      const arr: Tile[] = [];
      states.forEach((state, id) => {
        const w = state["window"] as AwarenessState | undefined;
        if (!w) return;
        arr.push({ id, label: w.label ?? "", frame: w.frame });
      });
      arr.sort((a, b) => (a.label || "").localeCompare(b.label || ""));
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
          <div className="window-tile" key={tile.id}>
            {tile.frame ? (
              <img className="window-frame" src={tile.frame} alt="" />
            ) : (
              <div className="window-tile-empty">opening…</div>
            )}
            <div className="window-tile-label">{tile.label || "untitled"}</div>
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
