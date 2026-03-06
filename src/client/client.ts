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

// ── State ─────────────────────────────────────────────────────────────────────
let selectedColor = PALETTE[0];
let socket: Socket | null = null;
const rendererState = createRendererState();

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

    startRenderLoop(canvas, rendererState);
    setupInput();
  });

  socket.on(EVENTS.STATE, (state: GameStatePayload) => {
    rendererState.prevState = rendererState.latestState;
    rendererState.latestState = state;
    rendererState.lastStateTime = Date.now();
  });

  socket.on('scammed', (data: { disguisedAs: string }) => {
    rendererState.scamPopup = {
      startTime: Date.now(),
      disguisedAs: data.disguisedAs,
    };
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
