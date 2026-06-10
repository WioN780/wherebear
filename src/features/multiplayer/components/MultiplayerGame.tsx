"use client";

import React, { useState, useEffect } from "react";
import { useMultiplayer } from "../contexts/MultiplayerContext";
import { MultiplayerLobby } from "./MultiplayerLobby";
import { MultiplayerMapPicker } from "./MultiplayerMapPicker";
import { StreetViewContainer } from "@/features/game/components/StreetViewContainer";
import { GlassCard } from "@/shared/components/GlassCard";
import { GlassButton } from "@/shared/components/GlassButton";
import { FloatingPanel } from "@/shared/components/FloatingPanel";
import { getCountryName } from "@/shared/lib/countries";
import { RoomConfig, GameMode, Difficulty } from "../types";
import {
  Compass,
  ArrowLeft,
  Globe,
  MapPin,
  Trophy,
  Plus,
  UserPlus,
  Users,
  Sparkles,
  Clock,
  UserX,
  Check,
  X,
  Bell,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface MultiplayerGameProps {
  userId: string | null;
  onExit: () => void;
}

export const MultiplayerGame: React.FC<MultiplayerGameProps> = ({
  userId,
  onExit,
}) => {
  const {
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
    currentUserId,
  } = useMultiplayer();

  const [inviteCodeInput, setInviteCodeInput] = useState("");
  const [friendEmailInput, setFriendEmailInput] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [quickMatchDifficulty, setQuickMatchDifficulty] =
    useState<Difficulty>("medium");

  const [localGuess, setLocalGuess] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [hasSubmittedLocalGuess, setHasSubmittedLocalGuess] = useState(false);

  const [newRoomConfig, setNewRoomConfig] = useState<RoomConfig>({
    mode: "CLASSIC",
    difficulty: "medium",
    maxPlayers: 5,
    totalRounds: 5,
    roundDuration: 60,
    country: null,
  });

  const currentRoundNumber = room?.currentRound || 1;
  const roomStateLabel = room?.state || "Lobby";

  useEffect(() => {
    queueMicrotask(() => {
      setLocalGuess(null);
      setHasSubmittedLocalGuess(false);
      if (room) {
        setIsSearching(false);
        setIsCreating(false);
      }
    });
  }, [currentRoundNumber, roomStateLabel, room]);

  const handleQuickMatch = () => {
    if (isSearching) return;
    setIsSearching(true);
    quickMatch(quickMatchDifficulty);
    setTimeout(() => setIsSearching(false), 10000);
  };

  const handleGuessSelect = (lat: number, lng: number) => {
    if (hasSubmittedLocalGuess) return;
    let normalizedLng = lng % 360;
    if (normalizedLng > 180) normalizedLng -= 360;
    if (normalizedLng < -180) normalizedLng += 360;
    setLocalGuess({ lat, lng: normalizedLng });
  };

  const handleSubmitGuessClick = () => {
    if (!localGuess || hasSubmittedLocalGuess) return;
    submitGuess(localGuess.lat, localGuess.lng);
    setHasSubmittedLocalGuess(true);
  };

  // ----------------------------------------------------------------
  // MATCH ABANDONED OVERLAY
  // ----------------------------------------------------------------
  if (matchAbandoned) {
    return (
      <div className="relative min-h-screen bg-zinc-950 flex flex-col items-center justify-center py-12 px-4 select-none">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-rose-500/5 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-10 right-1/4 w-[500px] h-[500px] bg-red-500/5 rounded-full blur-[120px] pointer-events-none" />
        <GlassCard className="p-10 text-center border-red-500/20 max-w-sm w-full flex flex-col items-center gap-5 bg-zinc-950/70 relative z-10 shadow-2xl">
          <div className="w-14 h-14 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl flex items-center justify-center">
            <UserX size={28} />
          </div>
          <div className="flex flex-col gap-2">
            <h2 className="text-base font-black text-white uppercase tracking-wider">
              Match Ended
            </h2>
            <p className="text-sm text-zinc-400 leading-relaxed">
              {matchAbandoned}
            </p>
          </div>
          <GlassButton
            onClick={clearMatchAbandoned}
            variant="primary"
            className="py-2.5 px-8 text-xs w-full"
          >
            Back to Lobby
          </GlassButton>
        </GlassCard>
      </div>
    );
  }

  // ----------------------------------------------------------------
  // 1. SELECT ROOM / CREATE / JOIN & SOCIAL SCREEN
  // ----------------------------------------------------------------
  if (!room) {
    return (
      <div className="w-full max-w-4xl flex flex-col gap-6 select-none relative z-10">
        <div className="grid md:grid-cols-3 gap-6">
          {/* Main Join/Create Panel */}
          <div className="md:col-span-2 flex flex-col gap-4">
            <AnimatePresence mode="wait">
              {isCreating ? (
                <motion.div
                  key="create-room"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="flex flex-col gap-4"
                >
                  <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-widest px-1">
                    Configure Room
                  </h2>

                  <GlassCard className="p-6 border-white/10 flex flex-col gap-5 bg-zinc-950/50">
                    {/* Mode */}
                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                        Game Mode
                      </label>
                      <div className="grid grid-cols-3 gap-1.5">
                        {(["CLASSIC", "INFINITE", "COUNTRY"] as GameMode[]).map(
                          (mode) => (
                            <button
                              key={mode}
                              onClick={() =>
                                setNewRoomConfig((prev) => ({ ...prev, mode }))
                              }
                              className={`py-2 text-[10px] font-bold rounded-lg border transition-all cursor-pointer ${
                                newRoomConfig.mode === mode
                                  ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-400"
                                  : "bg-zinc-900 border-white/5 text-zinc-400 hover:text-zinc-200"
                              }`}
                            >
                              {mode === "CLASSIC"
                                ? "Classic"
                                : mode === "INFINITE"
                                  ? "Infinite"
                                  : "Country"}
                            </button>
                          ),
                        )}
                      </div>
                    </div>

                    {/* Difficulty */}
                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                        Difficulty
                      </label>
                      <div className="grid grid-cols-3 gap-1.5">
                        {(["easy", "medium", "hard"] as Difficulty[]).map(
                          (dif) => (
                            <button
                              key={dif}
                              onClick={() =>
                                setNewRoomConfig((prev) => ({
                                  ...prev,
                                  difficulty: dif,
                                }))
                              }
                              className={`py-2 text-[10px] font-bold rounded-lg border transition-all cursor-pointer capitalize ${
                                newRoomConfig.difficulty === dif
                                  ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-400"
                                  : "bg-zinc-900 border-white/5 text-zinc-400 hover:text-zinc-200"
                              }`}
                            >
                              {dif}
                            </button>
                          ),
                        )}
                      </div>
                    </div>

                    {/* Rounds */}
                    {newRoomConfig.mode !== "INFINITE" && (
                      <div className="flex flex-col gap-2">
                        <div className="flex justify-between text-xs font-bold text-zinc-400 uppercase tracking-wider">
                          <span>Rounds</span>
                          <span className="text-white font-mono">
                            {newRoomConfig.totalRounds}
                          </span>
                        </div>
                        <input
                          type="range"
                          min="1"
                          max="10"
                          value={newRoomConfig.totalRounds}
                          onChange={(e) =>
                            setNewRoomConfig((prev) => ({
                              ...prev,
                              totalRounds: parseInt(e.target.value),
                            }))
                          }
                          className="w-full accent-indigo-500 bg-zinc-900 h-1.5 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>
                    )}

                    {/* Duration */}
                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                        Round Duration
                      </label>
                      <div className="grid grid-cols-4 gap-1.5">
                        {[10, 30, 60, 120].map((time) => (
                          <button
                            key={time}
                            onClick={() =>
                              setNewRoomConfig((prev) => ({
                                ...prev,
                                roundDuration: time,
                              }))
                            }
                            className={`py-2 text-[10px] font-bold rounded-lg border transition-all cursor-pointer ${
                              newRoomConfig.roundDuration === time
                                ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-400"
                                : "bg-zinc-900 border-white/5 text-zinc-400 hover:text-zinc-200"
                            }`}
                          >
                            {time}s
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mt-2">
                      <GlassButton
                        onClick={() => createRoom(newRoomConfig, false)}
                        variant="primary"
                        className="flex-grow py-3"
                      >
                        <Plus size={16} />
                        <span>Create Room</span>
                      </GlassButton>
                      <GlassButton
                        onClick={() => setIsCreating(false)}
                        variant="secondary"
                        className="py-3 px-4"
                      >
                        Cancel
                      </GlassButton>
                    </div>
                  </GlassCard>
                </motion.div>
              ) : (
                <motion.div
                  key="lobby-selection"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="flex flex-col gap-5"
                >
                  <GlassCard
                    className={`p-6 border-indigo-500/20 bg-indigo-500/5 transition-all flex flex-col gap-4 ${isSearching || !isConnected ? "opacity-80" : ""}`}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex flex-col gap-1">
                        <h3 className="text-sm font-bold text-white flex items-center gap-2">
                          <Sparkles
                            size={16}
                            className={`text-indigo-400 ${isSearching || isConnecting ? "animate-spin" : ""}`}
                          />
                          {isSearching
                            ? "Searching for Match..."
                            : !isConnected
                              ? "Connecting to Servers..."
                              : "Quick Match"}
                        </h3>
                        <p className="text-xs text-zinc-500">
                          {isSearching
                            ? "Contacting matchmaking servers to find an open lobby..."
                            : !isConnected
                              ? "Establishing secure connection to game clusters..."
                              : "Instantly join the first available public room matching your preferred difficulty."}
                        </p>
                      </div>
                      <div className="w-10 h-10 bg-indigo-500/10 border border-indigo-500/30 rounded-xl flex items-center justify-center text-indigo-400 flex-shrink-0">
                        {isSearching || isConnecting ? (
                          <div className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Compass size={20} />
                        )}
                      </div>
                    </div>

                    {!isSearching && isConnected && (
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-3 border-t border-white/5">
                        <div className="flex items-center gap-3 w-full sm:w-auto">
                          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex-shrink-0">
                            Difficulty:
                          </span>
                          <div className="flex bg-zinc-900 border border-white/5 rounded-lg p-0.5">
                            {(["easy", "medium", "hard"] as Difficulty[]).map(
                              (dif) => {
                                const isSelected = quickMatchDifficulty === dif;
                                let colorClass =
                                  "text-zinc-500 hover:text-zinc-300 border border-transparent";
                                if (isSelected) {
                                  if (dif === "easy") {
                                    colorClass =
                                      "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30";
                                  } else if (dif === "medium") {
                                    colorClass =
                                      "bg-amber-500/20 text-amber-300 border border-amber-500/30";
                                  } else {
                                    colorClass =
                                      "bg-rose-500/20 text-rose-300 border border-rose-500/30";
                                  }
                                }
                                return (
                                  <button
                                    key={dif}
                                    onClick={() => setQuickMatchDifficulty(dif)}
                                    className={`px-2.5 py-1 text-[9px] font-bold rounded-md transition-all cursor-pointer capitalize ${colorClass}`}
                                  >
                                    {dif}
                                  </button>
                                );
                              },
                            )}
                          </div>
                        </div>
                        <GlassButton
                          onClick={handleQuickMatch}
                          size="sm"
                          variant="primary"
                          className="w-full sm:w-auto font-bold tracking-wide"
                        >
                          Find Match
                        </GlassButton>
                      </div>
                    )}
                  </GlassCard>

                  <div className="flex items-center gap-3">
                    <div className="flex-grow h-[1px] bg-white/5" />
                    <span className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest font-bold">
                      OR
                    </span>
                    <div className="flex-grow h-[1px] bg-white/5" />
                  </div>

                  <GlassCard className="p-6 border-white/10 bg-zinc-950/50 flex flex-col gap-4">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                      Join Private Room
                    </h3>
                    <p className="text-xs text-zinc-400">
                      Enter a 6-digit invite code below to join an existing
                      lobby with your friends.
                    </p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        maxLength={6}
                        value={inviteCodeInput}
                        onChange={(e) =>
                          setInviteCodeInput(e.target.value.toUpperCase())
                        }
                        placeholder="ENTER 6-DIGIT CODE"
                        className="flex-grow bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-center font-mono font-bold tracking-widest text-white outline-none focus:border-indigo-500/50 transition-colors uppercase"
                      />
                      <GlassButton
                        onClick={() => {
                          if (inviteCodeInput.length === 6) {
                            joinRoom(inviteCodeInput);
                          } else {
                            alert("Please enter a valid 6-character code.");
                          }
                        }}
                        variant="primary"
                        className="px-6"
                        disabled={inviteCodeInput.length !== 6}
                      >
                        Join Room
                      </GlassButton>
                    </div>
                  </GlassCard>

                  <div className="flex items-center gap-3">
                    <div className="flex-grow h-[1px] bg-white/5" />
                    <span className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest font-bold">
                      OR
                    </span>
                    <div className="flex-grow h-[1px] bg-white/5" />
                  </div>

                  <GlassCard
                    onClick={() => setIsCreating(true)}
                    className="p-6 border-white/5 hover:border-indigo-500/20 bg-zinc-950/25 hover:bg-zinc-900/10 transition-all cursor-pointer group flex items-center justify-between"
                  >
                    <div className="flex flex-col gap-1">
                      <h3 className="text-sm font-bold text-white group-hover:text-indigo-400 transition-colors">
                        Host a New Game
                      </h3>
                      <p className="text-xs text-zinc-500">
                        Configure custom settings and generate a private room
                        code to invite others.
                      </p>
                    </div>
                    <div className="w-10 h-10 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center text-zinc-400 group-hover:text-indigo-400 group-hover:border-indigo-500/30 transition-all">
                      <Plus size={20} />
                    </div>
                  </GlassCard>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Right Column - Social Presence */}
          <div className="flex flex-col gap-4">
            <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-widest px-1 flex items-center gap-1.5">
              <Users size={14} />
              Friends & Presence
              {pendingRequests.length > 0 && (
                <span className="ml-auto bg-amber-500 text-zinc-900 text-[9px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-none">
                  {pendingRequests.length}
                </span>
              )}
            </h2>

            <GlassCard className="p-4 border-white/10 bg-zinc-950/40 flex flex-col gap-4">
              {/* Add Friend Input */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider pl-0.5">
                  Add Friend
                </span>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={friendEmailInput}
                    onChange={(e) => setFriendEmailInput(e.target.value)}
                    placeholder="Username or email"
                    className="flex-grow bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-indigo-500/50 transition-colors"
                  />
                  <GlassButton
                    onClick={() => {
                      if (friendEmailInput.trim()) {
                        sendFriendRequest(friendEmailInput.trim());
                        setFriendEmailInput("");
                      }
                    }}
                    variant="primary"
                    size="sm"
                    className="p-2 min-h-0"
                  >
                    <UserPlus size={14} />
                  </GlassButton>
                </div>
              </div>

              {/* Pending Friend Requests */}
              {pendingRequests.length > 0 && (
                <>
                  <hr className="border-amber-500/20" />
                  <div className="flex flex-col gap-2">
                    <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider pl-0.5 flex items-center gap-1.5">
                      <Bell size={11} />
                      Requests ({pendingRequests.length})
                    </span>
                    {pendingRequests.map((req) => (
                      <div
                        key={req.requestId}
                        className="flex items-center justify-between p-2 rounded-lg bg-amber-500/5 border border-amber-500/15 text-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-6 h-6 rounded-full bg-white/5 border border-white/10 flex items-center justify-center font-bold text-[10px] uppercase text-zinc-300 shrink-0 overflow-hidden">
                            {req.senderImage ? (
                              <img
                                src={req.senderImage}
                                alt={req.senderName}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              req.senderName[0]
                            )}
                          </div>
                          <span className="font-semibold text-zinc-200 truncate max-w-[80px]">
                            {req.senderName}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() =>
                              respondFriendRequest(req.requestId, "ACCEPT")
                            }
                            className="p-1.5 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-md hover:bg-emerald-500/30 transition-colors cursor-pointer"
                            title="Accept"
                          >
                            <Check size={11} />
                          </button>
                          <button
                            onClick={() =>
                              respondFriendRequest(req.requestId, "DECLINE")
                            }
                            className="p-1.5 bg-red-500/20 border border-red-500/30 text-red-400 rounded-md hover:bg-red-500/30 transition-colors cursor-pointer"
                            title="Decline"
                          >
                            <X size={11} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              <hr className="border-white/5" />

              {/* Friends List */}
              <div className="flex flex-col gap-2 max-h-[260px] overflow-y-auto pr-1">
                {friendList.length > 0 ? (
                  friendList.map((friend) => (
                    <div
                      key={friend.userId}
                      className="flex items-center justify-between p-2 rounded-lg bg-zinc-950/20 border border-white/5 text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-6 h-6 rounded-full bg-white/5 border border-white/10 flex items-center justify-center font-bold text-[10px] uppercase text-zinc-300 overflow-hidden">
                          {friend.image ? (
                            <img
                              src={friend.image}
                              alt={friend.username}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            friend.username[0]
                          )}
                        </div>
                        <span className="font-semibold text-zinc-200 truncate max-w-[100px]">
                          {friend.username}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${friend.isOnline ? "bg-emerald-500 animate-pulse" : "bg-zinc-600"}`}
                        />
                        <span className="text-[9px] font-mono text-zinc-500">
                          {friend.isOnline ? "ONLINE" : "OFFLINE"}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6 text-zinc-600 text-xs font-mono">
                    NO FRIENDS ADDED YET
                  </div>
                )}
              </div>
            </GlassCard>

            {/* Connection Status */}
            <div className="flex items-center justify-between px-3 py-2.5 bg-zinc-950/40 rounded-xl border border-white/5 text-[10px] font-mono text-zinc-500 uppercase tracking-tight">
              <span className="shrink-0">WS Status:</span>
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${isConnected ? "bg-emerald-500" : isConnecting ? "bg-amber-500 animate-pulse" : "bg-red-500"}`}
                />
                <span
                  className={`truncate font-bold ${
                    isConnected
                      ? "text-emerald-500"
                      : isConnecting
                        ? "text-amber-500"
                        : "text-red-500"
                  }`}
                >
                  {isConnected
                    ? "Connected"
                    : isConnecting
                      ? "Linking"
                      : "Offline"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------------------
  // 2. ROOM LOBBY STATE — wrapped in full page background
  // ----------------------------------------------------------------
  if (room.state === "Lobby") {
    return (
      <div className="relative min-h-screen w-full bg-zinc-950 flex flex-col items-center py-10 px-4 select-none">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-10 right-1/4 w-[500px] h-[500px] bg-purple-500/5 rounded-full blur-[120px] pointer-events-none" />
        <div className="w-full max-w-5xl flex flex-col gap-4 relative z-10 pt-8">
          <MultiplayerLobby
            room={room}
            currentUserId={currentUserId}
            updateRoomConfig={updateRoomConfig}
            updateRoomPrivacy={updateRoomPrivacy}
            kickPlayer={kickPlayer}
            startGame={startGame}
            leaveRoom={leaveRoom}
          />
        </div>
      </div>
    );
  }

  // ----------------------------------------------------------------
  // 3. STARTING LOADER STATE
  // ----------------------------------------------------------------
  if (room.state === "Starting") {
    return (
      <div className="relative min-h-screen w-full bg-zinc-950 flex flex-col items-center justify-center py-12 px-4 select-none">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-10 right-1/4 w-[500px] h-[500px] bg-purple-500/5 rounded-full blur-[120px] pointer-events-none" />
        <GlassCard className="p-10 text-center border-white/10 max-w-sm flex flex-col items-center gap-4 bg-zinc-950/50 shadow-2xl relative z-10">
          <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <h2 className="text-base font-black text-white uppercase tracking-wider">
            Generating Match Locations
          </h2>
          <p className="text-xs text-zinc-500">
            Authoritative servers are selecting random coordinates filtering for
            difficulty:{" "}
            <span className="text-indigo-400 font-bold capitalize">
              {room.config.difficulty}
            </span>
            .
          </p>
        </GlassCard>
      </div>
    );
  }

  const localPlayer = room.players.find((p) => p.id === currentUserId);
  const currentLocation = room.currentLocation;

  // ----------------------------------------------------------------
  // 4. ACTIVE ROUND GAMEPLAY STATE (InRound)
  // ----------------------------------------------------------------
  if (room.state === "InRound") {
    return (
      <div className="absolute inset-0 select-none bg-zinc-950">
        {currentLocation && (
          <StreetViewContainer
            key={`pano_${room.currentRound}`}
            lat={currentLocation.lat}
            lng={currentLocation.lng}
            panoId={currentLocation.panoId}
            initialHeading={currentLocation.heading}
          />
        )}

        {/* HUD Header */}
        <div className="absolute top-6 left-6 right-6 z-20 flex justify-between items-center pointer-events-none">
          <div className="pointer-events-auto">
            <GlassButton
              onClick={leaveRoom}
              size="sm"
              variant="secondary"
              className="bg-zinc-950/60 backdrop-blur-md"
            >
              <ArrowLeft size={16} />
              <span>Leave Match</span>
            </GlassButton>
          </div>

          <div className="px-5 py-2.5 flex items-center gap-6 bg-zinc-950/60 border border-white/5 rounded-2xl backdrop-blur-md">
            <div className="flex items-center gap-2">
              <Globe size={15} className="text-indigo-400 animate-spin-slow" />
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
                {room.config.mode === "COUNTRY"
                  ? `COUNTRY: ${getCountryName(room.config.country || "")}`
                  : `${room.config.mode} MODE`}
              </span>
            </div>
            <div className="w-[1px] h-4 bg-white/10" />
            <div className="flex items-center gap-2">
              <MapPin size={15} className="text-purple-400" />
              <span className="text-xs font-bold text-white font-mono">
                ROUND {room.currentRound} OF {room.config.totalRounds}
              </span>
            </div>
            <div className="w-[1px] h-4 bg-white/10" />
            <div className="flex items-center gap-2 pointer-events-auto">
              <Clock size={15} className="text-indigo-400" />
              <span
                ref={registerTimerElement}
                className="text-xs font-black font-mono text-indigo-400 min-w-[30px]"
              >
                {serverTimer}s
              </span>
            </div>
          </div>

          <div className="px-5 py-2 flex items-center gap-3 bg-zinc-950/60 border border-white/5 rounded-2xl backdrop-blur-md">
            <Trophy size={15} className="text-yellow-400" />
            <div className="flex flex-col items-end">
              <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest">
                YOUR SCORE
              </span>
              <span className="text-sm font-black text-white font-mono leading-none">
                {localPlayer?.score || 0}
              </span>
            </div>
          </div>
        </div>

        {/* Right Panel - Players Guess Status */}
        <div className="absolute top-24 right-6 bottom-6 z-20 w-[240px] pointer-events-none flex flex-col justify-between items-end gap-4">
          <GlassCard className="p-4 border border-white/5 bg-zinc-950/65 backdrop-blur-xl pointer-events-auto flex flex-col gap-3 w-full max-h-[300px] overflow-y-auto">
            <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest pb-1 border-b border-white/5">
              Players Guessing
            </span>
            <div className="flex flex-col gap-2">
              {room.players.map((player) => (
                <div
                  key={player.id}
                  className="flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${player.isOnline ? "bg-emerald-500" : "bg-zinc-600"}`}
                    />
                    <span className="text-white font-semibold truncate max-w-[110px]">
                      {player.username}
                    </span>
                  </div>
                  {player.hasGuessed ? (
                    <span className="text-[8px] font-mono text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded">
                      GUESSED
                    </span>
                  ) : (
                    <span className="text-[8px] font-mono text-zinc-500 font-bold bg-white/5 px-1.5 py-0.5 rounded animate-pulse">
                      THINKING
                    </span>
                  )}
                </div>
              ))}
            </div>
          </GlassCard>

          {/* Floating Guess Map */}
          <div className="pointer-events-auto">
            <MultiplayerMapPicker
              players={room.players}
              actual={null}
              guess={localGuess}
              onGuessSelect={handleGuessSelect}
              onSubmitGuess={handleSubmitGuessClick}
              isSubmitted={hasSubmittedLocalGuess}
              currentUserId={currentUserId}
            />
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------------------
  // 5. ROUND REVIEW STATE — full-screen map
  // ----------------------------------------------------------------
  if (room.state === "RoundReview") {
    const sortedPlayers = [...room.players].sort(
      (a, b) => (b.lastScore || 0) - (a.lastScore || 0),
    );

    return (
      <div className="absolute inset-0 bg-zinc-950 select-none overflow-hidden">
        {/* Full-screen map fills the entire background */}
        <div className="absolute inset-0 z-10">
          <MultiplayerMapPicker
            players={room.players}
            actual={currentLocation}
            guess={null}
            onGuessSelect={() => {}}
            onSubmitGuess={() => {}}
            isSubmitted={true}
            currentUserId={currentUserId}
            fullScreen={true}
          />
        </div>

        {/* Top Bar */}
        <div className="absolute top-6 left-6 right-6 z-20 flex justify-between items-center pointer-events-none">
          <div className="pointer-events-auto">
            <GlassButton
              onClick={leaveRoom}
              size="sm"
              variant="secondary"
              className="bg-zinc-950/70 backdrop-blur-md"
            >
              <ArrowLeft size={16} />
              <span>Leave Game</span>
            </GlassButton>
          </div>
          <FloatingPanel className="px-5 py-2.5 flex items-center gap-6 bg-zinc-950/70 border border-white/5 pointer-events-auto">
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-indigo-400" />
              <span className="text-xs font-bold text-zinc-400 uppercase">
                Next round in:
              </span>
              <span
                ref={registerTimerElement}
                className="text-xs font-black font-mono text-indigo-400 min-w-[30px]"
              >
                {serverTimer}s
              </span>
            </div>
            <div className="w-[1px] h-4 bg-white/10" />
            <span className="text-xs font-bold text-white font-mono">
              ROUND {room.currentRound} REVIEW
            </span>
          </FloatingPanel>
          <div className="w-[120px]" />
        </div>

        {/* Left Floating Card - Round Scores */}
        <div className="absolute top-24 left-6 bottom-6 z-20 w-[330px] pointer-events-none">
          <GlassCard className="p-6 border border-white/10 bg-zinc-950/75 backdrop-blur-xl pointer-events-auto flex flex-col gap-4 shadow-2xl h-full max-h-[85vh] overflow-y-auto">
            <div className="text-center">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-1">
                ROUND RESULTS
              </span>
              <h2 className="text-lg font-black text-white uppercase tracking-wide">
                Target location
              </h2>
              <span className="text-xs text-indigo-400 font-semibold mt-1 block">
                {currentLocation
                  ? getCountryName(currentLocation.country)
                  : "Unknown Country"}
              </span>
            </div>

            <hr className="border-white/5" />

            <div className="flex flex-col gap-2 flex-grow overflow-y-auto pr-1">
              {sortedPlayers.map((player, idx) => {
                const isSelf = player.id === currentUserId;
                const formattedDist =
                  player.lastDistance !== null
                    ? player.lastDistance < 1
                      ? `${(player.lastDistance * 1000).toFixed(0)}m`
                      : `${player.lastDistance.toFixed(0)}km`
                    : "No guess";

                return (
                  <div
                    key={player.id}
                    className={`p-3 rounded-xl border flex items-center justify-between ${
                      isSelf
                        ? "bg-indigo-500/15 border-indigo-500/30 text-indigo-400"
                        : "bg-white/5 border-white/5"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="font-mono text-zinc-500 font-semibold w-4 text-center">
                        {idx + 1}
                      </span>
                      <div className="flex flex-col min-w-0">
                        <span className="font-bold text-white text-xs truncate max-w-[110px]">
                          {player.username}
                        </span>
                        <span className="text-[10px] text-zinc-500 font-mono">
                          {formattedDist}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-mono font-black text-indigo-400">
                        +{player.lastScore || 0}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </GlassCard>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------------------
  // 6. MATCH COMPLETE STATE (GameComplete)
  // ----------------------------------------------------------------
  if (room.state === "GameComplete") {
    const finalLeaderboard = [...room.players].sort(
      (a, b) => b.score - a.score,
    );
    const podium = finalLeaderboard.slice(0, 3);
    const rest = finalLeaderboard.slice(3);

    return (
      <div className="relative min-h-screen w-full bg-zinc-950 flex flex-col items-center py-12 px-4 select-none">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-10 right-1/4 w-[500px] h-[500px] bg-purple-500/5 rounded-full blur-[120px] pointer-events-none" />

        <div className="w-full max-w-3xl flex flex-col gap-6 relative z-10 py-10">
          <div className="text-center flex flex-col items-center gap-2">
            <div className="w-12 h-12 bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(234,179,8,0.2)]">
              <Trophy size={24} />
            </div>
            <h1 className="text-2xl font-black text-white tracking-wide uppercase">
              Match Completed!
            </h1>
            <p className="text-xs text-zinc-400 max-w-sm leading-relaxed">
              All rounds completed. Final scores have been synchronized and
              submitted to the global leaderboards.
            </p>
          </div>

          {podium.length > 0 && (
            <div className="grid grid-cols-3 gap-4 max-w-xl mx-auto w-full items-end pt-8 pb-4">
              {podium[1] ? (
                <div className="flex flex-col items-center">
                  <div className="w-10 h-10 rounded-full border border-zinc-400 bg-zinc-800 text-white flex items-center justify-center font-bold text-xs uppercase mb-2 overflow-hidden">
                    {podium[1].image ? (
                      <img src={podium[1].image} alt="" className="w-full h-full object-cover" />
                    ) : (
                      podium[1].username[0]
                    )}
                  </div>
                  <span className="text-xs text-zinc-300 font-bold truncate max-w-[90px]">
                    {podium[1].username}
                  </span>
                  <span className="text-[10px] text-zinc-500 font-mono font-semibold">
                    {podium[1].score} pts
                  </span>
                  <div className="w-full h-20 bg-zinc-400/10 border-t border-x border-zinc-400/20 rounded-t-xl flex items-center justify-center font-black text-2xl text-zinc-400 font-mono mt-3">
                    2
                  </div>
                </div>
              ) : <div />}

              {podium[0] && (
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 rounded-full border-2 border-yellow-500 bg-zinc-800 text-white flex items-center justify-center font-extrabold text-sm uppercase mb-2 ring-4 ring-yellow-500/20 shadow-[0_0_15px_rgba(234,179,8,0.3)] overflow-hidden">
                    {podium[0].image ? (
                      <img src={podium[0].image} alt="" className="w-full h-full object-cover" />
                    ) : (
                      podium[0].username[0]
                    )}
                  </div>
                  <span className="text-sm text-yellow-400 font-black truncate max-w-[120px]">
                    {podium[0].username}
                  </span>
                  <span className="text-xs text-zinc-400 font-mono font-bold">
                    {podium[0].score} pts
                  </span>
                  <div className="w-full h-28 bg-yellow-500/10 border-t border-x border-yellow-500/20 rounded-t-xl flex items-center justify-center font-black text-3xl text-yellow-500 font-mono mt-3 shadow-[0_-5px_15px_rgba(234,179,8,0.05)]">
                    1
                  </div>
                </div>
              )}

              {podium[2] ? (
                <div className="flex flex-col items-center">
                  <div className="w-10 h-10 rounded-full border border-amber-700 bg-zinc-800 text-white flex items-center justify-center font-bold text-xs uppercase mb-2 overflow-hidden">
                    {podium[2].image ? (
                      <img src={podium[2].image} alt="" className="w-full h-full object-cover" />
                    ) : (
                      podium[2].username[0]
                    )}
                  </div>
                  <span className="text-xs text-zinc-300 font-bold truncate max-w-[90px]">
                    {podium[2].username}
                  </span>
                  <span className="text-[10px] text-zinc-500 font-mono font-semibold">
                    {podium[2].score} pts
                  </span>
                  <div className="w-full h-14 bg-amber-700/10 border-t border-x border-amber-700/20 rounded-t-xl flex items-center justify-center font-black text-xl text-amber-700 font-mono mt-3">
                    3
                  </div>
                </div>
              ) : <div />}
            </div>
          )}

          {rest.length > 0 && (
            <GlassCard className="p-4 border-white/5 bg-zinc-950/40 max-w-xl mx-auto w-full flex flex-col gap-2">
              {rest.map((p, idx) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between py-1.5 px-3 rounded-lg hover:bg-white/5 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-zinc-500 font-semibold text-xs">
                      #{idx + 4}
                    </span>
                    <div className="w-6 h-6 rounded-full bg-zinc-800 border border-white/10 text-white flex items-center justify-center font-bold text-[10px] uppercase overflow-hidden">
                      {p.image ? (
                        <img src={p.image} alt="" className="w-full h-full object-cover" />
                      ) : (
                        p.username[0]
                      )}
                    </div>
                    <span className="text-xs text-zinc-300 font-medium">
                      {p.username}
                    </span>
                  </div>
                  <span className="text-xs text-zinc-400 font-mono font-semibold">
                    {p.score} pts
                  </span>
                </div>
              ))}
            </GlassCard>
          )}

          <div className="flex items-center gap-3 justify-center mt-6">
            <GlassButton
              onClick={leaveRoom}
              variant="primary"
              className="py-2.5 px-6 text-xs"
            >
              Back to Multiplayer Lobby
            </GlassButton>
            <GlassButton
              onClick={onExit}
              variant="secondary"
              className="py-2.5 px-6 text-xs text-zinc-400"
            >
              Exit Multiplayer
            </GlassButton>
          </div>
        </div>
      </div>
    );
  }

  return null;
};
