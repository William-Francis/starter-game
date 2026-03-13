import { CONFIG } from '../shared/constants';
import { ClientPlayer, ClientFood, ClientPowerup, GameStatePayload, Vec2 } from './types';

const POWERUP_STYLE: Record<string, { color: string; label: string }> = {
  speed:              { color: '#facc15', label: '⚡' },
  'double-tail':      { color: '#a855f7', label: '×2' },
  reverse:            { color: '#22d3ee', label: '↩' },
  magnet:             { color: '#ec4899', label: '🧲' },
  'coin-flip':        { color: '#fde68a', label: '🪙' },
  helmet:             { color: '#9ca3af', label: '🛡️' },
  omni:               { color: '#ffffff', label: '★' },
  'jack-in-the-box':  { color: '#f97316', label: '🎁' },
  gun:                { color: '#ef4444', label: '🔫' },
  minigun:            { color: '#f97316', label: '🔫🔫' },
  icbm:               { color: '#22d3ee', label: '🚀' },
  hook:               { color: '#f59e0b', label: '🪝' },
};

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number; // remaining life in ms
  maxLife: number;
  size: number;
  color: string;
  type: 'confetti' | 'star' | 'smoke';
}

export interface ScamPopup {
  startTime: number;
  disguisedAs: string;
  protected?: boolean; // true if player was protected by helmet
}

export interface CoinFlipPopup {
  startTime: number;
  heads: boolean;
  points: number;
}

export interface OuroborosPopup {
  startTime: number;
}

export interface OmniPopup {
  startTime: number;
}

export interface SpeechBubble {
  playerId: string;
  message: string;
  startTime: number;
}

export interface RendererState {
  localPlayerId: string | null;
  latestState: GameStatePayload | null;
  prevState: GameStatePayload | null;
  lastStateTime: number;
  stunFlash: Map<string, number>; // playerId -> stun start time
  camera: Vec2;           // smoothed camera position
  lastFrameTime: number;  // for delta-time camera lerp
  scamPopup: ScamPopup | null; // active scam popup
  coinFlipPopup: CoinFlipPopup | null; // active coin-flip result popup
  ouroborosPopup: OuroborosPopup | null; // active ouroboros self-kill popup
  omniPopup: OmniPopup | null; // active omni powerup popup
  speechBubbles: Map<string, SpeechBubble>; // playerId -> active speech bubble
  lastSpeechTime: Map<string, number>; // playerId -> last speech time
  particles: Particle[];
  prevFoodCount: number;
  prevPlayerHits: Map<string, number>; // playerId -> hit count
  prevPlayerPos: Map<string, Vec2>; // playerId -> last position
  scoreboardCollapsed: boolean;
  minimapCollapsed: boolean;
}

const GRID_SIZE = 100;
const BG_COLOR = '#1a1a2e';
const ARENA_BORDER = '#4a4a8a';
const GRID_COLOR = 'rgba(255,255,255,0.04)';
const FOOD_COLOR = '#22c55e';

const SILLY_MESSAGES = [
  'hey loser',
  'gimme ur tail',
  'nice helmet lol',
  'get out my way',
  'ur bad',
  'I\'m fasting',
  'salty?',
  'YEET',
  'lmao',
  'ok nerd',
  'imagine',
  'skill issue',
  'cope',
  'rent free',
  'ratio\'d',
  'sus',
  'mid',
  'no cap',
  'bussin',
  'eat my tail',
  'ur mom',
  'no u',
  'stop',
  'why',
  'you suck',
  'rekt',
  'owned',
  'haha',
  'git gud',
  'eat dirt',
  'l + ratio',
  'touch grass',
  'maidenless',
  'down bad',
  'simping',
  'no bitches?',
  'caught in 4k',
  'average player',
  'ratio incoming',
  'stay mad',
  'malding',
  'get rolled',
  'EZ',
  'EASY WIN',
  'skill gap',
  'do better',
  'DELETED',
  'L take',
  'cringe',
  'yikes',
];

type HeadAvatarCacheEntry =
  | { status: 'loading' }
  | { status: 'ready'; image: HTMLImageElement }
  | { status: 'missing' };

const AVATAR_ASSET_BASE_URL = new URL('.', window.location.href).toString();
const headAvatarCache = new Map<string, HeadAvatarCacheEntry>();
const availableAvatarNames = new Set<string>();
let avatarListStatus: 'idle' | 'loading' | 'ready' | 'failed' = 'idle';

function normalizeAvatarKey(name: string): string {
  const trimmed = name.trim().toLowerCase();
  return trimmed.endsWith('.png') ? trimmed.slice(0, -4) : trimmed;
}

async function fetchAvailableAvatarNames(): Promise<void> {
  try {
    const url = new URL('api/avatar-list', AVATAR_ASSET_BASE_URL).toString();
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Avatar list request failed: ${response.status}`);

    const payload: unknown = await response.json();
    const names = Array.isArray(payload)
      ? payload.filter((name): name is string => typeof name === 'string')
      : [];

    availableAvatarNames.clear();
    for (const name of names) {
      const key = normalizeAvatarKey(name);
      if (key) availableAvatarNames.add(key);
    }

    avatarListStatus = 'ready';
  } catch {
    avatarListStatus = 'failed';
  }
}

function ensureAvatarListLoaded(): void {
  if (avatarListStatus !== 'idle') return;
  avatarListStatus = 'loading';
  void fetchAvailableAvatarNames();
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const resolvedSrc = new URL(src, AVATAR_ASSET_BASE_URL).toString();
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Failed to load avatar: ${resolvedSrc}`));
    image.src = resolvedSrc;
  });
}

async function loadHeadAvatar(playerName: string): Promise<HTMLImageElement | null> {
  const key = normalizeAvatarKey(playerName);
  if (!key) return null;

  try {
    return await loadImage(`${encodeURIComponent(key)}.png`);
  } catch {
    // Single-request path by design (.png only)
  }

  return null;
}

function getHeadAvatar(playerName: string): HTMLImageElement | null {
  const key = normalizeAvatarKey(playerName);
  if (!key) return null;

  ensureAvatarListLoaded();
  if (avatarListStatus !== 'ready') return null;
  if (!availableAvatarNames.has(key)) {
    headAvatarCache.set(key, { status: 'missing' });
    return null;
  }

  const cached = headAvatarCache.get(key);
  if (cached?.status === 'ready') return cached.image;
  if (cached?.status === 'loading' || cached?.status === 'missing') return null;

  headAvatarCache.set(key, { status: 'loading' });
  void loadHeadAvatar(playerName).then((image) => {
    if (image) {
      headAvatarCache.set(key, { status: 'ready', image });
      return;
    }
    headAvatarCache.set(key, { status: 'missing' });
  });

  return null;
}

function drawAvatarHead(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  radius: number,
  fallbackColor: string
): void {
  const diameter = radius * 2;
  const sourceWidth = image.naturalWidth || image.width;
  const sourceHeight = image.naturalHeight || image.height;

  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.clip();

  ctx.fillStyle = fallbackColor;
  ctx.fillRect(x - radius, y - radius, diameter, diameter);

  if (sourceWidth > 0 && sourceHeight > 0) {
    const scale = Math.max(diameter / sourceWidth, diameter / sourceHeight);
    const drawWidth = sourceWidth * scale;
    const drawHeight = sourceHeight * scale;
    ctx.drawImage(image, x - drawWidth / 2, y - drawHeight / 2, drawWidth, drawHeight);
  }

  ctx.restore();
}

export function createRendererState(): RendererState {
  return {
    localPlayerId: null,
    latestState: null,
    prevState: null,
    lastStateTime: Date.now(),
    stunFlash: new Map(),
    camera: { x: CONFIG.ARENA_WIDTH / 2, y: CONFIG.ARENA_HEIGHT / 2 },
    lastFrameTime: Date.now(),
    scamPopup: null,
    coinFlipPopup: null,
    ouroborosPopup: null,
    omniPopup: null,
    speechBubbles: new Map(),
    lastSpeechTime: new Map(),
    particles: [],
    prevFoodCount: 0,
    prevPlayerHits: new Map(),
    prevPlayerPos: new Map(),
    scoreboardCollapsed: false,
    minimapCollapsed: false,
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

function spawnConfetti(particles: Particle[], x: number, y: number, count: number = 12): void {
  const colors = ['#ff1493', '#00d4ff', '#facc15', '#22c55e', '#a855f7'];
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    const speed = 150 + Math.random() * 150;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 800,
      maxLife: 800,
      size: 4 + Math.random() * 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      type: 'confetti',
    });
  }
}

