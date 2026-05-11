/**
 * Camera → low-fps JPEG dataURL via offscreen canvas.
 * Same pattern as mesh-mirror: publish via Yjs awareness.
 */

export type FrameStreamHandle = {
  stop: () => void;
};

export async function startFrameStream(
  fps: number,
  width: number,
  jpegQuality: number,
  facingMode: "user" | "environment",
  onFrame: (dataUrl: string) => void,
): Promise<FrameStreamHandle> {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode, width: { ideal: width } },
    audio: false,
  });
  const video = document.createElement("video");
  video.srcObject = stream;
  video.muted = true;
  video.playsInline = true;
  await video.play();

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D canvas unavailable");

  let lastSent = 0;
  let stopped = false;

  const tick = () => {
    if (stopped) return;
    const now = performance.now();
    if (now - lastSent >= 1000 / fps && video.videoWidth > 0) {
      lastSent = now;
      const vw = video.videoWidth;
      const vh = video.videoHeight;
      const tw = Math.min(width, vw);
      const th = Math.round((vh / vw) * tw);
      if (canvas.width !== tw) canvas.width = tw;
      if (canvas.height !== th) canvas.height = th;
      ctx.drawImage(video, 0, 0, tw, th);
      onFrame(canvas.toDataURL("image/jpeg", jpegQuality));
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);

  return {
    stop: () => {
      stopped = true;
      stream.getTracks().forEach((t) => t.stop());
    },
  };
}
