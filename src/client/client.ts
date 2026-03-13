import { io, Socket } from 'socket.io-client';
import { EVENTS } from '../shared/constants';
import { GameStatePayload, ClientPlayer } from './types';
import { createRendererState, startRenderLoop } from './renderer';

// ── Colour palette ────────────────────────────────────────────────────────────
const PALETTE = [
  '#ef4444', // red
  '#3b82f6', // blue
  '#f59e0b', // amber
  '#a855f7', // purple
  '#ec4899', // pink
  '#14b8a6', // teal
  '#f97316', // orange
  '#84cc16', // lime
];

// ── DOM ───────────────────────────────────────────────────────────────────────
const joinScreen = document.getElementById('join-screen')!;
const nameInput = document.getElementById('name-input') as HTMLInputElement;
const playBtn = document.getElementById('play-btn')!;
const colorSwatches = document.getElementById('color-swatches')!;
const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const disconnectedOverlay = document.getElementById('disconnected-overlay')!;
const rejoinBtn = document.getElementById('rejoin-btn')!;

function showJoinError(msg: string): void {
  let el = document.getElementById('join-error');
  if (!el) {
    el = document.createElement('p');
    el.id = 'join-error';
    el.style.cssText = 'color:#f87171;font-size:0.85rem;text-align:center;margin-top:-8px;';
    playBtn.insertAdjacentElement('beforebegin', el);
  }
  el.textContent = msg;
};

// ── Audio / kill announcements ───────────────────────────────────────────────
const killStreaks = new Map<string, number>(); // playerId → consecutive kills
let multiKillCount = 0;
let multiKillTimer: ReturnType<typeof setTimeout> | null = null;
const MULTI_KILL_WINDOW_MS = 4000;

const MULTI_KILL_LINES = ['Double Kill', 'Multi Kill', 'Ultra Kill', 'Monster Kill', 'Ludicrous Kill', 'Holy Shit'];
const STREAK_LINES: Record<number, string> = {
  3: 'Killing Spree',
  6: 'Rampage',
  9: 'Dominating',
  12: 'Unstoppable',
  15: 'Godlike',
  20: 'Wicked Sick',
};

function speak(text: string): void {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.pitch = 0.65;
  utt.rate = 0.85;
  utt.volume = 1;
  window.speechSynthesis.speak(utt);
}

function onKill(killerId: string | null): void {
  // Multi-kill counter (any kill resets the window)
  multiKillCount++;
  if (multiKillTimer !== null) clearTimeout(multiKillTimer);
  multiKillTimer = setTimeout(() => { multiKillCount = 0; multiKillTimer = null; }, MULTI_KILL_WINDOW_MS);

  // Determine what to announce
  if (multiKillCount >= 2) {
    const idx = Math.min(multiKillCount - 2, MULTI_KILL_LINES.length - 1);
    speak(MULTI_KILL_LINES[idx]);
    return; // multi-kill takes priority
  }

  // Kill-streak announcement for the local killer
  if (killerId && killerId === rendererState.localPlayerId) {
    const streak = (killStreaks.get(killerId) ?? 0) + 1;
    killStreaks.set(killerId, streak);
    if (streak in STREAK_LINES) {
      speak(STREAK_LINES[streak]);
      return;
    }
  }

  // Default first-blood / generic
  const totalKills = [...killStreaks.values()].reduce((a, b) => a + b, 0);
  if (totalKills === 0 && multiKillCount === 1) {
    speak('First Blood');
  }
}

// ── State ─────────────────────────────────────────────────────────────────────
let selectedColor = PALETTE[0];
let socket: Socket | null = null;
const rendererState = createRendererState();

// ── Per-run stats (reset on each death) ───────────────────────────────────────
let runStats = { score: 0, tailLength: 0, foodEaten: 0, powerups: 0, distancePx: 0 };

