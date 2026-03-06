import http from 'http';
import path from 'path';
import express from 'express';
import { Server } from 'socket.io';
import { EVENTS, CONFIG } from '../shared/constants';
import { ServerPlayer, JoinPayload, InputState } from './types';
import { startGame, createPlayer, serializeState } from './game';

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

// Serve client files
app.use(express.static(path.join(__dirname, '../../public')));

const players = new Map<string, ServerPlayer>();

// Start game loop
startGame(io, players);

io.on('connection', (socket) => {
  console.log(`[+] Socket connected: ${socket.id}`);

  socket.on(EVENTS.JOIN, (payload: JoinPayload) => {
    if (players.size >= CONFIG.MAX_PLAYERS) {
      socket.emit('error', { message: 'Server is full' });
      socket.disconnect();
      return;
    }

    const name = (payload.name ?? '')
      .trim()
      .replace(/[<>&"]/g, '')
      .slice(0, CONFIG.MAX_PLAYER_NAME_LENGTH);

    if (!name) {
      socket.emit('error', { message: 'Name cannot be empty' });
      socket.disconnect();
      return;
    }

    // Validate color is a hex string (#rrggbb or #rgb)
    const rawColor = typeof payload.color === 'string' ? payload.color : '#ffffff';
    const color = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(rawColor) ? rawColor : '#ffffff';

    const player = createPlayer(socket.id, name, color, players);
    players.set(socket.id, player);

    // Confirm join to the new player
    const gameState = serializeState(players, [], [], []); // foods/powerups/blackholes sent via state broadcast
    socket.emit(EVENTS.JOINED, { playerId: socket.id, gameState });

    // Notify others
    socket.broadcast.emit(EVENTS.PLAYER_JOINED, {
      id: player.id,
      name: player.name,
      color: player.color,
      x: player.position.x,
      y: player.position.y,
    });

    console.log(`[+] Player joined: ${name} (${socket.id})`);
  });

  socket.on(EVENTS.INPUT, (input: InputState) => {
    const player = players.get(socket.id);
    if (player) {
      player.input = {
        up: !!input.up,
        down: !!input.down,
        left: !!input.left,
        right: !!input.right,
        sprint: !!input.sprint,
      };
    }
  });

  socket.on('disconnect', () => {
    players.delete(socket.id);
    io.emit(EVENTS.PLAYER_LEFT, { id: socket.id });
    console.log(`[-] Player disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT ?? 3000;
server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
