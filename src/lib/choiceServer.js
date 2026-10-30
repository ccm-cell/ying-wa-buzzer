const CHOICES = ['A', 'B', 'C'];
const SECONDS = [10, 15, 20];
const TICK_MS = 1000;

function createRoom() {
  return {
    mode: 'buzz',
    seconds: null,
    round: 0,
    startAt: null,
    answers: {},
  };
}

function deadlineFor(room) {
  if (room.startAt == null || !room.seconds) {
    return null;
  }
  return room.startAt + room.seconds * 1000;
}

function view(room) {
  return {
    type: 'state',
    mode: room.mode,
    seconds: room.seconds,
    round: room.round,
    startAt: room.startAt,
    deadline: deadlineFor(room),
    answers: room.answers,
    serverNow: Date.now(),
  };
}

function readMetadata(db, gameID) {
  const result = db.fetch(gameID, { metadata: true });
  if (result && typeof result.then === 'function') {
    return result.then((value) => value && value.metadata);
  }
  return Promise.resolve(result && result.metadata);
}

function hostPlayerId(metadata) {
  if (!metadata || !metadata.players) {
    return null;
  }
  const connected = Object.values(metadata.players)
    .filter((player) => player && player.name && player.connected)
    .sort((a, b) => Number(a.id) - Number(b.id));
  if (!connected.length) {
    return null;
  }
  return String(connected[0].id);
}

function playerRecord(metadata, playerID) {
  if (!metadata || !metadata.players) {
    return null;
  }
  return metadata.players[playerID] || null;
}

function safeGameId(value) {
  return typeof value === 'string' && /^[A-Za-z0-9]{4,12}$/.test(value);
}

/**
 * Adds the `mc` socket message. The game server stores each room's
 * multiple-choice round and stamps every countdown with its own clock.
 */
export function attachChoiceServer(app) {
  if (!app._io) {
    throw new Error('Socket.IO is not attached');
  }

  const nsp = app._io.of('buzzer');
  const rooms = new Map();

  function roomFor(gameID) {
    let room = rooms.get(gameID);
    if (!room) {
      room = createRoom();
      rooms.set(gameID, room);
    }
    return room;
  }

  function broadcast(gameID) {
    const room = rooms.get(gameID);
    if (!room) {
      return;
    }
    nsp.to(gameID).emit('mc', view(room));
  }

  setInterval(() => {
    const now = Date.now();
    rooms.forEach((room, gameID) => {
      const deadline = deadlineFor(room);
      if (deadline == null || now > deadline + 1000) {
        return;
      }
      nsp.to(gameID).emit('mc', {
        type: 'tick',
        serverNow: now,
        round: room.round,
        deadline,
      });
    });
  }, TICK_MS);

  nsp.on('connection', (socket) => {
    socket.on('mc', async (msg) => {
      try {
        if (!msg || typeof msg !== 'object') {
          return;
        }
        if (msg.type === 'ping') {
          socket.emit('mc', {
            type: 'pong',
            id: msg.id,
            serverNow: Date.now(),
          });
          return;
        }
        if (!safeGameId(msg.gameID)) {
          return;
        }

        const gameID = msg.gameID.toUpperCase();
        const metadata = await readMetadata(app.context.db, gameID);
        if (!metadata) {
          socket.emit('mc', { type: 'error', message: 'room' });
          return;
        }

        if (msg.type === 'hello') {
          const playerID = String(msg.playerID);
          const player = playerRecord(metadata, playerID);
          if (
            !player ||
            !msg.credentials ||
            player.credentials !== msg.credentials
          ) {
            socket.emit('mc', { type: 'error', message: 'unauthorized' });
            return;
          }
          socket.ywpsAuth = { gameID, playerID };
          socket.join(gameID);
          socket.emit('mc', view(roomFor(gameID)));
          return;
        }

        const auth = socket.ywpsAuth;
        if (!auth || auth.gameID !== gameID) {
          socket.emit('mc', { type: 'error', message: 'hello' });
          return;
        }

        const room = roomFor(gameID);
        const isHost = hostPlayerId(metadata) === auth.playerID;

        if (msg.type === 'mode') {
          if (!isHost || (msg.mode !== 'buzz' && msg.mode !== 'choice')) {
            return;
          }
          if (room.mode !== msg.mode) {
            room.mode = msg.mode;
            broadcast(gameID);
          }
          return;
        }

        if (msg.type === 'seconds') {
          if (
            !isHost ||
            room.seconds != null ||
            !SECONDS.includes(msg.seconds)
          ) {
            return;
          }
          room.seconds = msg.seconds;
          broadcast(gameID);
          return;
        }

        if (msg.type === 'unlock') {
          if (!isHost || !room.seconds) {
            return;
          }
          const deadline = deadlineFor(room);
          if (deadline != null && Date.now() < deadline) {
            return;
          }
          room.round += 1;
          room.startAt = Date.now();
          room.answers = {};
          broadcast(gameID);
          return;
        }

        if (msg.type === 'choice') {
          if (room.mode !== 'choice' || !CHOICES.includes(msg.choice)) {
            return;
          }
          if (msg.round !== room.round) {
            return;
          }
          const deadline = deadlineFor(room);
          const now = Date.now();
          if (deadline == null || now >= deadline) {
            return;
          }
          const previous = room.answers[auth.playerID];
          if (previous && previous.choice === msg.choice) {
            return;
          }
          room.answers = {
            ...room.answers,
            [auth.playerID]: { choice: msg.choice, at: now },
          };
          broadcast(gameID);
        }
      } catch (error) {
        console.error('choice message failed', error);
      }
    });
  });
}
