import React, { useState } from 'react';
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

function App() {
  const [auth, setAuth] = useState({
    playerID: null,
    credentials: null,
    roomID: null,
  });

  const routerBasename = process.env.PUBLIC_URL || '';

  return (
    <div className="App">
      <div className="page-bg" aria-hidden="true" />
      <img className="school-crest" src={crest} alt="英華小學校徽" />
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
