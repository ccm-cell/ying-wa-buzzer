import React, { useState, useEffect, useRef } from 'react';
import { get, some, values, sortBy, orderBy, isEmpty, round } from 'lodash';
import { Howl } from 'howler';
import { AiOutlineDisconnect } from 'react-icons/ai';
import { Container } from 'react-bootstrap';
import Header from '../components/Header';
import { CreatorCredit } from './Footer';
import ChoiceBoard from './ChoiceBoard';
import { useChoiceRoom } from './useChoiceRoom';
import birdButton from '../assets/bird-buzzer-button.jpg';
import { teamFromName, teamImageForName } from '../lib/teams';

function nameClass(name, connected) {
  const team = teamFromName(name);
  return ['name', team ? `team-${team}` : '', connected ? '' : 'dim']
    .filter(Boolean)
    .join(' ');
}

export default function Table(game) {
  const [loaded, setLoaded] = useState(false);
  const [buzzed, setBuzzer] = useState(
    some(game.G.queue, (o) => o.id === game.playerID)
  );
  const [sound, setSound] = useState(false);
  const [soundPlayed, setSoundPlayed] = useState(false);
  const [sealed, setSealed] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const buzzButton = useRef(null);
  const queueSeen = useRef(false);
  const queueWasEmpty = useRef(true);
  const lockedRef = useRef(game.G.locked);
  const winnerSeen = useRef(false);
  const lastWinner = useRef(null);
  const wasBuzzed = useRef(buzzed);
  const choice = useChoiceRoom({
    gameID: game.gameID,
    playerID: game.playerID,
    credentials: game.headerData && game.headerData.credentials,
  });

  const buzzSound = new Howl({
    src: [
      `${process.env.PUBLIC_URL}/shortBuzz.webm`,
      `${process.env.PUBLIC_URL}/shortBuzz.mp3`,
    ],
    volume: 0.5,
    rate: 1.5,
  });

  const playSound = () => {
    if (sound && !soundPlayed) {
      buzzSound.play();
      setSoundPlayed(true);
    }
  };

  useEffect(() => {
    const empty = isEmpty(game.G.queue);
    if (!game.G.queue[game.playerID]) {
      setBuzzer(false);
    }

    if (!queueSeen.current) {
      queueSeen.current = true;
      queueWasEmpty.current = empty;
    } else if (!queueWasEmpty.current && empty) {
      queueWasEmpty.current = true;
      setSealed(true);
    } else {
      queueWasEmpty.current = empty;
    }

    const first = sortBy(values(game.G.queue), ['timestamp'])[0];
    const firstId = first ? first.id : null;
    if (!winnerSeen.current) {
      winnerSeen.current = true;
      lastWinner.current = firstId;
    } else if (firstId && firstId !== lastWinner.current) {
      lastWinner.current = firstId;
      setCelebrate(true);
    } else if (!firstId) {
      lastWinner.current = null;
    }

    if (empty) {
      setSoundPlayed(false);
    } else if (loaded) {
      playSound();
    }

    if (!loaded) {
      setLoaded(true);
    }
    // Queue changes are the only trigger; the other values are read inside.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.G.queue]);

  useEffect(() => {
    if (!celebrate) {
      return undefined;
    }
    const timer = setTimeout(() => setCelebrate(false), 3200);
    return () => clearTimeout(timer);
  }, [celebrate]);

  useEffect(() => {
    if (lockedRef.current && !game.G.locked) {
      setSealed(false);
    }
    lockedRef.current = game.G.locked;
  }, [game.G.locked]);

  useEffect(() => {
    if (!wasBuzzed.current && buzzed) {
      setConfirmed(true);
      const timer = setTimeout(() => setConfirmed(false), 1400);
      wasBuzzed.current = true;
      return () => clearTimeout(timer);
    }
    wasBuzzed.current = buzzed;
    if (!buzzed) {
      setConfirmed(false);
    }
    return undefined;
  }, [buzzed]);

  const held = buzzed || game.G.locked || sealed;

  const attemptBuzz = () => {
    if (!held) {
      playSound();
      game.moves.buzz(game.playerID);
      setBuzzer(true);
    }
  };

  const resetAll = () => {
    setSealed(true);
    game.moves.resetBuzzers();
    if (!game.G.locked) {
      game.moves.toggleLock();
    }
  };

  const onCrest = () => {
    if (sealed && !game.G.locked) {
      return;
    }
    if (game.G.locked) {
      setSealed(false);
      game.moves.toggleLock();
      return;
    }
    game.moves.toggleLock();
  };

  // spacebar will buzz
  useEffect(() => {
    function onKeydown(e) {
      if (e.keyCode === 32 && !e.repeat && buzzButton.current) {
        buzzButton.current.click();
        e.preventDefault();
      }
    }
    window.addEventListener('keydown', onKeydown);
    return () => window.removeEventListener('keydown', onKeydown);
  }, []);

  const players = !game.gameMetadata
    ? []
    : game.gameMetadata
        .filter((p) => p.name)
        .map((p) => ({ ...p, id: String(p.id) }));
  // host is lowest active user
  const firstPlayer =
    get(
      sortBy(players, (p) => parseInt(p.id, 10)).filter((p) => p.connected),
      '0'
    ) || null;
  const isHost = get(firstPlayer, 'id') === game.playerID;
  const myName = get(
    players.find((player) => player.id === String(game.playerID)),
    'name'
  );
  const choiceMode = choice.mode === 'choice';

  const queue = sortBy(values(game.G.queue), ['timestamp']);
  const buzzedPlayers = queue
    .map((p) => {
      const player = players.find((player) => player.id === p.id);
      if (!player) {
        return {};
      }
      return {
        ...p,
        name: player.name,
        connected: player.connected,
      };
    })
    .filter((p) => p.name);
  // active players who haven't buzzed
  const activePlayers = orderBy(
    players.filter((p) => !some(queue, (q) => q.id === p.id)),
    ['connected', 'name'],
    ['desc', 'asc']
  );

  const timeDisplay = (delta) => {
    if (delta > 1000) {
      return `+${round(delta / 1000, 2)} s`;
    }
    return `+${delta} ms`;
  };

  const winner = buzzedPlayers[0];
  const winnerImage = isHost && winner ? teamImageForName(winner.name) : null;

  const sparks = Array.from({ length: 32 }, (_, index) => index);

  return (
    <div>
      {celebrate ? (
        <div className="celebrate" aria-hidden="true">
          <div className="gold-flash" />
          {sparks.map((spark) => (
            <span
              key={spark}
              className="spark"
              style={{
                '--a': `${spark * 11.25}deg`,
                '--d': `${(spark % 8) * 0.07}s`,
                '--dist': `${260 + (spark % 4) * 110}px`,
              }}
            />
          ))}
        </div>
      ) : null}
      <Header
        auth={game.headerData}
        clearAuth={() =>
          game.headerData.setAuth({
            playerID: null,
            credentials: null,
            roomID: null,
          })
        }
        sound={sound}
        setSound={() => setSound(!sound)}
      />
      {isHost ? (
        <div className="host-toolbar">
          <button
            type="button"
            className={!choiceMode ? 'is-on' : ''}
            onClick={() => choice.setMode('buzz')}
          >
            搶答
          </button>
          <button
            type="button"
            className={choiceMode ? 'is-on' : ''}
            onClick={() => choice.setMode('choice')}
          >
            選擇題
          </button>
          {choiceMode ? null : (
            <button type="button" onClick={onCrest}>
              {game.G.locked || sealed ? '解開' : '鎖上'}
            </button>
          )}
          {choiceMode ? null : (
            <button
              type="button"
              disabled={isEmpty(game.G.queue)}
              onClick={resetAll}
            >
              Reset all buzzers
            </button>
          )}
        </div>
      ) : null}
      <Container className={isHost ? 'with-toolbar' : ''}>
        <section>
          <p id="room-title">Room {game.gameID}</p>
          {!game.isConnected ? (
            <p className="warning">Disconnected - attempting to reconnect...</p>
          ) : null}
          {isHost && choice.status === 'unavailable' ? (
            <p className="warning">選擇題同步未連上。搶答仍然可用。</p>
          ) : null}
          {choiceMode ? (
            <ChoiceBoard
              isHost={isHost}
              players={players}
              playerID={game.playerID}
              myName={myName}
              seconds={choice.seconds}
              round={choice.round}
              deadline={choice.deadline}
              answers={choice.answers}
              estimateServerNow={choice.estimateServerNow}
              setSeconds={choice.setSeconds}
              unlock={choice.unlock}
              choose={choice.choose}
            />
          ) : (
            <div id="buzzer">
              {winnerImage ? (
                <img
                  className="winner-image"
                  src={winnerImage}
                  alt={`${winner.name} 搶答成功`}
                />
              ) : (
                <button
                  ref={buzzButton}
                  className={confirmed ? 'buzz-confirmed' : ''}
                  disabled={held}
                  onClick={() => {
                    if (!held) {
                      attemptBuzz();
                    }
                  }}
                >
                  <img className="bird-face" src={birdButton} alt="" />
                  <span className="buzz-label">
                    {game.G.locked || sealed
                      ? 'Locked'
                      : buzzed
                      ? 'Buzzed'
                      : 'Buzz'}
                  </span>
                  {confirmed ? (
                    <span className="buzz-confirm">求之不得</span>
                  ) : null}
                </button>
              )}
            </div>
          )}
        </section>
        {choiceMode ? null : (
          <div className="player-board">
            <div className="queue">
              <p>Players Buzzed</p>
              <ul>
                {buzzedPlayers.map(({ id, name, timestamp, connected }, i) => (
                  <li key={id} className={isHost ? 'resettable' : null}>
                    <div
                      className="player-sign"
                      onClick={() => {
                        if (isHost) {
                          game.moves.resetBuzzer(id);
                        }
                      }}
                    >
                      <div className={nameClass(name, connected)}>
                        {name}
                        {!connected ? (
                          <AiOutlineDisconnect className="disconnected" />
                        ) : (
                          ''
                        )}
                      </div>
                      {i > 0 ? (
                        <div className="mini">
                          {timeDisplay(timestamp - queue[0].timestamp)}
                        </div>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            <div className="queue">
              <p>Other Players</p>
              <ul>
                {activePlayers.map(({ id, name, connected }) => (
                  <li key={id}>
                    <div className={nameClass(name, connected)}>
                      {name}
                      {!connected ? (
                        <AiOutlineDisconnect className="disconnected" />
                      ) : (
                        ''
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </Container>
      <CreatorCredit />
    </div>
  );
}
