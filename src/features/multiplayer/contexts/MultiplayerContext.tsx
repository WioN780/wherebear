"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import {
  RoomState,
  RoomConfig,
  FriendPresence,
  FriendRequest,
  WsEvents,
  WsMessage,
} from "../types";

interface MultiplayerContextProps {
  room: RoomState | null;
  friendList: FriendPresence[];
  pendingRequests: FriendRequest[];
  matchAbandoned: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  createRoom: (config: RoomConfig, isPrivate: boolean) => void;
  joinRoom: (inviteCode: string) => void;
  leaveRoom: () => void;
  updateRoomConfig: (config: RoomConfig) => void;
  updateRoomPrivacy: (isPrivate: boolean) => void;
  kickPlayer: (targetPlayerId: string) => void;
  startGame: () => void;
  quickMatch: (difficulty?: string) => void;
  submitGuess: (lat: number, lng: number) => void;
  sendFriendRequest: (receiverEmailOrName: string) => void;
  respondFriendRequest: (
    requestId: string,
    action: "ACCEPT" | "DECLINE",
  ) => void;
  clearMatchAbandoned: () => void;

  // Timer subscription details
  serverTimer: number;
  registerTimerElement: (element: HTMLSpanElement | null) => void;
  currentUserId: string;
}

const MultiplayerContext = createContext<MultiplayerContextProps | undefined>(
  undefined,
);

export const useMultiplayer = () => {
  const context = useContext(MultiplayerContext);
  if (!context) {
    throw new Error("useMultiplayer must be used within a MultiplayerProvider");
  }
  return context;
};

interface MultiplayerProviderProps {
  children: React.ReactNode;
  userId: string | null;
}

