type Facing = "user" | "environment";

type Props = {
  myLabel: string;
  onMyLabelChange: (next: string) => void;
  fps: number;
  onFpsChange: (next: number) => void;
  width: number;
  onWidthChange: (next: number) => void;
  quality: number;
  onQualityChange: (next: number) => void;
  facing: Facing;
  onFacingChange: (next: Facing) => void;
};

export function SettingsExtras({
  myLabel,
  onMyLabelChange,
  fps,
  onFpsChange,
  width,
  onWidthChange,
  quality,
  onQualityChange,
  facing,
  onFacingChange,
}: Props) {
  return (
    <>
      <label>
        <span>Your tile label</span>
        <input
          value={myLabel}
          onChange={(e) => onMyLabelChange(e.target.value)}
          placeholder="window over the garden"
        />
      </label>

      <label>
        <span>Camera</span>
        <select value={facing} onChange={(e) => onFacingChange(e.target.value as Facing)}>
          <option value="environment">Rear (point at your view)</option>
          <option value="user">Front (your face)</option>
        </select>
      </label>

      <label>
        <span>FPS ({fps})</span>
        <input
          type="range"
          min={1}
          max={15}
          value={fps}
          onChange={(e) => onFpsChange(Number(e.target.value))}
        />
      </label>

      <label>
        <span>Frame width ({width} px)</span>
        <input
          type="range"
          min={160}
          max={480}
          step={20}
          value={width}
          onChange={(e) => onWidthChange(Number(e.target.value))}
        />
      </label>

      <label>
        <span>JPEG quality ({(quality * 100).toFixed(0)}%)</span>
        <input
          type="range"
          min={0.1}
          max={0.95}
          step={0.05}
          value={quality}
          onChange={(e) => onQualityChange(Number(e.target.value))}
        />
      </label>

      <p className="mesh-settings-help">
        Ambient presence is the point — keep fps low (default 4) for battery. Higher fps will drain
        your phone faster and add bandwidth.
      </p>
    </>
  );
}
