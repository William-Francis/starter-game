import { CONFIG } from '../shared/constants';
import { ClientPlayer, ClientFood, ClientPowerup, GameStatePayload, Vec2 } from './types';

const POWERUP_STYLE: Record<string, { color: string; label: string }> = {
  speed:        { color: '#facc15', label: '⚡' },
  'double-tail': { color: '#a855f7', label: '×2' },
  reverse:      { color: '#22d3ee', label: '↩' },
};

export interface RendererState {
  localPlayerId: string | null;
  latestState: GameStatePayload | null;
  prevState: GameStatePayload | null;
  lastStateTime: number;
  stunFlash: Map<string, number>; // playerId -> stun start time
  camera: Vec2;           // smoothed camera position
  lastFrameTime: number;  // for delta-time camera lerp
}

const GRID_SIZE = 100;
const BG_COLOR = '#1a1a2e';
const ARENA_BORDER = '#4a4a8a';
const GRID_COLOR = 'rgba(255,255,255,0.04)';
const FOOD_COLOR = '#22c55e';

export function createRendererState(): RendererState {
  return {
    localPlayerId: null,
    latestState: null,
    prevState: null,
    lastStateTime: Date.now(),
    stunFlash: new Map(),
    camera: { x: CONFIG.ARENA_WIDTH / 2, y: CONFIG.ARENA_HEIGHT / 2 },
    lastFrameTime: Date.now(),
  };
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpVec(a: Vec2, b: Vec2, t: number): Vec2 {
  return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) };
}

function findById(players: ClientPlayer[], id: string): ClientPlayer | undefined {
  return players.find((p) => p.id === id);
}

