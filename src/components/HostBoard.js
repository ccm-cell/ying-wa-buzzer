import React, { useEffect, useState } from 'react';
import { TEAM_LETTERS } from '../lib/teams';

const EMPTY_SCORES = { A: 0, B: 0, C: 0, D: 0, E: 0 };
const PRESETS = [10, 30, 60];

function readScores(roomId) {
  try {
    const saved = JSON.parse(localStorage.getItem(`ywps-scores-${roomId}`));
    if (
      saved &&
      TEAM_LETTERS.every((team) => Number.isFinite(Number(saved[team])))
    ) {
      return TEAM_LETTERS.reduce((scores, team) => {
        scores[team] = Math.max(0, Number(saved[team]));
        return scores;
      }, {});
    }
  } catch (error) {
    // A damaged saved scoreboard should not block the host screen.
    return { ...EMPTY_SCORES };
  }
  return { ...EMPTY_SCORES };
}

export default function HostBoard({ roomId }) {
  const [scores, setScores] = useState(() => readScores(roomId));
  const [duration, setDuration] = useState(30);
  const [left, setLeft] = useState(30);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    localStorage.setItem(`ywps-scores-${roomId}`, JSON.stringify(scores));
  }, [roomId, scores]);

  useEffect(() => {
    if (!running) {
      return undefined;
    }
    if (left <= 0) {
      setRunning(false);
      return undefined;
    }
    const timer = setTimeout(() => setLeft((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [running, left]);

  const chooseDuration = (seconds) => {
    setRunning(false);
    setDuration(seconds);
    setLeft(seconds);
  };

  const toggleRun = () => {
    if (running) {
      setRunning(false);
      return;
    }
    if (left <= 0) {
      setLeft(duration);
    }
    setRunning(true);
  };

  const adjust = (team, delta) => {
    setScores((prev) => ({
      ...prev,
      [team]: Math.max(0, prev[team] + delta),
    }));
  };

  const remain = duration > 0 ? (left / duration) * 100 : 0;

  return (
    <div className="host-board">
      <section className="timer-card" aria-label="計時">
        <h2>計時</h2>
        <div
          className={`clock-face${left === 0 ? ' done' : ''}`}
          style={{ '--remain': `${remain}%` }}
        >
          <strong>{left}</strong>
        </div>
        <div className="timer-actions">
          {PRESETS.map((seconds) => (
            <button
              key={seconds}
              type="button"
              className={seconds === duration ? 'selected' : ''}
              onClick={() => chooseDuration(seconds)}
            >
              {seconds}秒
            </button>
          ))}
        </div>
        <div className="timer-actions">
          <button type="button" onClick={toggleRun}>
            {running ? '暫停' : '開始'}
          </button>
          <button type="button" onClick={() => chooseDuration(duration)}>
            重設
          </button>
        </div>
      </section>
      <section className="scoreboard" aria-label="班際計分">
        <h2>班際計分</h2>
        <ul>
          {TEAM_LETTERS.map((team) => (
            <li key={team} className={`lane lane-${team}`}>
              <span className="lane-name">{team}班</span>
              <span className="lane-score">{scores[team]}</span>
              <span className="lane-actions">
                <button
                  type="button"
                  onClick={() => adjust(team, 1)}
                  aria-label={`${team}班加一分`}
                >
                  +
                </button>
                <button
                  type="button"
                  onClick={() => adjust(team, -1)}
                  aria-label={`${team}班減一分`}
                >
                  −
                </button>
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
