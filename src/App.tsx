import { useEffect, useState } from "react";
import { MeshShell } from "@baditaflorin/mesh-common";
import { SharedWindow } from "./features/window/SharedWindow";
import { SettingsExtras } from "./features/settings/SettingsExtras";
import { appConfig } from "./shared/config";

const STORAGE = {
  room: `${appConfig.storagePrefix}:room`,
  label: `${appConfig.storagePrefix}:label`,
  fps: `${appConfig.storagePrefix}:fps`,
  width: `${appConfig.storagePrefix}:width`,
  quality: `${appConfig.storagePrefix}:quality`,
  facing: `${appConfig.storagePrefix}:facing`,
};

type Facing = "user" | "environment";

export function App() {
  const [roomId, setRoomId] = useState(() => localStorage.getItem(STORAGE.room) ?? "default");
  const [myLabel, setMyLabel] = useState(() => localStorage.getItem(STORAGE.label) ?? "");
  const [fps, setFps] = useState(() =>
    Math.max(1, Number(localStorage.getItem(STORAGE.fps) ?? "4")),
  );
  const [width, setWidth] = useState(() =>
    Math.max(160, Number(localStorage.getItem(STORAGE.width) ?? "320")),
  );
  const [quality, setQuality] = useState(() =>
    Math.max(0.1, Math.min(0.95, Number(localStorage.getItem(STORAGE.quality) ?? "0.5"))),
  );
  const [facing, setFacing] = useState<Facing>(() => {
    const v = localStorage.getItem(STORAGE.facing);
    return v === "user" || v === "environment" ? v : "environment";
  });

  useEffect(() => {
    localStorage.setItem(STORAGE.room, roomId);
  }, [roomId]);
  useEffect(() => {
    localStorage.setItem(STORAGE.label, myLabel);
  }, [myLabel]);
  useEffect(() => {
    localStorage.setItem(STORAGE.fps, String(fps));
  }, [fps]);
  useEffect(() => {
    localStorage.setItem(STORAGE.width, String(width));
  }, [width]);
  useEffect(() => {
    localStorage.setItem(STORAGE.quality, String(quality));
  }, [quality]);
  useEffect(() => {
    localStorage.setItem(STORAGE.facing, facing);
  }, [facing]);

  return (
    <MeshShell
      config={appConfig}
      roomId={roomId}
      onRoomChange={setRoomId}
      settingsExtras={
        <SettingsExtras
          myLabel={myLabel}
          onMyLabelChange={setMyLabel}
          fps={fps}
          onFpsChange={setFps}
          width={width}
          onWidthChange={setWidth}
          quality={quality}
          onQualityChange={setQuality}
          facing={facing}
          onFacingChange={setFacing}
        />
      }
    >
      <SharedWindow
        roomId={roomId}
        myLabel={myLabel || "Anonymous"}
        fps={fps}
        width={width}
        quality={quality}
        facingMode={facing}
      />
    </MeshShell>
  );
}
