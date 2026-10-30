import { useCallback, useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';
import { GAME_SERVER } from '../lib/endpoints';

const INITIAL = {
  mode: 'buzz',
  seconds: null,
  round: 0,
  startAt: null,
  deadline: null,
  answers: {},
  serverNow: null,
};

export function useChoiceRoom({ gameID, playerID, credentials }) {
  const [snapshot, setSnapshot] = useState(INITIAL);
  const [status, setStatus] = useState('connecting');
  const clockRef = useRef({ serverNow: 0, perf: 0, ready: false });
  const socketRef = useRef(null);
  const credRef = useRef({ gameID, playerID, credentials });
  credRef.current = { gameID, playerID, credentials };

  const applyStamp = useCallback((serverNow, rtt = 0) => {
    if (typeof serverNow !== 'number') {
      return;
    }
    clockRef.current = {
      serverNow: serverNow + rtt / 2,
      perf: performance.now(),
      ready: true,
    };
  }, []);

  const estimateServerNow = useCallback(() => {
    const clock = clockRef.current;
    if (!clock.ready) {
      return null;
    }
    return clock.serverNow + (performance.now() - clock.perf);
  }, []);

  useEffect(() => {
    if (!gameID || playerID == null || playerID === '' || !credentials) {
      return undefined;
    }

    const server = String(GAME_SERVER || '').replace(/\/$/, '');
    const socket = io(`${server}/buzzer`, {
      transports: ['websocket', 'polling'],
    });
    socketRef.current = socket;
    const pings = new Map();

    const hello = () => {
      const cred = credRef.current;
      socket.emit('mc', {
        type: 'hello',
        gameID: cred.gameID,
        playerID: String(cred.playerID),
        credentials: cred.credentials,
      });
    };

    const ping = () => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      pings.set(id, performance.now());
      socket.emit('mc', { type: 'ping', id });
    };

    socket.on('mc', (msg) => {
      if (!msg || typeof msg !== 'object') {
        return;
      }
      if (msg.type === 'pong') {
        const sent = pings.get(msg.id);
        pings.delete(msg.id);
        const rtt = sent == null ? null : performance.now() - sent;
        if (rtt != null && rtt < 1500) {
          applyStamp(msg.serverNow, rtt);
        }
        return;
      }
      if (msg.type === 'tick') {
        if (!clockRef.current.ready) {
          applyStamp(msg.serverNow);
        }
        return;
      }
      if (msg.type === 'state') {
        if (!clockRef.current.ready) {
          applyStamp(msg.serverNow);
        }
        setStatus('live');
        setSnapshot({
          mode: msg.mode === 'choice' ? 'choice' : 'buzz',
          seconds: msg.seconds == null ? null : msg.seconds,
          round: msg.round || 0,
          startAt: msg.startAt == null ? null : msg.startAt,
          deadline: msg.deadline == null ? null : msg.deadline,
          answers: msg.answers || {},
          serverNow: msg.serverNow,
        });
      }
    });

    socket.on('connect', () => {
      hello();
      ping();
    });
    if (socket.connected) {
      hello();
      ping();
    }

    const pingTimer = setInterval(ping, 2000);
    const giveUp = setTimeout(() => {
      setStatus((current) => (current === 'live' ? current : 'unavailable'));
    }, 2500);

    return () => {
      clearInterval(pingTimer);
      clearTimeout(giveUp);
      socket.close();
      socketRef.current = null;
    };
  }, [gameID, playerID, credentials, applyStamp]);

  const send = useCallback((type, extra) => {
    const socket = socketRef.current;
    const cred = credRef.current;
    if (!socket) {
      return;
    }
    socket.emit('mc', {
      type,
      gameID: cred.gameID,
      playerID: String(cred.playerID),
      credentials: cred.credentials,
      ...extra,
    });
  }, []);

  const setMode = useCallback((mode) => send('mode', { mode }), [send]);
  const setSeconds = useCallback(
    (seconds) => send('seconds', { seconds }),
    [send]
  );
  const unlock = useCallback(() => send('unlock'), [send]);
  const choose = useCallback(
    (choice, round) => send('choice', { choice, round }),
    [send]
  );

  return {
    ...snapshot,
    status,
    estimateServerNow,
    setMode,
    setSeconds,
    unlock,
    choose,
  };
}