// ── All-time bests (persisted in localStorage) ────────────────────────────────
interface AllTimeBest {
  score: number; tailLength: number; foodEaten: number;
  powerups: number; distancePx: number; deaths: number;
}
const ALL_TIME_KEY = 'snakealot_best';
function loadBests(): AllTimeBest {
  try {
    const raw = localStorage.getItem(ALL_TIME_KEY);
    if (raw) return { score: 0, tailLength: 0, foodEaten: 0, powerups: 0, distancePx: 0, deaths: 0, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return { score: 0, tailLength: 0, foodEaten: 0, powerups: 0, distancePx: 0, deaths: 0 };
}
function saveBests(b: AllTimeBest): void {
  try { localStorage.setItem(ALL_TIME_KEY, JSON.stringify(b)); } catch { /* ignore */ }
}
let allTimeBest = loadBests();
let sessionDeaths = 0;

// Track previous local player state for delta detection
let prevScore = 0;
let prevPrevPos: { x: number; y: number } | null = null;
let prevHasHelmet = false;
let prevPowerupTimestamps = { speed: 0, reverse: 0, magnet: 0 };

function updateStatsFromState(state: GameStatePayload, localId: string): void {
  const p = state.players.find((pl) => pl.id === localId);
  if (!p) return;

  // Peak score this run
  if (p.score > runStats.score) runStats.score = p.score;

  // Longest tail this run
  if (p.tail.length > runStats.tailLength) runStats.tailLength = p.tail.length;

  // Food eaten: score went up by exactly 1
  const scoreDelta = p.score - prevScore;
  if (scoreDelta === 1) runStats.foodEaten += 1;

  // Powerups with buff timestamps (speed, reverse, magnet)
  const pows = prevPowerupTimestamps;
  if (p.speedBoostUntil > pows.speed)   { runStats.powerups++; pows.speed   = p.speedBoostUntil; }
  if (p.reversedUntil   > pows.reverse) { runStats.powerups++; pows.reverse = p.reversedUntil; }
  if (p.magnetUntil     > pows.magnet)  { runStats.powerups++; pows.magnet  = p.magnetUntil; }

  // double-tail: score doubled (scoreDelta > 1 and equals prevScore)
  if (prevScore > 0 && scoreDelta === prevScore) runStats.powerups++;

  // helmet pickup: didn't have one, now has one
  if (!prevHasHelmet && p.hasHelmet) runStats.powerups++;
  prevHasHelmet = p.hasHelmet;

  prevScore = p.score;

  // Distance: accumulate position deltas between state ticks
  if (!p.stunned && prevPrevPos) {
    const dx = p.x - prevPrevPos.x;
    const dy = p.y - prevPrevPos.y;
    runStats.distancePx += Math.sqrt(dx * dx + dy * dy);
  }
  prevPrevPos = p.stunned ? null : { x: p.x, y: p.y };
}

function setEl(id: string, value: string): void {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function showDeathCard(): void {
  const players = rendererState.latestState?.players ?? [];

  // Determine new all-time records before updating bests
  const newRecord = {
    score:    runStats.score     > allTimeBest.score,
    tail:     runStats.tailLength > allTimeBest.tailLength,
    food:     runStats.foodEaten  > allTimeBest.foodEaten,
    powerups: runStats.powerups   > allTimeBest.powerups,
    distance: runStats.distancePx > allTimeBest.distancePx,
  };
  if (newRecord.score)    allTimeBest.score      = runStats.score;
  if (newRecord.tail)     allTimeBest.tailLength  = runStats.tailLength;
  if (newRecord.food)     allTimeBest.foodEaten   = runStats.foodEaten;
  if (newRecord.powerups) allTimeBest.powerups    = runStats.powerups;
  if (newRecord.distance) allTimeBest.distancePx  = runStats.distancePx;
  allTimeBest.deaths++;
  saveBests(allTimeBest);

  // "This Run" column
  setEl('run-score',    String(runStats.score));
  setEl('run-tail',     String(runStats.tailLength));
  setEl('run-food',     String(runStats.foodEaten));
  setEl('run-powerups', String(runStats.powerups));
  setEl('run-distance', (runStats.distancePx / 1000).toFixed(1));

  // "Best Ever" column (★ prefix and yellow colour for new records)
  const bestLabel = (val: number | string, isNew: boolean) => (isNew ? '★ ' : '') + String(val);
  setEl('best-score',    bestLabel(allTimeBest.score, newRecord.score));
  setEl('best-tail',     bestLabel(allTimeBest.tailLength, newRecord.tail));
  setEl('best-food',     bestLabel(allTimeBest.foodEaten, newRecord.food));
  setEl('best-powerups', bestLabel(allTimeBest.powerups, newRecord.powerups));
  setEl('best-distance', bestLabel((allTimeBest.distancePx / 1000).toFixed(1), newRecord.distance));

  (['score', 'tail', 'food', 'powerups', 'distance'] as const).forEach((key) => {
    const el = document.getElementById(`best-${key}`);
    if (el) el.classList.toggle('new-record', newRecord[key]);
  });

  // Deaths summary
  setEl('stat-deaths',         String(sessionDeaths));
  setEl('stat-alltime-deaths', String(allTimeBest.deaths));

  // Leaders derived from current game state (score and tail only — both visible in state)
  const topByScore = players.reduce<ClientPlayer | null>(
    (best, p) => (!best || p.score > best.score ? p : best), null
  );
  const topByTail = players.reduce<ClientPlayer | null>(
    (best, p) => (!best || p.tail.length > best.tail.length ? p : best), null
  );

  const setLeader = (elId: string, player: ClientPlayer | null, val: string) => {
    const el = document.getElementById(elId);
    if (!el) return;
    el.textContent = '';
    if (!player) { el.textContent = '—'; return; }
    const dot = document.createElement('span');
    dot.className = 'ldot';
    dot.style.background = player.color;
    const nameSpan = document.createElement('span');
    nameSpan.textContent = player.name;
    const valSpan = document.createElement('span');
    valSpan.textContent = val;
    valSpan.style.cssText = 'margin-left:4px;color:#facc15;font-weight:700';
    el.append(dot, nameSpan, valSpan);
  };

  setLeader('leader-score', topByScore, topByScore ? String(topByScore.score) : '');
  setLeader('leader-tail',  topByTail,  topByTail  ? String(topByTail.tail.length)  : '');

  // Top player banner (overall leader by score)
  if (topByScore) {
    (document.getElementById('top-player-dot')!   as HTMLElement).style.background = topByScore.color;
    (document.getElementById('top-player-name')!  ).textContent = topByScore.name;
    (document.getElementById('top-player-score')! ).textContent = String(topByScore.score) + ' pts';
  }

  const card = document.getElementById('death-card')!;
  card.classList.add('visible');
  const dismiss = () => {
    card.classList.remove('visible');
    card.removeEventListener('click', dismiss);
  };
  card.addEventListener('click', dismiss);
}

// ── Build colour swatches ─────────────────────────────────────────────────────
PALETTE.forEach((color) => {
  const swatch = document.createElement('div');
  swatch.className = 'swatch' + (color === selectedColor ? ' selected' : '');
  swatch.style.backgroundColor = color;
  swatch.addEventListener('click', () => {
    selectedColor = color;
    document.querySelectorAll('.swatch').forEach((el) => el.classList.remove('selected'));
    swatch.classList.add('selected');
  });
  colorSwatches.appendChild(swatch);
});

// ── Join flow ─────────────────────────────────────────────────────────────────
function startGame(name: string, color: string): void {
  socket = io();

  socket.on('connect', () => {
    socket!.emit(EVENTS.JOIN, { name, color });
  });

  socket.on('error', (err: { message: string }) => {
    showJoinError(err.message ?? 'Could not join. Please try again.');
    joinScreen.classList.remove('hidden');
    canvas.classList.remove('visible');
  });

  socket.on(EVENTS.JOINED, (payload: { playerId: string; gameState: GameStatePayload }) => {
    rendererState.localPlayerId = payload.playerId;
    rendererState.latestState = payload.gameState;
    rendererState.prevState = payload.gameState;
    rendererState.lastStateTime = Date.now();

    // Snap camera to spawn position so there's no fly-in on join
    const self = payload.gameState.players.find((p) => p.id === payload.playerId);
    if (self) {
      rendererState.camera.x = self.x;
      rendererState.camera.y = self.y;
    }

    // Show canvas, hide join screen
    joinScreen.classList.add('hidden');
    canvas.classList.add('visible');
    disconnectedOverlay.classList.remove('visible');

    // Show HUD toggles
    const toggleScoreboard = document.getElementById('toggle-scoreboard')!;
    const toggleMinimap = document.getElementById('toggle-minimap')!;
    toggleScoreboard.classList.add('visible');
    toggleMinimap.classList.add('visible');

    toggleScoreboard.addEventListener('click', () => {
      rendererState.scoreboardCollapsed = !rendererState.scoreboardCollapsed;
      toggleScoreboard.textContent = rendererState.scoreboardCollapsed ? 'SCORES ▾' : 'SCORES ▴';
    });

    toggleMinimap.addEventListener('click', () => {
      rendererState.minimapCollapsed = !rendererState.minimapCollapsed;
      toggleMinimap.textContent = rendererState.minimapCollapsed ? 'MAP ▾' : 'MAP ▴';
    });

    startRenderLoop(canvas, rendererState);
    setupInput();
  });

  socket.on(EVENTS.STATE, (state: GameStatePayload) => {
    rendererState.prevState = rendererState.latestState;
    rendererState.latestState = state;
    rendererState.lastStateTime = Date.now();
    if (rendererState.localPlayerId) {
      updateStatsFromState(state, rendererState.localPlayerId);
    }
  });

  socket.on('scammed', (data: { disguisedAs: string }) => {
    rendererState.scamPopup = {
      startTime: Date.now(),
      disguisedAs: data.disguisedAs,
    };
  });

  socket.on('helmet-protected', (data: { disguisedAs: string }) => {
    rendererState.scamPopup = {
      startTime: Date.now(),
      disguisedAs: data.disguisedAs,
      protected: true,
    };
  });

  socket.on('coin-flip-result', (data: { heads: boolean; points: number }) => {
    rendererState.coinFlipPopup = {
      startTime: Date.now(),
      heads: data.heads,
      points: data.points,
    };
  });

  socket.on('ouroboros', () => {
    rendererState.ouroborosPopup = { startTime: Date.now() };
  });

  socket.on('omni-collected', () => {
    rendererState.omniPopup = { startTime: Date.now() };
  });

  socket.on('zap-fired', (data: { shooterId: string; targetId: string }) => {
    // Spawn electric spark burst at the target's current position
    const target = rendererState.latestState?.players.find((p) => p.id === data.targetId);
    if (target) {
      for (let i = 0; i < 14; i++) {
        const angle = (i / 14) * Math.PI * 2;
        const speed = 120 + Math.random() * 180;
        rendererState.particles.push({
          x: target.x,
          y: target.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 500,
          maxLife: 500,
          size: 3 + Math.random() * 4,
          color: Math.random() > 0.5 ? '#60a5fa' : '#ffffff',
          type: 'star',
        });
      }
    }
  });

  socket.on('bullet-hit', (data: { bulletId: number; targetId: string; x: number; y: number }) => {
    // Spawn red spark burst at the bullet impact position
    for (let i = 0; i < 10; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 100 + Math.random() * 200;
      rendererState.particles.push({
        x: data.x,
        y: data.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 400,
        maxLife: 400,
        size: 3 + Math.random() * 4,
        color: Math.random() > 0.4 ? '#ef4444' : '#fbbf24',
        type: 'star',
      });
    }
  });

  socket.on('icbm-explosion', (data: { x: number; y: number; radius: number; fizzle: boolean }) => {
    // Big explosion burst — orange/white fireball
    const count = data.fizzle ? 18 : 40;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.4;
      const speed = 80 + Math.random() * (data.radius * 1.4);
      rendererState.particles.push({
        x: data.x,
        y: data.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: data.fizzle ? 600 : 1000,
        maxLife: data.fizzle ? 600 : 1000,
        size: data.fizzle ? 3 + Math.random() * 5 : 5 + Math.random() * 10,
        color: (() => {
          const r = Math.random();
          if (r < 0.4) return '#ff4500';
          if (r < 0.7) return '#fbbf24';
          if (r < 0.85) return '#ffffff';
          return '#22d3ee';
        })(),
        type: 'star',
      });
    }
    // Smoke ring
    if (!data.fizzle) {
      for (let i = 0; i < 10; i++) {
        const angle = Math.random() * Math.PI * 2;
        rendererState.particles.push({
          x: data.x,
          y: data.y,
          vx: Math.cos(angle) * (40 + Math.random() * 60),
          vy: Math.sin(angle) * (40 + Math.random() * 60) - 30,
          life: 1400,
          maxLife: 1400,
          size: 14 + Math.random() * 18,
          color: 'rgba(150, 150, 150, 0.5)',
          type: 'smoke',
        });
      }
    }
  });

  socket.on('stunned', (data: { playerId: string; killerId: string | null }) => {
    // Reset the dead player's streak
    killStreaks.delete(data.playerId);

    // Announce the kill
    onKill(data.killerId);

    if (data.playerId === rendererState.localPlayerId) {
      sessionDeaths++;
      prevScore = 0;
      showDeathCard();
      // Reset run stats for the next life
      runStats = { score: 0, tailLength: 0, foodEaten: 0, powerups: 0, distancePx: 0 };
      prevPrevPos = null;
      prevHasHelmet = false;
      prevPowerupTimestamps = { speed: 0, reverse: 0, magnet: 0 };
    }
  });

  socket.on('disconnect', () => {
    disconnectedOverlay.classList.add('visible');
  });
}

playBtn.addEventListener('click', () => {
  const name = nameInput.value.trim();
  if (!name) {
    nameInput.focus();
    return;
  }
  startGame(name, selectedColor);
});

nameInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') playBtn.click();
});

