// Where the game looks for its StrongBow game server. Priority:
//   1. what the player typed on the title screen (saved in localStorage)
//   2. VITE_GAME_SERVER_URL from .env (build-time default)
//   3. ws://localhost:8080
// This lets you ship ONE client build and have each friend point it at the host.

const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env ?? {};

const DEFAULT_SERVER_URL: string = env.VITE_GAME_SERVER_URL || 'ws://localhost:8080';
const LS_KEY = 'sb_server_url';

export const MULTIPLAYER_ENABLED: boolean = env.VITE_MULTIPLAYER !== '0';

/** The server URL the client should connect to (player override wins). */
export function getServerUrl(): string {
  try {
    return localStorage.getItem(LS_KEY) || DEFAULT_SERVER_URL;
  } catch {
    return DEFAULT_SERVER_URL;
  }
}

/** Persist the player's chosen server address (empty clears the override). */
export function setServerUrl(url: string): void {
  try {
    const v = (url || '').trim();
    if (v) localStorage.setItem(LS_KEY, v);
    else localStorage.removeItem(LS_KEY);
  } catch {
    /* localStorage unavailable — fall back to the default */
  }
}
