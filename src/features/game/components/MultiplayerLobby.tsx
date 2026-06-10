"use client";

import React, { useState, useEffect } from "react";
import {
  RoomState,
  RoomConfig,
  Player,
  GameMode,
  Difficulty,
} from "../../multiplayer/types";
import { GlassCard } from "@/shared/components/GlassCard";
import { GlassButton } from "@/shared/components/GlassButton";
import { getAvailableCountries } from "@/features/game/actions";
import { getCountryName } from "@/shared/lib/countries";
import {
  Users,
  Copy,
  Check,
  Trash2,
  Play,
  Settings,
  Globe,
  Trophy,
  Landmark,
  ShieldAlert,
  Lock,
  Unlock,
} from "lucide-react";

interface MultiplayerLobbyProps {
  room: RoomState;
  currentUserId: string;
  updateRoomConfig: (config: RoomConfig) => void;
  updateRoomPrivacy: (isPrivate: boolean) => void;
  kickPlayer: (targetPlayerId: string) => void;
  startGame: () => void;
  leaveRoom: () => void;
}

export const MultiplayerLobby: React.FC<MultiplayerLobbyProps> = ({
  room,
  currentUserId,
  updateRoomConfig,
  updateRoomPrivacy,
  kickPlayer,
  startGame,
  leaveRoom,
}) => {
  const [copied, setCopied] = useState(false);
  const [countries, setCountries] = useState<{ code: string; name: string }[]>(
    [],
  );
  const isHost = room.hostPlayerId === currentUserId;
  const config = room.config;

  // Load countries for COUNTRY mode
  useEffect(() => {
    const loadCountries = async () => {
      try {
        const countryList = await getAvailableCountries();
        setCountries(countryList);
      } catch (err) {
        console.error("Failed to load countries:", err);
      }
    };
    loadCountries();
  }, []);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(room.inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleConfigChange = (updatedFields: Partial<RoomConfig>) => {
    if (!isHost) return;
    const newConfig: RoomConfig = {
      ...config,
      ...updatedFields,
    };

    // Auto select first country if switching to COUNTRY mode and none selected
    if (
      updatedFields.mode === "COUNTRY" &&
      !config.country &&
      countries.length > 0
    ) {
      newConfig.country = countries[0].code;
    }

    updateRoomConfig(newConfig);
  };

  return (
    <div className="grid md:grid-cols-3 gap-6 max-w-5xl w-full">
      {/* Left Columns - Players List */}
      <div className="md:col-span-2 flex flex-col gap-4">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-sm font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
            <Users size={16} />
            Lobby ({room.players.length} / {config.maxPlayers} players)
          </h2>
          <span className="text-[10px] font-mono bg-indigo-500/15 text-indigo-400 border border-indigo-500/20 px-2.5 py-1 rounded-md uppercase tracking-wider font-semibold">
            {room.state}
          </span>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          {room.players.map((player) => (
            <GlassCard
              key={player.id}
              className={`p-4 border transition-all duration-300 flex items-center justify-between ${
                player.id === currentUserId
                  ? "bg-indigo-500/5 border-indigo-500/30"
                  : player.isOnline
                    ? "bg-zinc-950/40 border-white/5"
                    : "bg-zinc-950/10 border-white/5 opacity-50"
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                {/* Player image or avatar placeholder */}
                <div className="w-10 h-10 rounded-full border border-white/10 bg-white/5 text-white flex items-center justify-center font-bold text-sm uppercase shrink-0">
                  {player.image ? (
                    <img
                      src={player.image}
                      alt={player.username}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    player.username[0]
                  )}
                </div>

                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-sm text-white truncate max-w-[120px]">
                      {player.username}
                    </span>
                    {player.id === currentUserId && (
                      <span className="text-[8px] font-bold bg-zinc-800 text-zinc-400 px-1 py-0.5 rounded">
                        YOU
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${player.isOnline ? "bg-emerald-500 animate-pulse" : "bg-zinc-500"}`}
                    />
                    <span className="text-[10px] text-zinc-500 uppercase font-mono">
                      {player.isOnline ? "Online" : "Offline"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {player.isHost && (
                  <span className="text-[9px] font-extrabold bg-amber-500/25 border border-amber-500/30 text-amber-300 px-1.5 py-0.5 rounded-md">
                    HOST
                  </span>
                )}

                {/* Host kick controls */}
                {isHost && player.id !== currentUserId && (
                  <button
                    onClick={() => kickPlayer(player.id)}
                    className="p-1.5 text-zinc-500 hover:text-red-400 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
                    title="Kick player"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </GlassCard>
          ))}
        </div>

        {/* Invite link and sharing info */}
        <GlassCard className="p-5 border-white/5 bg-zinc-950/20 flex flex-col sm:flex-row items-center justify-between gap-4 mt-2">
          <div className="flex flex-col gap-1 text-center sm:text-left">
            <span className="text-xs font-bold text-zinc-400">
              Invite Your Friends
            </span>
            <span className="text-[10px] text-zinc-500 leading-normal max-w-sm">
              Share the invite code below. Anyone with this code can join this
              lobby as long as it has free slots.
            </span>
          </div>

          <div className="flex items-center gap-2 bg-zinc-900 border border-white/10 rounded-xl p-1.5 pr-2.5 max-w-xs w-full justify-between">
            <span className="font-mono font-black text-white text-base tracking-widest pl-3 select-all">
              {room.inviteCode}
            </span>
            <GlassButton
              onClick={handleCopyCode}
              size="sm"
              variant="secondary"
              className={`p-2 min-h-0 ${copied ? "bg-green-500/20 text-green-300 border-green-500/30 hover:bg-green-500/30" : ""}`}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
            </GlassButton>
          </div>
        </GlassCard>
      </div>

      {/* Right Column - Room Configuration */}
      <div className="flex flex-col gap-4">
        <h2 className="text-sm font-bold text-zinc-500 uppercase tracking-widest px-1 flex items-center gap-2">
          <Settings size={16} />
          Match Configuration
        </h2>

        <GlassCard className="p-6 border-white/10 flex flex-col gap-6 bg-zinc-950/50">
          {/* Game Mode */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
              Game Mode
            </label>
            {isHost ? (
              <div className="grid grid-cols-3 gap-1.5">
                {(["CLASSIC", "INFINITE", "COUNTRY"] as GameMode[]).map(
                  (mode) => (
                    <button
                      key={mode}
                      onClick={() => handleConfigChange({ mode })}
                      className={`py-2 text-[10px] font-bold rounded-lg border transition-all cursor-pointer ${
                        config.mode === mode
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
            ) : (
              <span className="text-sm font-semibold text-white flex items-center gap-1.5">
                {config.mode === "CLASSIC" && (
                  <Trophy size={16} className="text-indigo-400" />
                )}
                {config.mode === "INFINITE" && (
                  <Globe size={16} className="text-indigo-400" />
                )}
                {config.mode === "COUNTRY" && (
                  <Landmark size={16} className="text-indigo-400" />
                )}
                {config.mode === "CLASSIC"
                  ? "Classic Game (5 Rounds)"
                  : config.mode === "INFINITE"
                    ? "Infinite Practice"
                    : `Country Challenge`}
              </span>
            )}

            {/* Country challenges option */}
            {config.mode === "COUNTRY" && (
              <div className="mt-1">
                {isHost ? (
                  <select
                    value={config.country || ""}
                    onChange={(e) =>
                      handleConfigChange({ country: e.target.value })
                    }
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-indigo-500"
                  >
                    {countries.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="text-xs text-zinc-400 bg-white/5 border border-white/5 px-3 py-1.5 rounded-lg block">
                    Region: {getCountryName(config.country || "")}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Difficulty */}
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                Difficulty
              </label>
              {config.difficulty === "easy" && (
                <span className="text-[9px] font-bold text-emerald-400 uppercase bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  Paved Roads Only
                </span>
              )}
              {config.difficulty === "medium" && (
                <span className="text-[9px] font-bold text-indigo-400 uppercase bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                  Mixed Roads
                </span>
              )}
              {config.difficulty === "hard" && (
                <span className="text-[9px] font-bold text-red-400 uppercase bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">
                  Dirt & Unpaved
                </span>
              )}
            </div>

            {isHost ? (
              <div className="grid grid-cols-3 gap-1.5">
                {(["easy", "medium", "hard"] as Difficulty[]).map((dif) => (
                  <button
                    key={dif}
                    onClick={() => handleConfigChange({ difficulty: dif })}
                    className={`py-2 text-[10px] font-bold rounded-lg border transition-all cursor-pointer capitalize ${
                      config.difficulty === dif
                        ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-400"
                        : "bg-zinc-900 border-white/5 text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    {dif}
                  </button>
                ))}
              </div>
            ) : (
              <span className="text-sm font-semibold text-white capitalize">
                {config.difficulty}
              </span>
            )}
          </div>

          {/* Rounds */}
          {config.mode !== "INFINITE" && (
            <div className="flex flex-col gap-2">
              <div className="flex justify-between text-xs font-bold text-zinc-400 uppercase tracking-wider">
                <span>Rounds</span>
                <span className="text-white font-mono">
                  {config.totalRounds}
                </span>
              </div>
              {isHost ? (
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={config.totalRounds}
                  onChange={(e) =>
                    handleConfigChange({
                      totalRounds: parseInt(e.target.value),
                    })
                  }
                  className="w-full accent-indigo-500 bg-zinc-900 h-1.5 rounded-lg appearance-none cursor-pointer"
                />
              ) : (
                <span className="text-sm font-semibold text-white">
                  {config.totalRounds} rounds
                </span>
              )}
            </div>
          )}

          {/* Round Duration */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
              Round Duration
            </label>
            {isHost ? (
              <div className="grid grid-cols-4 gap-1.5">
                {([10, 30, 60, 120] as number[]).map((time) => (
                  <button
                    key={time}
                    onClick={() => handleConfigChange({ roundDuration: time })}
                    className={`py-2 text-[10px] font-bold rounded-lg border transition-all cursor-pointer ${
                      config.roundDuration === time
                        ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-400"
                        : "bg-zinc-900 border-white/5 text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    {time}s
                  </button>
                ))}
              </div>
            ) : (
              <span className="text-sm font-semibold text-white">
                {config.roundDuration} seconds
              </span>
            )}
          </div>

          {/* Privacy */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
              Room Privacy
            </label>
            {isHost ? (
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  onClick={() => updateRoomPrivacy(false)}
                  className={`py-2 text-[10px] font-bold rounded-lg border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    !room.isPrivate
                      ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-400"
                      : "bg-zinc-900 border-white/5 text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  <Unlock size={12} />
                  Public
                </button>
                <button
                  onClick={() => updateRoomPrivacy(true)}
                  className={`py-2 text-[10px] font-bold rounded-lg border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    room.isPrivate
                      ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-400"
                      : "bg-zinc-900 border-white/5 text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  <Lock size={12} />
                  Private
                </button>
              </div>
            ) : (
              <span className="text-sm font-semibold text-white flex items-center gap-1.5">
                {room.isPrivate ? (
                  <Lock size={14} className="text-zinc-500" />
                ) : (
                  <Unlock size={14} className="text-emerald-500" />
                )}
                {room.isPrivate ? "Private Room" : "Public Room"}
              </span>
            )}
          </div>

          <hr className="border-white/5" />

          {/* Action Buttons */}
          <div className="flex flex-col gap-2">
            {isHost ? (
              <GlassButton
                onClick={startGame}
                variant="primary"
                className="w-full flex items-center justify-center gap-2 py-3"
                disabled={room.players.length === 0}
              >
                <Play size={16} />
                <span>Start Match</span>
              </GlassButton>
            ) : (
              <div className="p-3 bg-white/5 border border-white/5 rounded-xl text-center text-xs text-zinc-400 animate-pulse">
                Waiting for host to start match...
              </div>
            )}

            <GlassButton
              onClick={leaveRoom}
              variant="secondary"
              className="w-full text-zinc-400 hover:text-red-400 hover:border-red-500/30 py-2 text-xs"
            >
              Leave Room
            </GlassButton>
          </div>
        </GlassCard>
      </div>
    </div>
  );
};