rejoinBtn.addEventListener('click', () => {
  location.reload();
});

// ── Input handling ────────────────────────────────────────────────────────────
const keys = { up: false, down: false, left: false, right: false, sprint: false };

function setupInput(): void {
  window.addEventListener('keydown', onKey);
  window.addEventListener('keyup', onKey);
  canvas.addEventListener('click', onCanvasClick);
  if ('ontouchstart' in window) setupMobileControls();
}

function onCanvasClick(e: MouseEvent): void {
  if (!socket || !rendererState.localPlayerId) return;
  const localPlayer = rendererState.latestState?.players.find(
    (p) => p.id === rendererState.localPlayerId
  );
  if (!localPlayer?.hasHook) return;
  const rect = canvas.getBoundingClientRect();
  const screenX = (e.clientX - rect.left) * (canvas.width / rect.width);
  const screenY = (e.clientY - rect.top) * (canvas.height / rect.height);
  const worldX = screenX - canvas.width / 2 + rendererState.camera.x;
  const worldY = screenY - canvas.height / 2 + rendererState.camera.y;
  const angle = Math.atan2(worldY - localPlayer.y, worldX - localPlayer.x);
  socket.emit('hook-fire', { angle });
}

function onKey(e: KeyboardEvent): void {
  if (!socket) return;
  const pressed = e.type === 'keydown';
  let changed = false;

  // Prevent page scrolling on WASD / Space
  if (['w', 'a', 's', 'd', ' '].includes(e.key.toLowerCase())) {
    e.preventDefault();
  }

  switch (e.key.toLowerCase()) {
    case 'w': case 'arrowup':    if (keys.up    !== pressed) { keys.up    = pressed; changed = true; } break;
    case 's': case 'arrowdown':  if (keys.down  !== pressed) { keys.down  = pressed; changed = true; } break;
    case 'a': case 'arrowleft':  if (keys.left  !== pressed) { keys.left  = pressed; changed = true; } break;
    case 'd': case 'arrowright': if (keys.right !== pressed) { keys.right = pressed; changed = true; } break;
    case ' ':                    if (keys.sprint !== pressed) { keys.sprint = pressed; changed = true; } break;
  }

  if (changed) {
    socket.emit(EVENTS.INPUT, { ...keys });
  }
}

