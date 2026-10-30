import React, { useEffect, useRef, useState } from 'react';
import { TEAM_LETTERS, teamFromName } from '../lib/teams';

const CHOICES = ['A', 'B', 'C'];

function choiceImage(letter) {
  return `${process.env.PUBLIC_URL}/choices/${letter}.jpg`;
}

function choiceForTeam(answers, players, letter) {
  let best = null;
  players.forEach((player) => {
    if (teamFromName(player.name) !== letter) {
      return;
    }
    const answer = answers[String(player.id)];
    if (!answer) {
      return;
    }
    if (!best || answer.at >= best.at) {
      best = answer;
    }
  });
  return best;
}

function Countdown({ deadline, total, estimateServerNow }) {
  const ringRef = useRef(null);
  const [secondsLeft, setSecondsLeft] = useState(total || 0);

  useEffect(() => {
    let frame = 0;
    const loop = () => {
      const now = estimateServerNow();
      const remain =
        deadline == null || now == null
          ? total * 1000
          : Math.max(0, deadline - now);
      const portion = total ? remain / (total * 1000) : 0;
      if (ringRef.current) {
        ringRef.current.style.setProperty(
          '--p',
          String(Math.max(0, Math.min(1, portion)))
        );
      }
      const shown = Math.ceil(remain / 1000);
      setSecondsLeft((prev) => (prev === shown ? prev : shown));
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [deadline, total, estimateServerNow]);

  return (
    <div
      ref={ringRef}
      className="choice-timer"
      style={{ '--p': 1 }}
      aria-live="polite"
    >
      <span>{secondsLeft}</span>
    </div>
  );
}

export default function ChoiceBoard({
  isHost,
  players,
  playerID,
  myName,
  seconds,
  round,
  deadline,
  answers,
  estimateServerNow,
  setSeconds,
  unlock,
  choose,
}) {
  const [optimistic, setOptimistic] = useState(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOptimistic(null);
  }, [answers, round]);

  useEffect(() => {
    if (deadline == null) {
      setOpen(false);
      return undefined;
    }
    const tick = () => {
      const now = estimateServerNow();
      setOpen(now != null && now < deadline);
    };
    tick();
    const id = setInterval(tick, 100);
    return () => clearInterval(id);
  }, [deadline, estimateServerNow]);

  const myTeam = teamFromName(myName);
  const mine = myTeam
    ? choiceForTeam(answers, players, myTeam)
    : answers[String(playerID)];
  const selected =
    optimistic && optimistic.round === round
      ? optimistic.choice
      : mine && mine.choice;

  const pick = (letter) => {
    if (!open) {
      return;
    }
    setOptimistic({ round, choice: letter });
    choose(letter, round);
  };

  return (
    <div className="choice-board">
      <div className="choice-top">
        {seconds ? (
          <Countdown
            deadline={deadline}
            total={seconds}
            estimateServerNow={estimateServerNow}
          />
        ) : null}
        <div className="choice-status">
          {round > 0 ? <p className="choice-round">第 {round} 題</p> : null}
          {seconds ? (
            <p>每題 {seconds} 秒</p>
          ) : (
            <p>{isHost ? '先揀每題時限，之後全程用同一個時間。' : '請等候'}</p>
          )}
          {deadline != null && !open ? (
            <p className="choice-locked">時間到</p>
          ) : null}
        </div>
        {isHost && !seconds ? (
          <div className="choice-seconds">
            {[10, 15, 20].map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setSeconds(value)}
              >
                {value} 秒
              </button>
            ))}
          </div>
        ) : null}
        {isHost && seconds ? (
          <button type="button" disabled={open} onClick={unlock}>
            {round > 0 && !open ? '下一題' : '開始作答'}
          </button>
        ) : null}
      </div>

      {isHost ? (
        <div className="class-answers">
          {TEAM_LETTERS.map((letter) => {
            const answer = choiceForTeam(answers, players, letter);
            const joined = players.some(
              (player) => teamFromName(player.name) === letter
            );
            return (
              <div key={letter} className={`class-card team-${letter}`}>
                <p className={`class-name team-${letter}`}>{letter}班</p>
                <p className="class-choice">
                  {answer ? answer.choice : '未選'}
                </p>
                {answer ? (
                  <img src={choiceImage(answer.choice)} alt="" />
                ) : (
                  <p className="class-wait">{joined ? '等候作答' : '未加入'}</p>
                )}
              </div>
            );
          })}
        </div>
      ) : deadline == null ? (
        <p className="choice-wait">請等候</p>
      ) : (
        <div className="choice-grid">
          {CHOICES.map((letter) => (
            <button
              key={letter}
              type="button"
              className={
                selected === letter ? 'choice-card selected' : 'choice-card'
              }
              disabled={!open}
              onClick={() => pick(letter)}
            >
              <img src={choiceImage(letter)} alt={`選項 ${letter}`} />
            </button>
          ))}
        </div>
      )}

      {isHost ? (
        <div className="choice-legend">
          {CHOICES.map((letter) => (
            <img
              key={letter}
              src={choiceImage(letter)}
              alt={`選項 ${letter}`}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
