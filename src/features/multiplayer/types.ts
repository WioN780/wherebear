export type GameMode = "CLASSIC" | "INFINITE" | "COUNTRY";
export type Difficulty = "easy" | "medium" | "hard";
export type RoomStateLabel =
  | "Lobby"
  | "Starting"
  | "InRound"
  | "RoundReview"
  | "GameComplete";

export interface Player {
  id: string;
  username: string;
  image: string | null;
  isOnline: boolean;
  isHost: boolean;
  isReady: boolean;
  score: number;
  lastGuess: { lat: number; lng: number } | null;
  lastDistance: number | null;
  lastScore: number | null;
  hasGuessed: boolean;
}

export interface RoomConfig {
  mode: GameMode;
  difficulty: Difficulty;
  maxPlayers: number;
  totalRounds: number;
  roundDuration: number; // in seconds: 10, 30, 60, 120
  country: string | null; // Selected ISO country code for COUNTRY mode
}

export interface GameLocation {
  id: string;
  lat: number;
  lng: number;
  panoId: string | null;
  heading: number | null;
  country: string;
  subdivision: string | null;
  surface: string | null;
  elevation: number | null;
  difficulty: string;
}

export interface RoomState {
  roomId: string;
  inviteCode: string;
  hostPlayerId: string;
  isPrivate: boolean;
  state: RoomStateLabel;
  config: RoomConfig;
  players: Player[];
  createdAt: number;
  currentRound: number;
  timer: number; // Current timer countdown in seconds
  // The single location for the active round. Null in Lobby/Starting/GameComplete.
  // The server never sends future locations, so clients cannot read ahead.
  currentLocation: GameLocation | null;
}

// Presence Types
export interface FriendPresence {
  userId: string;
  username: string;
  image: string | null;
  isOnline: boolean;
}

// WebSocket Event Names. These must stay in lockstep with the Go backend's
// pkg/protocol/events.go constants.
export const WsEvents = {
  // Client → Server
  ROOM_CREATE: "ROOM_CREATE",
  ROOM_JOIN: "ROOM_JOIN",
  ROOM_LEAVE: "ROOM_LEAVE",
  ROOM_UPDATE: "ROOM_UPDATE",
  ROOM_KICK: "ROOM_KICK",
  GAME_START_SIGNAL: "GAME_START_SIGNAL",
  SUBMIT_GUESS: "SUBMIT_GUESS",
  FRIEND_REQUEST_SEND: "FRIEND_REQUEST_SEND",
  FRIEND_REQUEST_RESPOND: "FRIEND_REQUEST_RESPOND",
  QUICK_MATCH: "QUICK_MATCH",

  // Server → Client
  ROOM_STATE_UPDATE: "ROOM_STATE_UPDATE",
  ROOM_DESTROYED: "ROOM_DESTROYED",
  ROOM_KICKED: "ROOM_KICKED",
  ROUND_START: "ROUND_START",
  ROUND_END: "ROUND_END",
  TIMER_UPDATE: "TIMER_UPDATE",
  GUESS_CONFIRM: "GUESS_CONFIRM",
  PRESENCE_CHANGE: "PRESENCE_CHANGE",
  FRIEND_REQUEST_RECEIVED: "FRIEND_REQUEST_RECEIVED",
  FRIEND_LIST_UPDATE: "FRIEND_LIST_UPDATE",
  ERROR: "ERROR",
  SUCCESS: "SUCCESS",
  LEFT_CONFIRM: "LEFT_CONFIRM",
} as const;

export type WsEventType = (typeof WsEvents)[keyof typeof WsEvents];

export interface WsMessage<T = any> {
  type: WsEventType | string;
  payload: T;
}