function setupMobileControls(): void {
  const controls = document.getElementById('mobile-controls')!;
  const zone = document.getElementById('joystick-zone')!;
  const ring = document.getElementById('joystick-ring')!;
  const nub = document.getElementById('joystick-nub')!;
  const sprintBtn = document.getElementById('sprint-btn-mobile')!;

  controls.classList.add('visible');

  const MAX_RADIUS = 50;
  const THRESHOLD = MAX_RADIUS * 0.28;
  let activeTouchId: number | null = null;
  let originX = 0;
  let originY = 0;

  function applyJoystick(dx: number, dy: number): void {
    const dist = Math.sqrt(dx * dx + dy * dy);
    const clamp = Math.min(dist, MAX_RADIUS);
    const angle = Math.atan2(dy, dx);
    nub.style.transform = `translate(calc(-50% + ${Math.cos(angle) * clamp}px), calc(-50% + ${Math.sin(angle) * clamp}px))`;

    const newUp    = dy < -THRESHOLD;
    const newDown  = dy > THRESHOLD;
    const newLeft  = dx < -THRESHOLD;
    const newRight = dx > THRESHOLD;

    let changed = false;
    if (keys.up    !== newUp)    { keys.up    = newUp;    changed = true; }
    if (keys.down  !== newDown)  { keys.down  = newDown;  changed = true; }
    if (keys.left  !== newLeft)  { keys.left  = newLeft;  changed = true; }
    if (keys.right !== newRight) { keys.right = newRight; changed = true; }
    if (changed && socket) socket.emit(EVENTS.INPUT, { ...keys });
  }

  function clearJoystick(): void {
    ring.style.display = 'none';
    nub.style.transform = 'translate(-50%, -50%)';
    activeTouchId = null;
    let changed = false;
    if (keys.up)    { keys.up    = false; changed = true; }
    if (keys.down)  { keys.down  = false; changed = true; }
    if (keys.left)  { keys.left  = false; changed = true; }
    if (keys.right) { keys.right = false; changed = true; }
    if (changed && socket) socket.emit(EVENTS.INPUT, { ...keys });
  }

  zone.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (activeTouchId !== null) return;
    const touch = e.changedTouches[0];
    activeTouchId = touch.identifier;
    originX = touch.clientX;
    originY = touch.clientY;
    ring.style.display = 'block';
    ring.style.left = `${originX}px`;
    ring.style.top = `${originY}px`;
    applyJoystick(0, 0);
  }, { passive: false });

  zone.addEventListener('touchmove', (e) => {
    e.preventDefault();
    for (const touch of Array.from(e.changedTouches)) {
      if (touch.identifier === activeTouchId) {
        applyJoystick(touch.clientX - originX, touch.clientY - originY);
      }
    }
  }, { passive: false });

  zone.addEventListener('touchend', (e) => {
    e.preventDefault();
    for (const touch of Array.from(e.changedTouches)) {
      if (touch.identifier === activeTouchId) clearJoystick();
    }
  }, { passive: false });

  zone.addEventListener('touchcancel', () => clearJoystick());

  sprintBtn.addEventListener('touchstart', (e) => {
    e.preventDefault();
    keys.sprint = true;
    sprintBtn.classList.add('active');
    if (socket) socket.emit(EVENTS.INPUT, { ...keys });
  }, { passive: false });

  sprintBtn.addEventListener('touchend', (e) => {
    e.preventDefault();
    keys.sprint = false;
    sprintBtn.classList.remove('active');
    if (socket) socket.emit(EVENTS.INPUT, { ...keys });
  }, { passive: false });

  sprintBtn.addEventListener('touchcancel', () => {
    keys.sprint = false;
    sprintBtn.classList.remove('active');
    if (socket) socket.emit(EVENTS.INPUT, { ...keys });
  });
}