export const MultiplayerProvider: React.FC<MultiplayerProviderProps> = ({
  children,
  userId,
}) => {
  const [room, setRoom] = useState<RoomState | null>(null);
  const [friendList, setFriendList] = useState<FriendPresence[]>([]);
  const [pendingRequests, setPendingRequests] = useState<FriendRequest[]>([]);
  const [matchAbandoned, setMatchAbandoned] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [serverTimer, setServerTimer] = useState(0);

  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectDelayRef = useRef(1000); // start with 1s reconnect delay
  const isLeavingRef = useRef(false);

  // Timer Ref for Direct DOM mutation to bypass React renders
  const timerElementRef = useRef<HTMLSpanElement | null>(null);
  const localTimerRef = useRef<number>(0);
  const lastSyncRef = useRef<number>(0);

  const registerTimerElement = useCallback(
    (element: HTMLSpanElement | null) => {
      timerElementRef.current = element;
    },
    [],
  );

  // Use a ref to the connect function to allow recursive calls in onclose without declaration issues
  const connectRef = useRef<() => void>(() => {});

  // Update timer directly in DOM using requestAnimationFrame
  useEffect(() => {
    let animationFrameId: number;

    const tick = () => {
      const element = timerElementRef.current;
      if (element) {
        const elapsed = (performance.now() - lastSyncRef.current) / 1000;
        const currentLocalTime = Math.max(
          0,
          Math.ceil(localTimerRef.current - elapsed),
        );

        // Render timer text directly bypassing React state update re-renders
        element.textContent = `${currentLocalTime}s`;
      }
      animationFrameId = requestAnimationFrame(tick);
    };

    animationFrameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  // Setup WS Connection
  const connect = useCallback(() => {
    if (socketRef.current || !userId) return;

    setIsConnecting(true);
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const isLocal =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1";
    // Target backend port 8080 specifically for WebSocket
    const wsHost = isLocal
      ? `${window.location.hostname}:8080`
      : window.location.host;

    const wsUrl = `${protocol}//${wsHost}/api/ws`;
    const ws = new WebSocket(wsUrl);
    socketRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      setIsConnecting(false);
      reconnectDelayRef.current = 1000; // Reset reconnect delay
      console.log("Multiplayer WebSocket connected.");

      // If we got disconnected during gameplay, re-sync/join if we had a code
      const savedCode = sessionStorage.getItem("wherebear_active_room_code");
      if (savedCode && !isLeavingRef.current) {
        ws.send(
          JSON.stringify({
            type: WsEvents.ROOM_JOIN,
            payload: { inviteCode: savedCode },
          }),
        );
      }
    };

    ws.onmessage = (event) => {
      try {
        const message: WsMessage = JSON.parse(event.data);
        const { type, payload } = message;

        switch (type) {
          case WsEvents.ROOM_STATE_UPDATE:
            setRoom(payload);
            if (payload.inviteCode) {
              sessionStorage.setItem(
                "wherebear_active_room_code",
                payload.inviteCode,
              );
            }
            // Sync timer
            setServerTimer(payload.timer);
            localTimerRef.current = payload.timer;
            lastSyncRef.current = performance.now();
            break;

          case WsEvents.ROUND_START:
            // Sync new round location and timer
            setServerTimer(payload.timer);
            localTimerRef.current = payload.timer;
            lastSyncRef.current = performance.now();
            break;

          case WsEvents.ROUND_END:
            // Sync round end timer
            setServerTimer(payload.timer);
            localTimerRef.current = payload.timer;
            lastSyncRef.current = performance.now();
            break;

          case WsEvents.TIMER_UPDATE:
            localTimerRef.current = payload.timer;
            lastSyncRef.current = performance.now();
            break;

          case WsEvents.FRIEND_LIST_UPDATE:
            setFriendList(payload);
            break;

          case WsEvents.PRESENCE_CHANGE:
            setFriendList((prev) => {
              const list = prev.filter((f) => f.userId !== payload.userId);
              list.push(payload);
              return list.sort((a, b) => a.username.localeCompare(b.username));
            });
            break;

          case WsEvents.FRIEND_REQUEST_RECEIVED:
            setPendingRequests((prev) => {
              // Deduplicate by requestId
              if (prev.some((r) => r.requestId === payload.requestId)) return prev;
              return [...prev, {
                requestId: payload.requestId,
                senderId: payload.senderId,
                senderName: payload.senderName,
                senderImage: payload.senderImage || "",
              }];
            });
            break;

          case WsEvents.PENDING_REQUESTS:
            setPendingRequests(
              (payload.requests || []).map((r: { requestId: string; senderId: string; senderName: string; senderImage: string }) => ({
                requestId: r.requestId,
                senderId: r.senderId,
                senderName: r.senderName,
                senderImage: r.senderImage || "",
              })),
            );
            break;

          case WsEvents.MATCH_ABANDONED:
            // Keep the room reference so MultiplayerGame stays mounted to show the overlay.
            // clearMatchAbandoned() will clear both state fields when user dismisses.
            sessionStorage.removeItem("wherebear_active_room_code");
            setMatchAbandoned(payload.reason || "Your opponent left the match.");
            break;

          case WsEvents.ROOM_DESTROYED:
          case WsEvents.LEFT_CONFIRM:
            setRoom(null);
            sessionStorage.removeItem("wherebear_active_room_code");
            break;

          case WsEvents.ROOM_KICKED:
            setRoom(null);
            sessionStorage.removeItem("wherebear_active_room_code");
            alert("You have been kicked from the room.");
            break;

          case WsEvents.ERROR:
            if (
              payload.message &&
              (payload.message.includes("room not found") ||
                payload.message.includes("invalid session") ||
                payload.message.includes("not found"))
            ) {
              // Silently handle invalid session / stale room on page entry/reconnect
              sessionStorage.removeItem("wherebear_active_room_code");
              setRoom(null);
              console.warn(
                "Silent clean of room session state:",
                payload.message,
              );
            } else {
              alert(payload.message || "An error occurred.");
            }
            break;

          case WsEvents.SUCCESS:
            console.log("Success message received:", payload.message);
            break;
        }
      } catch (err) {
        console.error("Error processing websocket payload:", err);
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      setIsConnecting(false);
      socketRef.current = null;
      console.log("Multiplayer WebSocket disconnected.");

      // Attempt auto-reconnect if not explicitly leaving
      if (!isLeavingRef.current) {
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log(`Reconnecting in ${reconnectDelayRef.current}ms...`);
          connectRef.current();
          reconnectDelayRef.current = Math.min(
            reconnectDelayRef.current * 2,
            30000,
          ); // Exponential backoff max 30s
        }, reconnectDelayRef.current);
      }
    };

    ws.onerror = (err) => {
      console.error("WebSocket connection error:", err);
      ws.close();
    };
  }, [userId]);

  // Keep connectRef up to date
  useEffect(() => {
    connectRef.current = connect;
  }, [connect]);

  // Connect on mount
  useEffect(() => {
    isLeavingRef.current = false;
    connect();

    return () => {
      isLeavingRef.current = true;
      if (reconnectTimeoutRef.current)
        clearTimeout(reconnectTimeoutRef.current);
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [connect]);

  // -------------------------------------------------------------
  // CLIENT ACTIONS
  // -------------------------------------------------------------

  const sendMessage = useCallback((type: string, payload: any) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type, payload }));
    } else {
      console.warn("Cannot send message, WebSocket is not open.");
    }
  }, []);

  const createRoom = useCallback(
    (config: RoomConfig, isPrivate: boolean) => {
      isLeavingRef.current = false;
      sendMessage(WsEvents.ROOM_CREATE, { config, isPrivate });
    },
    [sendMessage],
  );

  const joinRoom = useCallback(
    (inviteCode: string) => {
      isLeavingRef.current = false;
      sendMessage(WsEvents.ROOM_JOIN, { inviteCode });
    },
    [sendMessage],
  );

  const leaveRoom = useCallback(() => {
    isLeavingRef.current = true;
    sendMessage(WsEvents.ROOM_LEAVE, {});
    setRoom(null);
    sessionStorage.removeItem("wherebear_active_room_code");
  }, [sendMessage]);

  const updateRoomConfig = useCallback(
    (config: RoomConfig) => {
      sendMessage(WsEvents.ROOM_UPDATE, { config });
    },
    [sendMessage],
  );

  const updateRoomPrivacy = useCallback(
    (isPrivate: boolean) => {
      if (!room) return;
      // Privacy rides the ROOM_UPDATE event alongside the (unchanged) config.
      sendMessage(WsEvents.ROOM_UPDATE, { config: room.config, isPrivate });
    },
    [sendMessage, room],
  );

  const kickPlayer = useCallback(
    (targetPlayerId: string) => {
      sendMessage(WsEvents.ROOM_KICK, { targetPlayerId });
    },
    [sendMessage],
  );

  const startGame = useCallback(() => {
    sendMessage(WsEvents.GAME_START_SIGNAL, {});
  }, [sendMessage]);

  const quickMatch = useCallback(
    (difficulty?: string) => {
      isLeavingRef.current = false;
      sendMessage(WsEvents.QUICK_MATCH, { difficulty: difficulty || "medium" });
    },
    [sendMessage],
  );

  const submitGuess = useCallback(
    (lat: number, lng: number) => {
      sendMessage(WsEvents.SUBMIT_GUESS, { lat, lng });
    },
    [sendMessage],
  );

  const sendFriendRequest = useCallback(
    (receiverEmailOrName: string) => {
      sendMessage(WsEvents.FRIEND_REQUEST_SEND, { receiverEmailOrName });
    },
    [sendMessage],
  );

  const respondFriendRequest = useCallback(
    (requestId: string, action: "ACCEPT" | "DECLINE") => {
      sendMessage(WsEvents.FRIEND_REQUEST_RESPOND, { requestId, action });
      // Optimistically remove the request so the UI clears immediately
      setPendingRequests((prev) => prev.filter((r) => r.requestId !== requestId));
    },
    [sendMessage],
  );

  const clearMatchAbandoned = useCallback(() => {
    setMatchAbandoned(null);
    setRoom(null);
  }, []);

  return (
    <MultiplayerContext.Provider
      value={{
        room,
        friendList,
        pendingRequests,
        matchAbandoned,
        isConnected,
        isConnecting,
        createRoom,
        joinRoom,
        leaveRoom,
        updateRoomConfig,
        updateRoomPrivacy,
        kickPlayer,
        startGame,
        quickMatch,
        submitGuess,
        sendFriendRequest,
        respondFriendRequest,
        clearMatchAbandoned,
        serverTimer,
        registerTimerElement,
        currentUserId: userId || "",
      }}
    >
      {children}
    </MultiplayerContext.Provider>
  );
};