export function startRenderLoop(
  canvas: HTMLCanvasElement,
  state: RendererState
): void {
  const ctx = canvas.getContext('2d')!;
  const BROADCAST_INTERVAL = 1000 / CONFIG.BROADCAST_RATE;

  function resize(): void {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resize);
  resize();

  function frame(): void {
    requestAnimationFrame(frame);
    if (!state.latestState) return;

    const now = Date.now();
    const rawT = (now - state.lastStateTime) / BROADCAST_INTERVAL;
    const t = Math.min(rawT, 1);

    // ── Build interpolated player positions ──────────────────────────────
    const interp = new Map<string, Vec2>();
    for (const curr of state.latestState.players) {
      if (state.prevState) {
        const prev = findById(state.prevState.players, curr.id);
        if (prev) {
          interp.set(curr.id, lerpVec({ x: prev.x, y: prev.y }, { x: curr.x, y: curr.y }, t));
          continue;
        }
      }
      interp.set(curr.id, { x: curr.x, y: curr.y });
    }

    // ── Smooth camera ─────────────────────────────────────────────────────
    const local = state.localPlayerId
      ? state.latestState.players.find((p) => p.id === state.localPlayerId)
      : null;

    const target = local
      ? interp.get(local.id) ?? { x: local.x, y: local.y }
      : { x: CONFIG.ARENA_WIDTH / 2, y: CONFIG.ARENA_HEIGHT / 2 };

    // Exponential decay lerp — framerate-independent, CAMERA_SPEED controls stiffness
    const frameNow = Date.now();
    const dt = Math.min((frameNow - state.lastFrameTime) / 1000, 0.1); // cap at 100ms
    state.lastFrameTime = frameNow;
    const CAMERA_SPEED = 8; // higher = snappier, lower = floatier
    const alpha = 1 - Math.exp(-CAMERA_SPEED * dt);
    state.camera.x += (target.x - state.camera.x) * alpha;
    state.camera.y += (target.y - state.camera.y) * alpha;

    const offsetX = canvas.width / 2 - state.camera.x;
    const offsetY = canvas.height / 2 - state.camera.y;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // ── Dark background outside arena ────────────────────────────────────
    ctx.fillStyle = '#0d0d1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(offsetX, offsetY);

    // ── Arena fill ───────────────────────────────────────────────────────
    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, CONFIG.ARENA_WIDTH, CONFIG.ARENA_HEIGHT);

    // ── Grid ─────────────────────────────────────────────────────────────
    ctx.strokeStyle = GRID_COLOR;
    ctx.lineWidth = 1;
    for (let x = 0; x <= CONFIG.ARENA_WIDTH; x += GRID_SIZE) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, CONFIG.ARENA_HEIGHT);
      ctx.stroke();
    }
    for (let y = 0; y <= CONFIG.ARENA_HEIGHT; y += GRID_SIZE) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(CONFIG.ARENA_WIDTH, y);
      ctx.stroke();
    }

    // ── Arena border ─────────────────────────────────────────────────────
    ctx.strokeStyle = ARENA_BORDER;
    ctx.lineWidth = 4;
    ctx.strokeRect(0, 0, CONFIG.ARENA_WIDTH, CONFIG.ARENA_HEIGHT);

    // ── Food ─────────────────────────────────────────────────────────────
    // Subtle pulse: radius oscillates ±1.5px
    const foodPulse = Math.sin(now * 0.003) * 1.5;
    ctx.shadowColor = FOOD_COLOR;
    ctx.shadowBlur = 10;
    ctx.fillStyle = FOOD_COLOR;
    for (const food of state.latestState.foods) {
      ctx.beginPath();
      ctx.arc(food.x, food.y, CONFIG.FOOD_RADIUS + foodPulse, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;
    // ── Powerups ─────────────────────────────────────────────────────────────
    const puPulse = 1 + 0.15 * Math.sin(now * 0.004);
    for (const pu of state.latestState.powerups) {
      const style = POWERUP_STYLE[pu.type];
      if (!style) continue;
      const r = CONFIG.POWERUP_RADIUS * puPulse;

      ctx.save();
      ctx.shadowColor = style.color;
      ctx.shadowBlur = 18;

      // Outer glow ring
      ctx.strokeStyle = style.color;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(pu.x, pu.y, r + 5, 0, Math.PI * 2);
      ctx.stroke();

      // Filled circle
      ctx.fillStyle = style.color;
      ctx.globalAlpha = 0.85;
      ctx.beginPath();
      ctx.arc(pu.x, pu.y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;

      // Label
      ctx.font = `bold ${r * 1.1}px "Segoe UI", system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#000';
      ctx.fillText(style.label, pu.x, pu.y + 1);
      ctx.restore();
 }
    // ── Players ──────────────────────────────────────────────────────────
    for (const player of state.latestState.players) {
      const pos = interp.get(player.id) ?? { x: player.x, y: player.y };
      const isLocal = player.id === state.localPlayerId;
      const isStunned = player.stunned;

      ctx.save();
      if (isStunned) ctx.globalAlpha = 0.45;

      // Tail segments (draw before head) — fade toward tip
      const tailLen = player.tail.length;
      for (let ti = 0; ti < tailLen; ti++) {
        const seg = player.tail[ti];
        // ti=0 is closest to head (brightest), ti=tailLen-1 is tip (most faded)
        const fadeFrac = tailLen > 1 ? ti / (tailLen - 1) : 0;
        const baseAlpha = isStunned ? 0.25 : lerp(0.75, 0.25, fadeFrac);
        ctx.globalAlpha = baseAlpha;
        ctx.beginPath();
        ctx.arc(seg.x, seg.y, CONFIG.TAIL_SEGMENT_RADIUS * lerp(1, 0.6, fadeFrac), 0, Math.PI * 2);
        ctx.fillStyle = player.color;
        ctx.fill();
      }

      // Reset alpha for head
      ctx.globalAlpha = isStunned ? 0.45 : 1;

      // Head shadow / glow
      ctx.shadowColor = player.color;
      ctx.shadowBlur = isLocal ? 18 : 8;

      // Head circle
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, CONFIG.PLAYER_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = player.color;
      ctx.fill();

      // Border ring for local player
      if (isLocal) {
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2.5;
        ctx.stroke();
      }

      // Pulsing warning ring while stunned
      if (isStunned) {
        const pulse = 0.4 + 0.6 * Math.abs(Math.sin(now * 0.006));
        ctx.globalAlpha = pulse;
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, CONFIG.PLAYER_RADIUS + 6, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.shadowBlur = 0;

      // ── Player name ──────────────────────────────────────────────────
      ctx.font = 'bold 13px "Segoe UI", system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';

      const labelY = pos.y - CONFIG.PLAYER_RADIUS - 6;

      // Text shadow
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillText(player.name, pos.x + 1, labelY + 1);

      ctx.fillStyle = '#ffffff';
      ctx.fillText(player.name, pos.x, labelY);

      // ── Stun countdown ───────────────────────────────────────────────
      if (isStunned && player.stunnedUntil) {
        const remaining = Math.max(0, (player.stunnedUntil - Date.now()) / 1000).toFixed(1);
        ctx.font = 'bold 15px "Segoe UI", system-ui, sans-serif';
        ctx.fillStyle = '#facc15';
        ctx.fillText(`${remaining}s`, pos.x, labelY - 16);
      }

      ctx.restore();
    }

    ctx.restore();

    // ── HUD (fixed screen-space) ─────────────────────────────────────────
    drawHUD(ctx, canvas, state.latestState, state.localPlayerId);
  drawActiveEffects(ctx, canvas, state.latestState, state.localPlayerId);
  }

  requestAnimationFrame(frame);
}

function drawHUD(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  state: GameStatePayload,
  localId: string | null
): void {
  const sorted = [...state.players].sort((a, b) => b.score - a.score);

  // Scoreboard
  const sbX = canvas.width - 200;
  const sbY = 16;
  const lineH = 22;
  const padding = 12;
  const sbH = sorted.length * lineH + padding * 2 + 24;

  ctx.save();
  ctx.globalAlpha = 0.82;
  ctx.fillStyle = '#0d0d1a';
  roundRect(ctx, sbX - padding, sbY - padding, 184 + padding, sbH, 10);
  ctx.fill();
  ctx.globalAlpha = 1;

  ctx.font = 'bold 12px "Segoe UI", system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#aaa';
  ctx.fillText('SCOREBOARD', sbX, sbY + 10);

  ctx.font = '13px "Segoe UI", system-ui, sans-serif';
  sorted.forEach((p, i) => {
    const y = sbY + 30 + i * lineH;
    const isLocal = p.id === localId;

    // Color dot
    ctx.beginPath();
    ctx.arc(sbX + 6, y - 4, 5, 0, Math.PI * 2);
    ctx.fillStyle = p.color;
    ctx.fill();

    ctx.fillStyle = isLocal ? '#facc15' : '#ddd';
    const name = p.name.length > 11 ? p.name.slice(0, 10) + '…' : p.name;
    ctx.fillText(`${i + 1}. ${name}`, sbX + 16, y);
    ctx.textAlign = 'right';
    ctx.fillText(`${p.score}`, sbX + 168, y);
    ctx.textAlign = 'left';
  });

  ctx.restore();

  // Player count
  ctx.save();
  ctx.globalAlpha = 0.75;
  ctx.fillStyle = '#0d0d1a';
  roundRect(ctx, 12, 12, 140, 34, 8);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.font = '13px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = '#ccc';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(`Players: ${state.players.length}`, 24, 29);
  ctx.restore();

  // Minimap
  drawMinimap(ctx, canvas, state, localId);
}

function drawMinimap(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  state: GameStatePayload,
  localId: string | null
): void {
  const MAP_W = 160;
  const MAP_H = 160;
  const MARGIN = 16;
  const mx = canvas.width - MAP_W - MARGIN;
  const my = canvas.height - MAP_H - MARGIN;
  const scaleX = MAP_W / CONFIG.ARENA_WIDTH;
  const scaleY = MAP_H / CONFIG.ARENA_HEIGHT;

  ctx.save();

  // Background
  ctx.globalAlpha = 0.7;
  ctx.fillStyle = '#0d0d1a';
  roundRect(ctx, mx, my, MAP_W, MAP_H, 8);
  ctx.fill();
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.globalAlpha = 1;

  // Food dots
  ctx.fillStyle = '#22c55e';
  for (const food of state.foods) {
    ctx.beginPath();
    ctx.arc(mx + food.x * scaleX, my + food.y * scaleY, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Powerup dots on minimap
  for (const pu of state.powerups) {
    const style = POWERUP_STYLE[pu.type];
    if (!style) continue;
    ctx.beginPath();
    ctx.arc(mx + pu.x * scaleX, my + pu.y * scaleY, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = style.color;
    ctx.fill();
  }

  // Player dots
  for (const p of state.players) {
    const isLocal = p.id === localId;
    ctx.beginPath();
    ctx.arc(mx + p.x * scaleX, my + p.y * scaleY, isLocal ? 4 : 3, 0, Math.PI * 2);
    ctx.fillStyle = p.color;
    ctx.fill();
    if (isLocal) {
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }

  // Label
  ctx.font = 'bold 9px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = '#666';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'bottom';
  ctx.fillText('MAP', mx + 4, my - 3);

  ctx.restore();
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

function drawActiveEffects(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  state: GameStatePayload,
  localId: string | null
): void {
  if (!localId) return;
  const player = state.players.find((p) => p.id === localId);
  if (!player) return;

  const now = Date.now();
  const effects: { label: string; color: string; remaining: number }[] = [];

  if (player.speedBoostUntil > now) {
    effects.push({
      label: '⚡ Speed Boost',
      color: '#facc15',
      remaining: (player.speedBoostUntil - now) / 1000,
    });
  }
  if (player.reversedUntil > now) {
    effects.push({
      label: '↩ Reversed',
      color: '#22d3ee',
      remaining: (player.reversedUntil - now) / 1000,
    });
  }

  if (effects.length === 0) return;

  const PILL_W = 150;
  const PILL_H = 30;
  const GAP = 8;
  const startX = canvas.width / 2 - PILL_W / 2;
  const startY = canvas.height - 16 - effects.length * (PILL_H + GAP);

  ctx.save();
  effects.forEach((fx, i) => {
    const y = startY + i * (PILL_H + GAP);

    // Background
    ctx.globalAlpha = 0.82;
    ctx.fillStyle = '#0d0d1a';
    roundRect(ctx, startX, y, PILL_W, PILL_H, PILL_H / 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // Colored left cap / accent
    ctx.fillStyle = fx.color;
    roundRect(ctx, startX, y, 6, PILL_H, 3);
    ctx.fill();

    // Label
    ctx.font = 'bold 12px "Segoe UI", system-ui, sans-serif';
    ctx.fillStyle = fx.color;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(fx.label, startX + 14, y + PILL_H / 2);

    // Timer
    ctx.font = '12px "Segoe UI", system-ui, sans-serif';
    ctx.fillStyle = '#eee';
    ctx.textAlign = 'right';
    ctx.fillText(`${fx.remaining.toFixed(1)}s`, startX + PILL_W - 10, y + PILL_H / 2);
  });
  ctx.restore();
}
