import React, { useEffect, useState } from 'react';
import {
  BrowserRouter as Router,
  Switch,
  Route,
  Redirect,
} from 'react-router-dom';
import { get, isNil } from 'lodash';

import Lobby from './containers/Lobby';
import Game from './containers/Game';
import crest from './assets/ywps-crest.png';
import './App.css';

function playCrestChime() {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) {
    return false;
  }
  const ctx = new AudioCtx();
  if (ctx.state === 'suspended') {
    ctx.close();
    return false;
  }
  const now = ctx.currentTime;
  [523.25, 659.25, 783.99].forEach((freq, index) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const start = now + index * 0.07;
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.07, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.32);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + 0.34);
  });
  setTimeout(() => ctx.close(), 1000);
  return true;
}

function App() {
  const [auth, setAuth] = useState({
    playerID: null,
    credentials: null,
    roomID: null,
  });

  useEffect(() => {
    const reduceMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;
    if (reduceMotion) {
      return undefined;
    }
    if (playCrestChime()) {
      return undefined;
    }
    const playOnGesture = () => {
      if (playCrestChime()) {
        window.removeEventListener('pointerdown', playOnGesture);
      }
    };
    window.addEventListener('pointerdown', playOnGesture);
    return () => window.removeEventListener('pointerdown', playOnGesture);
  }, []);

  const routerBasename = process.env.PUBLIC_URL || '';

  return (
    <div className="App">
      <div className="page-bg" aria-hidden="true" />
      <img className="school-crest crest-pop" src={crest} alt="英華小學校徽" />
      <div className="app-foreground">
        <Router basename={routerBasename}>
          <Switch>
            <Route
              path="/:id"
              render={({ location, match }) => {
                const roomID = get(match, 'params.id');
                // redirect if the roomID in auth doesn't match, or no credentials
                return roomID &&
                  auth.roomID === roomID &&
                  !isNil(auth.credentials) &&
                  !isNil(auth.playerID) ? (
                  <Game auth={auth} setAuth={setAuth} />
                ) : (
                  <Redirect
                    to={{
                      pathname: '/',
                      state: { from: location, roomID },
                    }}
                  />
                );
              }}
            />
            <Route path="/">
              <Lobby setAuth={setAuth} />
            </Route>
          </Switch>
        </Router>
      </div>
    </div>
  );
}

export default App;
