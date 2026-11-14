import { PITCH_LENGTH, PITCH_WIDTH } from "../../engine";
import type { PitchFrame, PitchRendererFactory } from "./classic-pitch-renderer";

const MARGIN = 12;
const PLAYER_RADIUS = 9;

type Layout = { scale: number; left: number; top: number };

const layoutFor = (width: number, height: number): Layout => {
  const scale = Math.min((width - 2 * MARGIN) / PITCH_LENGTH, (height - 2 * MARGIN) / PITCH_WIDTH);
  return {
    scale,
    left: (width - PITCH_LENGTH * scale) / 2,
    top: (height - PITCH_WIDTH * scale) / 2,
  };
};

const drawMarkings = (ctx: CanvasRenderingContext2D, { scale, left, top }: Layout) => {
  const x = (metres: number) => left + metres * scale;
  const y = (metres: number) => top + metres * scale;
  ctx.fillStyle = "#2e7d32";
  ctx.fillRect(x(0), y(0), PITCH_LENGTH * scale, PITCH_WIDTH * scale);
  ctx.strokeStyle = "rgba(255,255,255,0.85)";
  ctx.lineWidth = 2;
  ctx.strokeRect(x(0), y(0), PITCH_LENGTH * scale, PITCH_WIDTH * scale);
  ctx.beginPath();
  ctx.moveTo(x(PITCH_LENGTH / 2), y(0));
  ctx.lineTo(x(PITCH_LENGTH / 2), y(PITCH_WIDTH));
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x(PITCH_LENGTH / 2), y(PITCH_WIDTH / 2), 9.15 * scale, 0, Math.PI * 2);
  ctx.stroke();
  for (const [boxX, depth, boxWidth] of [
    [0, 16.5, 40.3],
    [PITCH_LENGTH - 16.5, 16.5, 40.3],
    [0, 5.5, 18.32],
    [PITCH_LENGTH - 5.5, 5.5, 18.32],
  ] as const) {
    ctx.strokeRect(x(boxX), y((PITCH_WIDTH - boxWidth) / 2), depth * scale, boxWidth * scale);
  }
};

/** Squad number of a snapshot slot: home 0 to 10 and away 11 to 21 both read 1 to 11. */
const shirtNumber = (slot: number): number => (slot % 11) + 1;

/** The default renderer: the pitch, both teams, the ball and the score, on one canvas 2D element. */
export const createCanvasPitchRenderer: PitchRendererFactory = (host, options) => {
  const canvas = document.createElement("canvas");
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  canvas.style.display = "block";
  host.appendChild(canvas);
  let width = 0;
  let height = 0;
  let last: PitchFrame | null = null;

  const draw = (frame: PitchFrame) => {
    const ctx = canvas.getContext("2d");
    if (!ctx || width === 0) return;
    const layout = layoutFor(width, height);
    ctx.clearRect(0, 0, width, height);
    drawMarkings(ctx, layout);
    ctx.font = "bold 10px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    frame.snapshot.players.forEach((player, slot) => {
      const px = layout.left + player.x * layout.scale;
      const py = layout.top + player.y * layout.scale;
      ctx.fillStyle = slot < 11 ? options.homeColour : options.awayColour;
      ctx.beginPath();
      ctx.arc(px, py, PLAYER_RADIUS, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = "#fff";
      ctx.fillText(String(shirtNumber(slot)), px, py);
    });
    const { ball } = frame.snapshot;
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(
      layout.left + ball.x * layout.scale,
      layout.top + ball.y * layout.scale,
      5,
      0,
      Math.PI * 2,
    );
    ctx.fill();
    ctx.strokeStyle = "#000";
    ctx.stroke();
    ctx.font = "bold 14px sans-serif";
    ctx.fillStyle = "#fff";
    ctx.fillText(`${frame.score.home} – ${frame.score.away}`, width / 2, MARGIN / 2 + 4);
  };

  return {
    resize: (w, h) => {
      const ratio = window.devicePixelRatio || 1;
      width = w;
      height = h;
      canvas.width = Math.round(w * ratio);
      canvas.height = Math.round(h * ratio);
      canvas.getContext("2d")?.setTransform(ratio, 0, 0, ratio, 0, 0);
      if (last) draw(last);
    },
    render: (frame) => {
      last = frame;
      draw(frame);
    },
    dispose: () => canvas.remove(),
  };
};