function spawnStars(particles: Particle[], x: number, y: number, count: number = 8): void {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 200 + Math.random() * 200;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 600,
      maxLife: 600,
      size: 5 + Math.random() * 5,
      color: '#ffff00',
      type: 'star',
    });
  }
}

function spawnSmoke(particles: Particle[], x: number, y: number, count: number = 6): void {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 50 + Math.random() * 100;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 50,
      life: 1000,
      maxLife: 1000,
      size: 8 + Math.random() * 12,
      color: 'rgba(150, 100, 255, 0.6)',
      type: 'smoke',
    });
  }
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
    const CAMERA_SPEED = 10; // higher = snappier, lower = floatier
    const alpha = 1 - Math.exp(-CAMERA_SPEED * dt);
    state.camera.x += (target.x - state.camera.x) * alpha;
    state.camera.y += (target.y - state.camera.y) * alpha;

    // ── Detect events and spawn particles ─────────────────────────────────
    // Food consumption
    if (state.latestState.foods.length < state.prevFoodCount) {
      // Food was eaten, find the missing one
      const missingFood = state.prevState?.foods ?? [];
      for (const food of missingFood) {
        const still = state.latestState.foods.find((f) => f.id === food.id);
        if (!still) {
          spawnConfetti(state.particles, food.x, food.y, 15);
          break;
        }
      }
    }
    state.prevFoodCount = state.latestState.foods.length;

    // Player collision detection (stun events)
    for (const player of state.latestState.players) {
      const prevStun = state.prevPlayerHits.get(player.id) ?? 0;
      if (player.stunned && !prevStun) {
        // Player just got stunned
        spawnStars(state.particles, player.x, player.y, 10);
      }
      state.prevPlayerHits.set(player.id, player.stunned ? 1 : 0);

      // Portal teleportation detection (large position jump)
      const prevPos = state.prevPlayerPos.get(player.id);
      if (prevPos) {
        const dist = Math.sqrt((player.x - prevPos.x) ** 2 + (player.y - prevPos.y) ** 2);
        if (dist > 500) {
          // Teleported! Spawn smoke at both old and new positions
          spawnSmoke(state.particles, prevPos.x, prevPos.y, 8);
          spawnSmoke(state.particles, player.x, player.y, 8);
        }
      }
      state.prevPlayerPos.set(player.id, { x: player.x, y: player.y });
    }

    // Update particles
    for (let i = state.particles.length - 1; i >= 0; i--) {
      const p = state.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt * 1000; // convert to ms
      p.vy += 300 * dt; // gravity
      
      if (p.life <= 0) {
        state.particles.splice(i, 1);
      }
    }

    // ── Speech bubbles: check for nearby players ─────────────────────────
    const SPEECH_PROXIMITY = 150; // distance threshold
    const SPEECH_DURATION = 3000; // duration to show message (ms)
    const SPEECH_COOLDOWN = 8000; // minimum cooldown between messages per player (8 seconds)
    const SPEECH_CHANCE = 200; // 1 in 200 chance when near another player and off cooldown

    // Expire old speech bubbles
    for (const [playerId, bubble] of state.speechBubbles.entries()) {
      if (now - bubble.startTime > SPEECH_DURATION) {
        state.speechBubbles.delete(playerId);
      }
    }

    // Check for nearby players and trigger speech
    for (const player of state.latestState.players) {
      // Skip if this player already has an active speech bubble
      if (state.speechBubbles.has(player.id)) continue;

      // Check if player is on cooldown
      const lastSpeech = state.lastSpeechTime.get(player.id) ?? 0;
      if (now - lastSpeech < SPEECH_COOLDOWN) continue;

      // Check distance to other players
      for (const other of state.latestState.players) {
        if (other.id === player.id) continue;
        
        const dx = other.x - player.x;
        const dy = other.y - player.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < SPEECH_PROXIMITY) {
          // Random chance to say something
          if (Math.random() < 1 / SPEECH_CHANCE) {
            const message = SILLY_MESSAGES[Math.floor(Math.random() * SILLY_MESSAGES.length)];
            state.speechBubbles.set(player.id, {
              playerId: player.id,
              message,
              startTime: now,
            });
            state.lastSpeechTime.set(player.id, now);
            break; // Only one message per update
          }
        }
      }
    }

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

      if (pu.type === 'omni') {
        // Rainbow spinning effect
        const hue = (now * 0.15) % 360;
        const rainbowColor = `hsl(${hue}, 100%, 60%)`;
        const rainbowColor2 = `hsl(${(hue + 180) % 360}, 100%, 60%)`;

        // Spinning multi-color glow rings
        for (let ri = 0; ri < 3; ri++) {
          const ringHue = (hue + ri * 120) % 360;
          const spinAngle = now * 0.003 * (ri % 2 === 0 ? 1 : -1);
          ctx.strokeStyle = `hsl(${ringHue}, 100%, 65%)`;
          ctx.lineWidth = 2;
          ctx.shadowColor = `hsl(${ringHue}, 100%, 65%)`;
          ctx.shadowBlur = 14;
          ctx.beginPath();
          ctx.arc(pu.x, pu.y, r + 5 + ri * 4, spinAngle, spinAngle + Math.PI * 1.5);
          ctx.stroke();
        }

        // Rainbow conic(-ish) fill via gradient
        const grad = ctx.createRadialGradient(pu.x, pu.y, 0, pu.x, pu.y, r);
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.5, rainbowColor);
        grad.addColorStop(1, rainbowColor2);
        ctx.fillStyle = grad;
        ctx.globalAlpha = 0.9;
        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.arc(pu.x, pu.y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        // Label
        ctx.font = `bold ${r * 1.1}px "Segoe UI", system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#000';
        ctx.fillText(style.label, pu.x, pu.y + 1);
      } else if (pu.type === 'jack-in-the-box') {
        // Distinct jack-in-the-box look: striped box + spring + knob
        const boxSize = r * 1.7;
        const boxHalf = boxSize / 2;

        // Outer glow
        ctx.shadowColor = '#f97316';
        ctx.shadowBlur = 18;

        // Box body
        ctx.fillStyle = '#f97316';
        ctx.globalAlpha = 0.92;
        ctx.beginPath();
        ctx.roundRect(pu.x - boxHalf, pu.y - boxHalf * 0.65, boxSize, boxSize * 1.1, 6);
        ctx.fill();
        ctx.globalAlpha = 1;

        // Stripes
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#7c2d12';
        const stripeW = boxSize * 0.14;
        for (let sx = pu.x - boxHalf + stripeW; sx < pu.x + boxHalf; sx += stripeW * 2) {
          ctx.fillRect(sx, pu.y - boxHalf * 0.65, stripeW, boxSize * 1.1);
        }

        // Spring
        ctx.strokeStyle = '#111827';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        const springTop = pu.y - boxHalf * 1.15;
        const springBottom = pu.y - boxHalf * 0.72;
        const coils = 5;
        for (let i = 0; i <= coils; i++) {
          const t = i / coils;
          const x = pu.x + Math.sin(t * Math.PI * 4) * (r * 0.36);
          const y = springTop + (springBottom - springTop) * t;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();

        // Knob head
        ctx.fillStyle = '#fde68a';
        ctx.beginPath();
        ctx.arc(pu.x, springTop - r * 0.18, r * 0.34, 0, Math.PI * 2);
        ctx.fill();

        // Small icon label in the center
        ctx.font = `bold ${r * 0.95}px "Segoe UI", system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#111827';
        ctx.fillText('J', pu.x, pu.y + 1);
      } else {
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
      }
      ctx.restore();
    }

    // ── Black Holes ──────────────────────────────────────────────────────────
    for (const bh of state.latestState.blackholes) {
      const bhRadius = bh.radius || CONFIG.BLACKHOLE_RADIUS;
      const bhColor = bh.color || '#a020f0'; // fallback to purple

      ctx.save();

      // Swirling vortex effect - multiple rotating rings using hole's color
      for (let ring = 0; ring < 3; ring++) {
        const ringRadius = bhRadius * (0.3 + ring * 0.25);
        const rotation = (now * 0.0008 * (ring % 2 ? 1 : -1)) + ring * Math.PI / 1.5;
        
        ctx.strokeStyle = `${bhColor}${Math.floor((0.5 - ring * 0.12) * 255).toString(16).padStart(2, '0')}`;
        ctx.lineWidth = 1.5 - ring * 0.3;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const angle = rotation + (i / 6) * Math.PI * 2;
          const x = bh.x + Math.cos(angle) * ringRadius;
          const y = bh.y + Math.sin(angle) * ringRadius;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.stroke();
      }

      // Glow with hole's color
      ctx.shadowColor = bhColor;
      ctx.shadowBlur = 40;
      ctx.fillStyle = bhColor;
      ctx.globalAlpha = 0.4;
      ctx.beginPath();
      ctx.arc(bh.x, bh.y, bhRadius * 0.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Dark core with gradient
      const coreGradient = ctx.createRadialGradient(bh.x, bh.y, 0, bh.x, bh.y, bhRadius * 0.7);
      coreGradient.addColorStop(0, 'rgba(0, 0, 0, 0.9)');
      coreGradient.addColorStop(1, `${bhColor}40`);
      ctx.fillStyle = coreGradient;
      ctx.globalAlpha = 1;
      ctx.beginPath();
      ctx.arc(bh.x, bh.y, bhRadius * 0.7, 0, Math.PI * 2);
      ctx.fill();

      // Bright event horizon ring with hole's color
      const horizonPulse = 0.4 + 0.6 * Math.sin(now * 0.006);
      ctx.strokeStyle = bhColor;
      ctx.globalAlpha = horizonPulse;
      ctx.lineWidth = 3;
      ctx.shadowColor = bhColor;
      ctx.shadowBlur = 20;
      ctx.beginPath();
      ctx.arc(bh.x, bh.y, bhRadius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Inward pull effect - small particles spiraling in
      for (let p = 0; p < 5; p++) {
        const angle = (now * 0.001 + p * (Math.PI * 2 / 5)) % (Math.PI * 2);
        const dist = bhRadius * 1.3;
        const px = bh.x + Math.cos(angle) * dist;
        const py = bh.y + Math.sin(angle) * dist;
        const fade = 0.3 + 0.7 * (1 - (angle % (Math.PI * 2)) / (Math.PI * 2));
        
        ctx.globalAlpha = fade;
        ctx.fillStyle = '#ff00ff';
        ctx.beginPath();
        ctx.arc(px, py, 2, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalAlpha = 1;
      ctx.restore();
    }
    // ── Find top scorer ─────────────────────────────────────────────────
    const topScorer = state.latestState.players.reduce((max, p) => p.score > max.score ? p : max);

    // ── Glue chains between stuck players ───────────────────────────────
    for (const player of state.latestState.players) {
      if (!player.gluedTo || !player.gluedUntil) continue;
      // Only draw once per pair (draw from the lower id)
      if (player.id > player.gluedTo) continue;
      const partner = state.latestState.players.find((p) => p.id === player.gluedTo);
      if (!partner) continue;
      const posA = interp.get(player.id) ?? { x: player.x, y: player.y };
      const posB = interp.get(partner.id) ?? { x: partner.x, y: partner.y };
      const timeLeft = Math.max(0, player.gluedUntil - now);
      const progress = timeLeft / CONFIG.JACKBOX_GLUE_DURATION;
      // Chain wobble
      const wobble = Math.sin(now * 0.015) * 12 * progress;
      const midX = (posA.x + posB.x) / 2 + wobble;
      const midY = (posA.y + posB.y) / 2 + wobble;
      // Flash orange → red as time runs out
      const r = Math.floor(255);
      const g = Math.floor(150 * progress);
      ctx.save();
      ctx.strokeStyle = `rgb(${r},${g},0)`;
      ctx.lineWidth = 3 + 2 * progress;
      ctx.setLineDash([8, 5]);
      ctx.shadowColor = `rgb(${r},${g},0)`;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.moveTo(posA.x, posA.y);
      ctx.quadraticCurveTo(midX, midY, posB.x, posB.y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }

    // ── Hook ropes ──────────────────────────────────────────────────────
    for (const hook of state.latestState.hooks ?? []) {
      const ownerPos = interp.get(hook.ownerId) ?? state.latestState.players.find((p) => p.id === hook.ownerId);
      if (!ownerPos) continue;
      let tipX = hook.x;
      let tipY = hook.y;
      if (hook.latchedTo) {
        const targetPos = interp.get(hook.latchedTo) ?? state.latestState.players.find((p) => p.id === hook.latchedTo);
        if (targetPos) { tipX = targetPos.x; tipY = targetPos.y; }
      }
      ctx.save();
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 3;
      if (!hook.latchedTo) ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.moveTo(ownerPos.x, ownerPos.y);
      ctx.lineTo(tipX, tipY);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(tipX, tipY, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // ── Players ──────────────────────────────────────────────────────────
    for (const player of state.latestState.players) {
      const pos = interp.get(player.id) ?? { x: player.x, y: player.y };
      const isLocal = player.id === state.localPlayerId;
      const isStunned = player.stunned;
      const isTopScorer = player.id === topScorer.id && topScorer.score > 0;

      ctx.save();
      if (isStunned) ctx.globalAlpha = 0.45;

      // Tail segments (draw before head) — fade toward tip
      const tailLen = player.tail.length;
      
      // Set shadow for entire tail if top scorer
      if (isTopScorer) {
        ctx.shadowColor = player.color;
        ctx.shadowBlur = 8;
      }
      
      for (let ti = 0; ti < tailLen; ti++) {
        const seg = player.tail[ti];
        // ti=0 is closest to head (brightest), ti=tailLen-1 is tip (most faded)
        const fadeFrac = tailLen > 1 ? ti / (tailLen - 1) : 0;
        const segRadius = CONFIG.TAIL_SEGMENT_RADIUS * lerp(1, 0.6, fadeFrac);
        const baseAlpha = isStunned ? 0.25 : lerp(0.75, 0.25, fadeFrac);
        
        ctx.globalAlpha = baseAlpha;
        ctx.beginPath();
        ctx.arc(seg.x, seg.y, segRadius, 0, Math.PI * 2);
        ctx.fillStyle = player.color;
        ctx.fill();
        
        // Glow ring for top scorer
        if (isTopScorer) {
          ctx.globalAlpha = 0.35;
          const glowPulse = 0.6 + 0.4 * Math.sin(now * 0.004 + ti * 0.15);
          ctx.strokeStyle = '#f59e0b';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.arc(seg.x, seg.y, segRadius + 8, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
      ctx.shadowBlur = 0;

      // Reset alpha for head
      ctx.globalAlpha = isStunned ? 0.45 : 1;

      // Head shadow / glow
      ctx.shadowColor = player.color;
      ctx.shadowBlur = isTopScorer ? 30 : (isLocal ? 18 : 8);

      // Head circle
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, CONFIG.PLAYER_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = player.color;
      ctx.fill();

      const hashCode = player.id.charCodeAt(0) + player.id.charCodeAt(player.id.length - 1);
      // Deterministic random snake face based on player ID (eyes only, no mouths)
      const faceStyle = Math.abs(hashCode) % 12;
      const eyeOffsetX = CONFIG.PLAYER_RADIUS * 0.33;
      const eyeOffsetY = CONFIG.PLAYER_RADIUS * 0.22;
      const eyeR = CONFIG.PLAYER_RADIUS * 0.2;
      const moveDir = player.facingAngle ?? 0;
      const lookX = Math.cos(moveDir) * eyeR * 0.35;
      const lookY = Math.sin(moveDir) * eyeR * 0.35;
      const blink = 0.35 + 0.65 * Math.abs(Math.sin(now * 0.004 + hashCode * 0.17));
      const winkCycleMs = 9500;
      const winkWindowMs = 230;
      const winkPhase = (now + hashCode * 173) % winkCycleMs;
      const winkingEye = winkPhase < winkWindowMs ? (hashCode % 2 === 0 ? 'left' : 'right') : null;
      const eyeRollCycleMs = 14000;
      const eyeRollWindowMs = 210;
      const eyeRollPhase = (now + hashCode * 311) % eyeRollCycleMs;
      const isEyeRoll = eyeRollPhase < eyeRollWindowMs;

      const drawSnakeEye = (
        x: number,
        y: number,
        style: number,
        eyeSeed: number,
        side: 'left' | 'right',
      ): void => {
        const styleType = Math.abs(style) % 12;
        const eyeJitterX = Math.sin(now * 0.003 + eyeSeed * 0.9) * eyeR * 0.07;
        const eyeJitterY = Math.cos(now * 0.0027 + eyeSeed * 0.6) * eyeR * 0.05;
        const cx = x + eyeJitterX;
        const cy = y + eyeJitterY;
        const isWinkThisEye = winkingEye === side;
        const scleraH = eyeR * (styleType === 1 || styleType === 7 ? 0.52 : 0.92) * (isWinkThisEye ? 0.2 : blink);
        const localLookX = isEyeRoll ? 0 : lookX;
        const localLookY = isEyeRoll ? -eyeR * 0.6 : lookY;

        // White sclera base
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(cx, cy, eyeR, Math.max(eyeR * 0.22, scleraH), 0, 0, Math.PI * 2);
        ctx.fill();

        if (isWinkThisEye) {
          // Quick wink frame: eyelid line and stop here.
          ctx.strokeStyle = '#111827';
          ctx.lineWidth = Math.max(1.4, eyeR * 0.14);
          ctx.beginPath();
          ctx.moveTo(cx - eyeR * 0.75, cy);
          ctx.lineTo(cx + eyeR * 0.75, cy + eyeR * 0.05);
          ctx.stroke();
          return;
        }

        // Iris
        const irisColor = ['#22c55e', '#eab308', '#60a5fa', '#f97316', '#a78bfa', '#fb7185', '#f43f5e', '#34d399'][styleType % 8];
        const irisX = cx + localLookX * (styleType === 6 ? 0.25 : 0.6);
        const irisY = cy + localLookY * (styleType === 6 ? 0.25 : 0.6);
        ctx.fillStyle = irisColor;
        ctx.beginPath();
        ctx.ellipse(irisX, irisY, eyeR * (styleType === 4 ? 0.62 : 0.52), eyeR * (styleType === 4 ? 0.62 : 0.52), 0, 0, Math.PI * 2);
        ctx.fill();

        // Pupil variations (snake-ish, googly, sleepy, spirals, weird offsets)
        ctx.fillStyle = '#111827';
        if (styleType === 0 || styleType === 3) {
          ctx.beginPath();
          ctx.ellipse(cx + localLookX, cy + localLookY, eyeR * 0.14, eyeR * 0.46, 0, 0, Math.PI * 2);
          ctx.fill();
        } else if (styleType === 1) {
          // Sleepy round pupil
          ctx.beginPath();
          ctx.ellipse(cx + localLookX * 0.7, cy + localLookY * 0.7, eyeR * 0.24, eyeR * 0.22, 0, 0, Math.PI * 2);
          ctx.fill();
        } else if (styleType === 2) {
          ctx.beginPath();
          ctx.ellipse(cx + localLookX, cy + localLookY, eyeR * 0.09, eyeR * 0.5, 0.25, 0, Math.PI * 2);
          ctx.fill();
        } else if (styleType === 4) {
          // Googly pupils
          const wiggle = Math.sin(now * 0.01 + eyeSeed) * eyeR * 0.18;
          ctx.beginPath();
          ctx.arc(cx + localLookX * 0.35 + wiggle, cy + localLookY * 0.35, eyeR * 0.16, 0, Math.PI * 2);
          ctx.fill();
        } else if (styleType === 5) {
          // Tiny shocked pupil
          ctx.beginPath();
          ctx.arc(cx + localLookX * 0.9, cy + localLookY * 0.9, eyeR * 0.1, 0, Math.PI * 2);
          ctx.fill();
        } else if (styleType === 6) {
          // Spiral-ish ring pupil
          ctx.strokeStyle = '#111827';
          ctx.lineWidth = Math.max(1, eyeR * 0.12);
          ctx.beginPath();
          ctx.arc(cx, cy, eyeR * 0.23, 0, Math.PI * 1.75);
          ctx.stroke();
        } else if (styleType === 7) {
          // Flat annoyed pupil
          ctx.fillRect(cx - eyeR * 0.24, cy - eyeR * 0.06, eyeR * 0.48, eyeR * 0.12);
        } else if (styleType === 8) {
          // Offset vertical slit
          ctx.beginPath();
          ctx.ellipse(cx + eyeR * 0.18, cy - eyeR * 0.05, eyeR * 0.1, eyeR * 0.44, 0.12, 0, Math.PI * 2);
          ctx.fill();
        } else if (styleType === 9) {
          // Cross-eyed style
          ctx.beginPath();
          ctx.ellipse(cx - eyeR * 0.12, cy + localLookY * 0.25, eyeR * 0.12, eyeR * 0.34, -0.15, 0, Math.PI * 2);
          ctx.fill();
        } else if (styleType === 10) {
          // Diamond-ish pupil
          ctx.beginPath();
          ctx.moveTo(cx, cy - eyeR * 0.32);
          ctx.lineTo(cx + eyeR * 0.16, cy);
          ctx.lineTo(cx, cy + eyeR * 0.32);
          ctx.lineTo(cx - eyeR * 0.16, cy);
          ctx.closePath();
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.ellipse(cx + localLookX, cy + localLookY, eyeR * 0.12, eyeR * 0.44, -0.2, 0, Math.PI * 2);
          ctx.fill();
        }

        // Eye shine
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.beginPath();
        ctx.arc(cx - eyeR * 0.25, cy - eyeR * 0.25, eyeR * 0.12, 0, Math.PI * 2);
        ctx.fill();
      };

      drawSnakeEye(pos.x - eyeOffsetX, pos.y - eyeOffsetY, faceStyle, hashCode + 11, 'left');
      drawSnakeEye(pos.x + eyeOffsetX, pos.y - eyeOffsetY, (faceStyle + 7) % 12, hashCode + 37, 'right');

      // Small brow ridges for extra snake expression.
      if (faceStyle !== 4 && faceStyle !== 6) {
        ctx.strokeStyle = 'rgba(17, 24, 39, 0.7)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(pos.x - eyeOffsetX - eyeR * 0.65, pos.y - eyeOffsetY - eyeR * 0.9);
        ctx.lineTo(pos.x - eyeOffsetX + eyeR * 0.65, pos.y - eyeOffsetY - eyeR * (0.72 + 0.05 * Math.sin(now * 0.006 + hashCode)));
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(pos.x + eyeOffsetX - eyeR * 0.65, pos.y - eyeOffsetY - eyeR * (0.72 + 0.05 * Math.sin(now * 0.006 + hashCode + 1)));
        ctx.lineTo(pos.x + eyeOffsetX + eyeR * 0.65, pos.y - eyeOffsetY - eyeR * 0.9);
        ctx.stroke();
      }

      // ── Beard (grows with tail length) ───────────────────────────────
      {
        const R = CONFIG.PLAYER_RADIUS;
        const BEARD_MIN = 3;  // tail segments before beard appears
        const BEARD_MAX = 30; // tail segments for full beard
        if (tailLen >= BEARD_MIN) {
          const prog = Math.min(1, (tailLen - BEARD_MIN) / (BEARD_MAX - BEARD_MIN));
          const beardLen = R * 2.6 * prog;
          const strandCount = 3 + Math.floor(prog * 6); // 3 to 9 strands
          ctx.save();
          ctx.lineCap = 'round';
          for (let si = 0; si < strandCount; si++) {
            const t = strandCount > 1 ? si / (strandCount - 1) : 0.5;
            // Anchor points spread along the bottom of the head circle
            const anchorX = pos.x + Math.cos(Math.PI * 0.5 + (t - 0.5) * Math.PI) * R * 0.78;
            const anchorY = pos.y + Math.sin(Math.PI * 0.5 + (t - 0.5) * Math.PI) * R * 0.78;
            // Gentle time-based sway, deterministic per strand
            const sway = Math.sin(now * 0.0015 + (hashCode + si * 23) * 0.7) * R * 0.2 * prog;
            // Strand tip droops down with slight outward flare
            const endX = anchorX + (t - 0.5) * beardLen * 0.35 + sway;
            const endY = anchorY + beardLen;
            // Quadratic bezier control point for natural curve
            const ctrlX = (anchorX + endX) / 2 + sway * 0.6;
            const ctrlY = anchorY + beardLen * 0.55;
            // Thicker in the centre, tapers at the edges
            ctx.lineWidth = Math.max(1.2, (1.5 + prog * R * 0.13) * (1 - Math.abs(t - 0.5) * 0.55));
            // Colour: warm brown when young, silvery-white when fully grown
            const br = Math.round(lerp(150, 215, prog));
            const bg = Math.round(lerp(95, 205, prog));
            const bb = Math.round(lerp(40, 195, prog));
            ctx.strokeStyle = `rgba(${br}, ${bg}, ${bb}, 0.9)`;
            ctx.beginPath();
            ctx.moveTo(anchorX, anchorY);
            ctx.quadraticCurveTo(ctrlX, ctrlY, endX, endY);
            ctx.stroke();
          }
          ctx.restore();
        }
      }

      // Cigarette overlay (applies to all heads)
      {
        const R = CONFIG.PLAYER_RADIUS;
        const dir = player.facingAngle ?? 0;
        const fx = Math.cos(dir);
        const fy = Math.sin(dir);
        const px = -fy;
        const py = fx;

        // Cigarette: starts near mouth and points outward from facing direction.
        const mouthX = pos.x + fx * R * 0.42 + px * R * 0.08;
        const mouthY = pos.y + fy * R * 0.42 + py * R * 0.08 + R * 0.22;
        const cigLen = R * 0.9;
        const cigW = Math.max(2.5, R * 0.16);

        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineWidth = cigW;
        ctx.strokeStyle = '#f8f5ea';
        ctx.beginPath();
        ctx.moveTo(mouthX, mouthY);
        ctx.lineTo(mouthX + fx * cigLen, mouthY + fy * cigLen);
        ctx.stroke();

        // Filter band
        ctx.strokeStyle = '#d4a574';
        ctx.beginPath();
        ctx.moveTo(mouthX + fx * cigLen * 0.64, mouthY + fy * cigLen * 0.64);
        ctx.lineTo(mouthX + fx * cigLen * 0.82, mouthY + fy * cigLen * 0.82);
        ctx.stroke();

        // Ember tip + subtle smoke
        const tipX = mouthX + fx * cigLen;
        const tipY = mouthY + fy * cigLen;
        const emberPulse = 0.65 + 0.35 * Math.sin(now * 0.02 + hashCode);
        ctx.fillStyle = `rgba(255, 96, 0, ${0.45 + 0.4 * emberPulse})`;
        ctx.beginPath();
        ctx.arc(tipX, tipY, R * 0.13, 0, Math.PI * 2);
        ctx.fill();

        for (let si = 0; si < 2; si++) {
          const t = (now * 0.0018 + si * 0.42 + (hashCode % 11) * 0.03) % 1;
          const sx = tipX + fx * (R * (0.25 + t * 0.9)) + px * Math.sin(now * 0.003 + si) * R * 0.12;
          const sy = tipY + fy * (R * (0.25 + t * 0.9)) - t * R * 0.35;
          ctx.fillStyle = `rgba(220, 220, 220, ${0.28 * (1 - t)})`;
          ctx.beginPath();
          ctx.arc(sx, sy, R * (0.06 + 0.06 * t), 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      // Enhanced golden glow rings for top scorer
      if (isTopScorer) {
        // Outer glow ring (larger, more transparent)
        const pulse1 = 0.5 + 0.5 * Math.sin(now * 0.004);
        ctx.globalAlpha = pulse1 * 0.3;
        ctx.strokeStyle = '#d97706';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, CONFIG.PLAYER_RADIUS + 28, 0, Math.PI * 2);
        ctx.stroke();

        // Inner glow ring (brighter, tighter)
        const pulse2 = 0.7 + 0.3 * Math.sin(now * 0.005);
        ctx.globalAlpha = pulse2 * 0.4;
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, CONFIG.PLAYER_RADIUS + 12, 0, Math.PI * 2);
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

      // Zap-stun: electric-blue flashing ring
      if (player.zapStunnedUntil > now) {
        const flash = Math.sin(now * 0.04) > 0 ? 1 : 0.15; // sharp fast strobe
        ctx.globalAlpha = flash;
        ctx.strokeStyle = '#60a5fa';
        ctx.lineWidth = 3.5;
        ctx.shadowColor = '#93c5fd';
        ctx.shadowBlur = 18;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, CONFIG.PLAYER_RADIUS + 10, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
      }

      // Charged-up blue ring (only visible to the local player's own snake)
      if (isLocal && player.zapCharge >= CONFIG.ZAP_PELLET_THRESHOLD) {
        const chargePulse = 0.6 + 0.4 * Math.sin(now * 0.008);
        ctx.globalAlpha = chargePulse;
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 3;
        ctx.shadowColor = '#60a5fa';
        ctx.shadowBlur = 20;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, CONFIG.PLAYER_RADIUS + 14, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
      }

      ctx.shadowBlur = 0;

      // ── Armor plating (drawn after face) ──
      if (player.hasHelmet) {
        const R = CONFIG.PLAYER_RADIUS;
        const armorY = pos.y + R * 0.06;
        ctx.save();
        ctx.shadowBlur = 0;

        // Main armor band wrapping the head
        const armorGrad = ctx.createLinearGradient(pos.x, armorY - R * 0.7, pos.x, armorY + R * 0.5);
        armorGrad.addColorStop(0, '#e5e7eb');
        armorGrad.addColorStop(0.55, '#9ca3af');
        armorGrad.addColorStop(1, '#6b7280');
        ctx.strokeStyle = '#4b5563';
        ctx.lineWidth = Math.max(4, R * 0.26);
        ctx.beginPath();
        ctx.arc(pos.x, armorY, R * 0.93, Math.PI * 0.03, Math.PI * 0.97);
        ctx.strokeStyle = armorGrad;
        ctx.stroke();

        // Outline for contrast
        ctx.strokeStyle = '#4b5563';
        ctx.lineWidth = Math.max(1.6, R * 0.08);
        ctx.beginPath();
        ctx.arc(pos.x, armorY, R * 0.93, Math.PI * 0.03, Math.PI * 0.97);
        ctx.stroke();

        // Center chest plate
        const plateW = R * 0.86;
        const plateH = R * 0.44;
        const plateX = pos.x - plateW / 2;
        const plateY = pos.y + R * 0.56;
        ctx.fillStyle = '#9ca3af';
        ctx.strokeStyle = '#4b5563';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(plateX, plateY, plateW, plateH, 4);
        ctx.fill();
        ctx.stroke();

        // Rivets
        ctx.fillStyle = '#d1d5db';
        for (const rx of [plateX + plateW * 0.22, plateX + plateW * 0.78]) {
          ctx.beginPath();
          ctx.arc(rx, plateY + plateH * 0.5, R * 0.07, 0, Math.PI * 2);
          ctx.fill();
        }

        // Shine streak
        ctx.strokeStyle = 'rgba(255,255,255,0.35)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(plateX + plateW * 0.2, plateY + plateH * 0.2);
        ctx.lineTo(plateX + plateW * 0.8, plateY + plateH * 0.2);
        ctx.stroke();

        ctx.restore();
      }

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

      // ── Gun indicator ─────────────────────────────────────────────────
      if (player.hasGun) {
        ctx.save();
        ctx.shadowBlur = 0;
        const isMinigunEquipped = player.gunType === 'minigun';
        ctx.font = `${Math.round(CONFIG.PLAYER_RADIUS * 0.9)}px "Segoe UI", system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(isMinigunEquipped ? '🔫🔫' : '🔫', pos.x + CONFIG.PLAYER_RADIUS + (isMinigunEquipped ? 14 : 10), pos.y - CONFIG.PLAYER_RADIUS - 8);
        ctx.restore();
      }

      if (player.hasHook) {
        ctx.save();
        ctx.shadowBlur = 0;
        ctx.font = `${Math.round(CONFIG.PLAYER_RADIUS * 0.9)}px "Segoe UI", system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🪝', pos.x - CONFIG.PLAYER_RADIUS - 10, pos.y - CONFIG.PLAYER_RADIUS - 8);
        ctx.restore();
      }

      ctx.restore();
    }

    // ── Speech bubbles ───────────────────────────────────────────────────
    for (const [playerId, bubble] of state.speechBubbles.entries()) {
      const player = state.latestState.players.find((p) => p.id === playerId);
      if (!player) continue;

      const pos = interp.get(player.id) ?? { x: player.x, y: player.y };
      const elapsed = now - bubble.startTime;
      const progress = Math.min(elapsed / 300, 1); // fade in over 300ms
      const fadeOut = Math.max(1, (3000 - elapsed) / 500); // fade out in last 500ms
      const alpha = Math.min(progress, fadeOut);

      if (alpha <= 0) continue;

      ctx.save();
      ctx.globalAlpha = alpha;

      // Bubble background
      const bubbleX = pos.x;
      const bubbleY = pos.y - CONFIG.PLAYER_RADIUS - 35;
      const padding = 8;
      const textMetrics = ctx.measureText(bubble.message);
      const bubbleW = textMetrics.width + padding * 2;
      const bubbleH = 24;

      // Draw rounded bubble background
      ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
      roundRect(ctx, bubbleX - bubbleW / 2, bubbleY - bubbleH / 2, bubbleW, bubbleH, 8);
      ctx.fill();

      // Bubble border
      ctx.strokeStyle = player.color;
      ctx.lineWidth = 2;
      roundRect(ctx, bubbleX - bubbleW / 2, bubbleY - bubbleH / 2, bubbleW, bubbleH, 8);
      ctx.stroke();

      // Tail pointer
      ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
      ctx.beginPath();
      ctx.moveTo(bubbleX - 6, bubbleY + bubbleH / 2);
      ctx.lineTo(bubbleX + 6, bubbleY + bubbleH / 2);
      ctx.lineTo(bubbleX, bubbleY + bubbleH / 2 + 8);
      ctx.fill();
      ctx.strokeStyle = player.color;
      ctx.stroke();

      // Message text
      ctx.font = 'bold 12px "Segoe UI", system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#000';
      ctx.fillText(bubble.message, bubbleX, bubbleY);

      ctx.restore();
    }

    ctx.restore();

    // ── Missiles (world space) ────────────────────────────────────
    ctx.save();
    ctx.translate(offsetX, offsetY);
    for (const missile of (state.latestState.missiles ?? [])) {
      ctx.save();
      ctx.translate(missile.x, missile.y);
      ctx.rotate(missile.angle);

      // Flame trail behind missile
      const trailLen = 28;
      const grad = ctx.createLinearGradient(-trailLen, 0, 0, 0);
      grad.addColorStop(0, 'rgba(255, 100, 0, 0)');
      grad.addColorStop(0.5, 'rgba(255, 200, 0, 0.7)');
      grad.addColorStop(1, 'rgba(255, 60, 0, 0.9)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(-trailLen / 2, 0, trailLen / 2, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Missile body glow
      ctx.shadowColor = '#22d3ee';
      ctx.shadowBlur = 16;

      // Rocket emoji centred at origin (rotated to face direction)
      ctx.font = '18px "Segoe UI", system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🚀', 0, 0);

      ctx.shadowBlur = 0;
      ctx.restore();

      // Dashed target line for the local player's missile
      const ownerIsLocal = missile.ownerId === state.localPlayerId;
      if (ownerIsLocal) {
        const target = state.latestState.players.find((p) => p.id === missile.targetId);
        if (target) {
          ctx.save();
          ctx.setLineDash([6, 5]);
          ctx.strokeStyle = 'rgba(34, 211, 238, 0.45)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(missile.x, missile.y);
          ctx.lineTo(target.x, target.y);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.restore();
        }
      }
    }
    ctx.restore();

    // ── Bullets (world space) ────────────────────────────────────────────
    ctx.save();
    ctx.translate(offsetX, offsetY);
    for (const bullet of (state.latestState.bullets ?? [])) {
      ctx.save();
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 12;
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(bullet.x, bullet.y, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(bullet.x, bullet.y, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();

    // ── Render particles (world space) ────────────────────────────────────
    ctx.save();
    ctx.translate(offsetX, offsetY);
    for (const particle of state.particles) {
      const alpha = particle.life / particle.maxLife;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = particle.color;

      if (particle.type === 'confetti') {
        // Small square
        ctx.fillRect(particle.x - particle.size / 2, particle.y - particle.size / 2, particle.size, particle.size);
      } else if (particle.type === 'star') {
        // Star shape
        ctx.save();
        ctx.translate(particle.x, particle.y);
        ctx.fillStyle = particle.color;
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
          const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
          const x = Math.cos(angle) * particle.size;
          const y = Math.sin(angle) * particle.size;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      } else if (particle.type === 'smoke') {
        // Circle with reduced size as it fades
        const fadeSize = particle.size * (1 - (1 - alpha) * 0.5);
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, fadeSize, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
    ctx.restore();

    // ── HUD (fixed screen-space) ─────────────────────────────────────────
    drawHUD(ctx, canvas, state.latestState, state.localPlayerId, state);
    drawActiveEffects(ctx, canvas, state.latestState, state.localPlayerId);
    drawSprintBar(ctx, canvas, state.latestState, state.localPlayerId, now);
    drawZapBar(ctx, canvas, state.latestState, state.localPlayerId, now);
    drawGunAmmoBar(ctx, canvas, state.latestState, state.localPlayerId);
    drawHookIndicator(ctx, canvas, state.latestState, state.localPlayerId);
    drawScamPopup(ctx, canvas, state);
    drawCoinFlipPopup(ctx, canvas, state);
    drawOuroborosPopup(ctx, canvas, state);
    drawOmniPopup(ctx, canvas, state);
  }

  requestAnimationFrame(frame);
}

function drawHUD(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  state: GameStatePayload,
  localId: string | null,
  rendererState: RendererState
): void {
  const sorted = [...state.players].sort((a, b) => b.score - a.score);

  if (!rendererState.scoreboardCollapsed) {
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
  }

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
  if (!rendererState.minimapCollapsed) {
    drawMinimap(ctx, canvas, state, localId);
  }
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

  // Black holes on minimap
  for (const bh of state.blackholes) {
    const bhColor = bh.color || '#a020f0';
    ctx.fillStyle = bhColor;
    ctx.beginPath();
    ctx.arc(mx + bh.x * scaleX, my + bh.y * scaleY, 4, 0, Math.PI * 2);
    ctx.fill();
    // Glow ring
    ctx.strokeStyle = bhColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(mx + bh.x * scaleX, my + bh.y * scaleY, 6, 0, Math.PI * 2);
    ctx.stroke();
  }
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

function drawZapBar(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  state: GameStatePayload,
  localId: string | null,
  now: number
): void {
  if (!localId) return;
  const player = state.players.find((p) => p.id === localId);
  if (!player) return;

  const charge = player.zapCharge ?? 0;
  const fraction = Math.max(0, Math.min(1, charge / CONFIG.ZAP_PELLET_THRESHOLD));
  const charged = fraction >= 1;

  const BAR_W = 220;
  const BAR_H = 14;
  const MARGIN = 14;
  const GAP = 6;
  // Place directly above the sprint bar
  const sprintBarY = canvas.height - MARGIN - BAR_H;
  const bx = canvas.width / 2 - BAR_W / 2;
  const by = sprintBarY - BAR_H - GAP;
  const radius = BAR_H / 2;

  ctx.save();

  // Background track
  ctx.globalAlpha = 0.65;
  ctx.fillStyle = '#0d0d1a';
  roundRect(ctx, bx, by, BAR_W, BAR_H, radius);
  ctx.fill();
  ctx.globalAlpha = 1;

  if (fraction > 0) {
    const fillW = Math.max(BAR_H, (BAR_W - 2) * fraction);
    const fillColor = charged ? '#3b82f6' : '#60a5fa';
    if (charged) {
      // Flash when ready
      const flash = 0.7 + 0.3 * Math.sin(now * 0.012);
      ctx.globalAlpha = flash;
    }
    ctx.fillStyle = fillColor;
    ctx.shadowColor = fillColor;
    ctx.shadowBlur = charged ? 14 : 6;
    roundRect(ctx, bx + 1, by + 1, fillW, BAR_H - 2, radius - 1);
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  ctx.globalAlpha = 1;

  // Label
  ctx.font = 'bold 9px "Segoe UI", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = fraction > 0.5 ? '#000' : '#60a5fa';
  ctx.fillText(charged ? '⚡ ZAP READY!' : `ZAP  ${charge}/${CONFIG.ZAP_PELLET_THRESHOLD}`, canvas.width / 2, by + BAR_H / 2);

  ctx.restore();
}

function drawSprintBar(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  state: GameStatePayload,
  localId: string | null,
  now: number
): void {
  if (!localId) return;
  const player = state.players.find((p) => p.id === localId);
  if (!player) return;

  const stamina = player.stamina ?? CONFIG.SPRINT_MAX_STAMINA;
  const fraction = Math.max(0, Math.min(1, stamina / CONFIG.SPRINT_MAX_STAMINA));

  const BAR_W = 220;
  const BAR_H = 14;
  const MARGIN = 14;
  const bx = canvas.width / 2 - BAR_W / 2;
  const by = canvas.height - MARGIN - BAR_H;
  const radius = BAR_H / 2;

  ctx.save();

  // Background track
  ctx.globalAlpha = 0.65;
  ctx.fillStyle = '#0d0d1a';
  roundRect(ctx, bx, by, BAR_W, BAR_H, radius);
  ctx.fill();
  ctx.globalAlpha = 1;

  // Fill colour: cyan when healthy, orange when low, flashing red when empty
  let fillColor: string;
  if (fraction > 0.5) {
    fillColor = '#38bdf8'; // sky blue
  } else if (fraction > 0.2) {
    fillColor = '#fb923c'; // orange
  } else {
    // Flash red when nearly empty
    const flash = 0.6 + 0.4 * Math.sin(now * 0.015);
    ctx.globalAlpha = flash;
    fillColor = '#ef4444';
  }

  if (fraction > 0) {
    const fillW = Math.max(BAR_H, (BAR_W - 2) * fraction); // keep at least a cap
    ctx.fillStyle = fillColor;
    ctx.shadowColor = fillColor;
    ctx.shadowBlur = 8;
    roundRect(ctx, bx + 1, by + 1, fillW, BAR_H - 2, radius - 1);
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  ctx.globalAlpha = 1;

  // Label
  ctx.font = 'bold 9px "Segoe UI", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = fraction > 0.3 ? '#000' : '#fff';
  ctx.fillText('SPRINT  [SPACE]', canvas.width / 2, by + BAR_H / 2);

  ctx.restore();
}

function drawGunAmmoBar(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  state: GameStatePayload,
  localId: string | null
): void {
  if (!localId) return;
  const player = state.players.find((p) => p.id === localId);
  if (!player || !player.hasGun) return;

  const isMinigun = player.gunType === 'minigun';
  const ammo = player.gunAmmo ?? 0;
  const maxAmmo = isMinigun ? CONFIG.MINIGUN_AMMO : CONFIG.GUN_AMMO;
  const fraction = Math.max(0, Math.min(1, ammo / maxAmmo));
  const barColor = isMinigun ? '#f97316' : '#ef4444';

  const BAR_W = 220;
  const BAR_H = 14;
  const MARGIN = 14;
  const GAP = 6;
  // Place above the zap bar
  const sprintBarY = canvas.height - MARGIN - BAR_H;
  const zapBarY = sprintBarY - BAR_H - GAP;
  const bx = canvas.width / 2 - BAR_W / 2;
  const by = zapBarY - BAR_H - GAP;
  const radius = BAR_H / 2;

  ctx.save();

  ctx.globalAlpha = 0.65;
  ctx.fillStyle = '#0d0d1a';
  roundRect(ctx, bx, by, BAR_W, BAR_H, radius);
  ctx.fill();
  ctx.globalAlpha = 1;

  if (fraction > 0) {
    const fillW = Math.max(BAR_H, (BAR_W - 2) * fraction);
    ctx.fillStyle = barColor;
    ctx.shadowColor = barColor;
    ctx.shadowBlur = 10;
    roundRect(ctx, bx + 1, by + 1, fillW, BAR_H - 2, radius - 1);
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  ctx.globalAlpha = 1;
  ctx.font = 'bold 9px "Segoe UI", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = fraction > 0.5 ? '#000' : barColor;
  ctx.fillText(isMinigun ? `🔫🔫  ×${ammo}` : `🔫  ×${ammo}`, canvas.width / 2, by + BAR_H / 2);

  ctx.restore();
}

function drawHookIndicator(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  state: GameStatePayload,
  localId: string | null
): void {
  if (!localId) return;
  const player = state.players.find((p) => p.id === localId);
  if (!player?.hasHook) return;

  const BAR_W = 200;
  const BAR_H = 14;
  const MARGIN = 14;
  const GAP = 6;
  const sprintBarY = canvas.height - MARGIN - BAR_H;
  const zapBarY = sprintBarY - BAR_H - GAP;
  const gunBarY = zapBarY - BAR_H - GAP;
  const by = gunBarY - BAR_H - GAP;
  const bx = canvas.width / 2 - BAR_W / 2;
  const radius = BAR_H / 2;
  const pulse = 0.8 + 0.2 * Math.sin(Date.now() * 0.008);

  ctx.save();
  ctx.globalAlpha = pulse;
  ctx.fillStyle = '#f59e0b';
  ctx.shadowColor = '#fbbf24';
  ctx.shadowBlur = 14;
  roundRect(ctx, bx, by, BAR_W, BAR_H, radius);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;
  ctx.font = 'bold 9px "Segoe UI", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#000';
  ctx.fillText('🪝  HOOK READY — Click to fire', canvas.width / 2, by + BAR_H / 2);
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
  if (player.magnetUntil > now) {
    effects.push({
      label: '🧲 Magnet',
      color: '#ec4899',
      remaining: (player.magnetUntil - now) / 1000,
    });
  }

  if (effects.length === 0) return;

  const PILL_W = 150;
  const PILL_H = 30;
  const GAP = 8;
  const startX = canvas.width / 2 - PILL_W / 2;
  // Leave room above the sprint bar (36px reserve at bottom)
  const startY = canvas.height - 50 - effects.length * (PILL_H + GAP);

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

const SCAM_POPUP_DURATION = 3000; // ms
const COIN_FLIP_POPUP_DURATION = 3000; // ms
const OUROBOROS_POPUP_DURATION = 4000; // ms
const OMNI_POPUP_DURATION = 4500; // ms

function drawOmniPopup(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  state: RendererState
): void {
  if (!state.omniPopup) return;

  const now = Date.now();
  const elapsed = now - state.omniPopup.startTime;

  if (elapsed > OMNI_POPUP_DURATION) {
    state.omniPopup = null;
    return;
  }

  let alpha = 1;
  if (elapsed < 250) {
    alpha = elapsed / 250;
  } else if (elapsed > OMNI_POPUP_DURATION - 700) {
    alpha = (OMNI_POPUP_DURATION - elapsed) / 700;
  }

  const scale = elapsed < 350
    ? 0.5 + 0.7 * Math.min(1, elapsed / 350)
    : 1.0 + 0.022 * Math.sin(elapsed * 0.007);

  const BOX_W = 440;
  const BOX_H = 150;
  const cx = canvas.width / 2;
  const cy = canvas.height / 2 - 80;

  // Animated rainbow border hue
  const hue = (elapsed * 0.2) % 360;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);
  ctx.translate(-cx, -cy);

  // Backdrop
  ctx.fillStyle = 'rgba(0,0,0,0.75)';
  roundRect(ctx, cx - BOX_W / 2, cy - BOX_H / 2, BOX_W, BOX_H, 20);
  ctx.fill();

  // Rainbow border
  ctx.strokeStyle = `hsl(${hue}, 100%, 60%)`;
  ctx.lineWidth = 3.5;
  ctx.shadowColor = `hsl(${hue}, 100%, 60%)`;
  ctx.shadowBlur = 28;
  roundRect(ctx, cx - BOX_W / 2, cy - BOX_H / 2, BOX_W, BOX_H, 20);
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Title with rainbow gradient
  ctx.font = 'bold 32px "Segoe UI", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const titleGrad = ctx.createLinearGradient(cx - 180, 0, cx + 180, 0);
  titleGrad.addColorStop(0, `hsl(${hue}, 100%, 65%)`);
  titleGrad.addColorStop(0.5, `hsl(${(hue + 120) % 360}, 100%, 65%)`);
  titleGrad.addColorStop(1, `hsl(${(hue + 240) % 360}, 100%, 65%)`);
  ctx.fillStyle = titleGrad;
  ctx.fillText('★ OMNIPOTENT! ★', cx, cy - 30);

  // Effects list
  ctx.font = '14px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = '#e0e0e0';
  ctx.fillText('⚡ Speed  ·  🧲 Magnet  ·  🛡️ Armor  ·  ×2 Tail  ·  +5 pts', cx, cy + 8);

  // Footnote
  ctx.font = 'italic 12px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = '#aaa';
  ctx.fillText('You have it all. For now.', cx, cy + 38);

  ctx.restore();
}

function drawOuroborosPopup(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  state: RendererState
): void {
  if (!state.ouroborosPopup) return;

  const now = Date.now();
  const elapsed = now - state.ouroborosPopup.startTime;

  if (elapsed > OUROBOROS_POPUP_DURATION) {
    state.ouroborosPopup = null;
    return;
  }

  // Fade in quickly, hold, fade out
  let alpha = 1;
  if (elapsed < 250) {
    alpha = elapsed / 250;
  } else if (elapsed > OUROBOROS_POPUP_DURATION - 700) {
    alpha = (OUROBOROS_POPUP_DURATION - elapsed) / 700;
  }

  // Pulsing scale on entry
  const scale = elapsed < 350
    ? 0.6 + 0.6 * Math.min(1, elapsed / 350)
    : 1.0 + 0.018 * Math.sin(elapsed * 0.006);

  const BOX_W = 420;
  const BOX_H = 130;
  // Anchor to top-right, above the scoreboard
  const cx = canvas.width - BOX_W / 2 - 16;
  const cy = BOX_H / 2 + 16;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);
  ctx.translate(-cx, -cy);

  // Backdrop
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  roundRect(ctx, cx - BOX_W / 2, cy - BOX_H / 2, BOX_W, BOX_H, 18);
  ctx.fill();

  // Glowing serpent-gold border
  const borderPulse = 0.7 + 0.3 * Math.sin(elapsed * 0.005);
  ctx.strokeStyle = `rgba(200, 150, 15, ${borderPulse})`;
  ctx.lineWidth = 3;
  ctx.shadowColor = '#c8960f';
  ctx.shadowBlur = 24;
  roundRect(ctx, cx - BOX_W / 2, cy - BOX_H / 2, BOX_W, BOX_H, 18);
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Main title
  ctx.font = 'bold 32px "Segoe UI", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#c8960f';
  ctx.fillText('🐍 OUROBOROS! 🐍', cx, cy - 22);

  // Subtitle
  ctx.font = '15px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = '#fde68a';
  ctx.fillText('You ate your own tail!', cx, cy + 12);

  // Footnote
  ctx.font = 'italic 12px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = '#aaa';
  ctx.fillText('An ancient and honourable way to go...', cx, cy + 40);

  ctx.restore();
}

function drawCoinFlipPopup(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  state: RendererState
): void {
  if (!state.coinFlipPopup) return;

  const now = Date.now();
  const elapsed = now - state.coinFlipPopup.startTime;

  if (elapsed > COIN_FLIP_POPUP_DURATION) {
    state.coinFlipPopup = null;
    return;
  }

  const { heads, points } = state.coinFlipPopup;

  // Fade in / hold / fade out
  let alpha = 1;
  if (elapsed < 200) {
    alpha = elapsed / 200;
  } else if (elapsed > COIN_FLIP_POPUP_DURATION - 600) {
    alpha = (COIN_FLIP_POPUP_DURATION - elapsed) / 600;
  }

  // Bounce scale on entry
  const scale = elapsed < 300 ? 0.7 + 0.45 * Math.min(1, elapsed / 300) : 1.0 + 0.015 * Math.sin(elapsed * 0.007);

  const BOX_W = 340;
  const BOX_H = 110;
  const cx = canvas.width / 2;
  const cy = canvas.height / 2 - 60;

  const accentColor = heads ? '#22c55e' : '#ef4444';
  const title = heads ? '✅ ETHICAL!' : '❌ UNETHICAL!';
  const subtitle = heads
    ? `You made good choices! +${points} points`
    : `That was a bit shady... -${points} points`;
  const footnote = heads ? '🌟 Keep it up!' : '😬 No one will notice...';

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);
  ctx.translate(-cx, -cy);

  // Backdrop
  ctx.fillStyle = 'rgba(0,0,0,0.65)';
  roundRect(ctx, cx - BOX_W / 2, cy - BOX_H / 2, BOX_W, BOX_H, 16);
  ctx.fill();

  // Colored border
  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 3;
  ctx.shadowColor = accentColor;
  ctx.shadowBlur = 20;
  roundRect(ctx, cx - BOX_W / 2, cy - BOX_H / 2, BOX_W, BOX_H, 16);
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Title
  ctx.font = 'bold 26px "Segoe UI", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = accentColor;
  ctx.fillText(title, cx, cy - 20);

  // Subtitle
  ctx.font = '15px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = '#facc15';
  ctx.fillText(subtitle, cx, cy + 12);

  // Footnote
  ctx.font = 'italic 12px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = '#aaa';
  ctx.fillText(footnote, cx, cy + 38);

  ctx.restore();
}

function drawScamPopup(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  state: RendererState
): void {
  if (!state.scamPopup) return;

  const now = Date.now();
  const elapsed = now - state.scamPopup.startTime;

  // Expire the popup
  if (elapsed > SCAM_POPUP_DURATION) {
    state.scamPopup = null;
    return;
  }

  const disguiseLabel = POWERUP_STYLE[state.scamPopup.disguisedAs]?.label ?? '?';
  const disguiseName = state.scamPopup.disguisedAs === 'speed' ? 'Speed Boost' : 'Double Tail';
  const isProtected = state.scamPopup.protected ?? false;

  // Fade in quickly, hold, then fade out
  let alpha = 1;
  if (elapsed < 200) {
    alpha = elapsed / 200; // fade in
  } else if (elapsed > SCAM_POPUP_DURATION - 600) {
    alpha = (SCAM_POPUP_DURATION - elapsed) / 600; // fade out
  }

  // Shake effect in the first 500ms
  const shakeX = elapsed < 500 ? (Math.random() - 0.5) * 6 : 0;
  const shakeY = elapsed < 500 ? (Math.random() - 0.5) * 6 : 0;

  // Scale bounce on entry
  const scale = elapsed < 300 ? 0.8 + 0.4 * Math.min(1, elapsed / 300) : 1.0 + 0.02 * Math.sin(elapsed * 0.008);

  const BOX_W = 360;
  const BOX_H = 120;
  const cx = canvas.width / 2 + shakeX;
  const cy = canvas.height / 2 - 60 + shakeY;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);
  ctx.translate(-cx, -cy);

  // Dark backdrop
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  roundRect(ctx, cx - BOX_W / 2, cy - BOX_H / 2, BOX_W, BOX_H, 16);
  ctx.fill();

  // Border color: red for scam, gold for protected
  const borderColor = isProtected ? '#d4af37' : '#ef4444';
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 3;
  ctx.shadowColor = borderColor;
  ctx.shadowBlur = 20;
  roundRect(ctx, cx - BOX_W / 2, cy - BOX_H / 2, BOX_W, BOX_H, 16);
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Main title
  ctx.font = 'bold 28px "Segoe UI", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = isProtected ? '#d4af37' : '#ef4444';
  
  if (isProtected) {
    ctx.fillText('🛡️ ARMOR PROTECTED! 🛡️', cx, cy - 18);
  } else {
    ctx.fillText('🚨 YOU\'VE BEEN SCAMMED! 🚨', cx, cy - 18);
  }

  // Subtitle
  ctx.font = '15px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = isProtected ? '#d4af37' : '#facc15';
  if (isProtected) {
    ctx.fillText(`That ${disguiseLabel} ${disguiseName} was actually  ↩ Reverse!`, cx, cy + 16);
  } else {
    ctx.fillText(`That ${disguiseLabel} ${disguiseName} was actually  ↩ Reverse!`, cx, cy + 16);
  }

  // Bottom text
  ctx.font = 'italic 12px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = '#aaa';
  ctx.fillText(isProtected ? 'Your armor saved you!' : 'Your controls are now reversed...', cx, cy + 42);

  ctx.restore();
}