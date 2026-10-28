import axios from 'axios';
import { Buzzer } from '../lib/store';

axios.defaults.headers['Content-Type'] = 'application/json';
axios.defaults.headers['Accept'] = 'application/json';

const OFFICIAL_SERVER = 'https://www.multibuzz.app';
const configuredServer = process.env.REACT_APP_GAME_SERVER;

const hostname = window.location.hostname;
const port = window.location.port;
const protocol = window.location.protocol;
const gameport = process.env.PORT || 4001;
const url = protocol + '//' + hostname + (port ? ':' + port : '');
const localUrl = `${protocol}//${hostname}:${gameport}`;

const hostedOnGitHubPages = hostname.endsWith('.github.io');
const productionServer = configuredServer
  ? configuredServer.replace(/\/$/, '')
  : hostedOnGitHubPages
  ? OFFICIAL_SERVER
  : url;

const LOBBY_SERVER =
  process.env.NODE_ENV === 'production' ? productionServer : localUrl;
export const GAME_SERVER =
  process.env.NODE_ENV === 'production' ? productionServer : localUrl;

export async function getRoom(roomId) {
  // convert to uppercase
  const cleanRoomId = roomId.toUpperCase();
  try {
    const response = await axios.get(
      `${LOBBY_SERVER}/games/${Buzzer.name}/${cleanRoomId}`
    );
    return response;
  } catch (error) {
    if (error.response) {
      return error.response;
    } else {
      return { status: 500 };
    }
  }
}

export async function createRoom() {
  try {
    const response = axios.post(`${LOBBY_SERVER}/games/${Buzzer.name}/create`, {
      numPlayers: 200,
    });
    return response;
  } catch (error) {
    if (error.response) {
      return error.response;
    } else {
      return { status: 500 };
    }
  }
}

export async function joinRoom(roomID, playerID, playerName) {
  try {
    const response = axios.post(
      `${LOBBY_SERVER}/games/${Buzzer.name}/${roomID}/join`,
      {
        playerID,
        playerName,
      }
    );
    return response;
  } catch (error) {
    if (error.response) {
      return error.response;
    } else {
      return { status: 500 };
    }
  }
}

export async function leaveRoom(roomID, playerID, credentials) {
  try {
    const response = axios.post(
      `${LOBBY_SERVER}/games/${Buzzer.name}/${roomID}/leave`,
      {
        playerID,
        credentials,
      }
    );
    return response;
  } catch (error) {
    if (error.response) {
      return error.response;
    } else {
      return { status: 500 };
    }
  }
}
