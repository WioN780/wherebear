"use client";

import React, { useState, useEffect, startTransition } from "react";
import { signIn, signOut } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { GlassCard } from "@/shared/components/GlassCard";
import { GlassButton } from "@/shared/components/GlassButton";
import { GameContainer } from "./GameContainer";
import {
  getGlobalLeaderboard,
  getAvailableCountries,
  type LeaderboardEntry,
} from "@/features/game/actions";
import { getCountryName } from "@/shared/lib/countries";
import { getUserProfileStats, UserStats } from "@/features/profile/actions";
import { registerUser } from "@/features/auth/actions";
import {
  Globe,
  Compass,
  Trophy,
  User as UserIcon,
  LogIn,
  LogOut,
  ChevronRight,
  Award,
  History,
  Landmark,
  ShieldAlert,
  Sparkles,
  CheckCircle,
} from "lucide-react";

import {
  MultiplayerProvider,
  useMultiplayer,
} from "@/features/multiplayer/contexts/MultiplayerContext";
import { MultiplayerGame } from "@/features/multiplayer/components/MultiplayerGame";

type AppSession = {
  user?: {
    id?: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
} | null;

interface HomeClientProps {
  session: AppSession;
}

type TabType = "play" | "multiplayer" | "leaderboard" | "profile" | "auth";
type ModeType = "CLASSIC" | "INFINITE" | "COUNTRY";

export default function HomeClient({ session }: HomeClientProps) {
  const user = session?.user;
  return (
    <MultiplayerProvider userId={user?.id || null}>
      <HomeClientInner session={session} />
    </MultiplayerProvider>
  );
}

function HomeClientInner({ session }: HomeClientProps) {
  const { room } = useMultiplayer();
  const [currentView, setCurrentView] = useState<"home" | "playing">("home");
  const [activeTab, setActiveTab] = useState<TabType>("play");

  // Game Setup States
  const [selectedMode, setSelectedMode] = useState<ModeType>("CLASSIC");
  const [selectedCountry, setSelectedCountry] = useState<string>("");
  const [countries, setCountries] = useState<{ code: string; name: string }[]>(
    [],
  );
  const [singlePlayerDifficulty, setSinglePlayerDifficulty] =
    useState<string>("medium");

  // Leaderboard & Profile States
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [profileStats, setProfileStats] = useState<UserStats | null>(null);
  const [loadingData, setLoadingData] = useState(false);

  // Authentication States
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authSuccess, setAuthSuccess] = useState("");

  const user = session?.user;

  // Load countries, leaderboards and profile stats
  const fetchData = async () => {
    setLoadingData(true);
    try {
      const countryList = await getAvailableCountries();
      setCountries(countryList);
      if (countryList.length > 0 && !selectedCountry) {
        setSelectedCountry(countryList[0].code);
      }

      const topPlayers = await getGlobalLeaderboard(10);
      setLeaderboard(topPlayers);

      if (user?.id) {
        const stats = await getUserProfileStats(user.id);
        setProfileStats(stats);
      }
    } catch (err) {
      console.error("Failed to load initial data:", err);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    queueMicrotask(() => {
      fetchData();
    });
  }, [user?.id]);

  const refreshStats = async () => {
    if (user?.id) {
      const stats = await getUserProfileStats(user.id);
      setProfileStats(stats);
    }
    const topPlayers = await getGlobalLeaderboard(10);
    setLeaderboard(topPlayers);
  };

  // Handle Credentials Login
  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError("");
    const data = new FormData(e.currentTarget);
    const email = data.get("email") as string;
    const password = data.get("password") as string;

    try {
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (res?.error) {
        setAuthError("Invalid email or password.");
      } else {
        window.location.reload(); // Reload to refresh server session
      }
    } catch (err) {
      setAuthError("Something went wrong. Please try again.");
    } finally {
      setAuthLoading(false);
    }
  };

  // Handle Credentials Registration
  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError("");
    setAuthSuccess("");
    const data = new FormData(e.currentTarget);

    try {
      const res = await registerUser(data);
      if (!res.success) {
        setAuthError(res.message);
      } else {
        setAuthSuccess(res.message);
        setAuthMode("login");
      }
    } catch (err) {
      setAuthError("Registration failed. Please try again.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleStartGame = () => {
    startTransition(() => {
      setCurrentView("playing");
    });
  };

  if (room) {
    return <MultiplayerGame userId={user?.id || null} onExit={() => {}} />;
  }

  if (currentView === "playing") {
    return (
      <GameContainer
        userId={user?.id || null}
        mode={selectedMode}
        country={selectedMode === "COUNTRY" ? selectedCountry : null}
        difficulty={singlePlayerDifficulty}
        onExit={() => {
          setCurrentView("home");
          refreshStats();
        }}
      />
    );
  }

  return (
    <div className="relative min-h-screen bg-zinc-950 flex flex-col items-center py-12 px-4 select-none">
      {/* Decorative Blur Backgrounds */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-[500px] h-[500px] bg-purple-500/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Main Container Wrapper */}
      <div className="w-full max-w-4xl flex flex-col gap-8 z-10">
        {/* Navigation / Header */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-white/5 pb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(99,102,241,0.1)]">
              <Compass size={24} className="animate-spin-slow" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-wider text-white">
                wherebear
              </h1>
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest leading-none mt-0.5">
                PORTFOLIO CHALLENGE
              </p>
            </div>
          </div>

          {/* Nav Pills */}
          <div className="flex items-center gap-1.5 bg-zinc-900/50 p-1.5 rounded-xl border border-white/5 backdrop-blur-md">
            <button
              onClick={() => setActiveTab("play")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                activeTab === "play"
                  ? "bg-white/5 text-white"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Play
            </button>
            <button
              onClick={() => setActiveTab("multiplayer")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                activeTab === "multiplayer"
                  ? "bg-white/5 text-white"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Multiplayer
            </button>
            <button
              onClick={() => setActiveTab("leaderboard")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                activeTab === "leaderboard"
                  ? "bg-white/5 text-white"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Leaderboards
            </button>
            <button
              onClick={() => setActiveTab("profile")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                activeTab === "profile"
                  ? "bg-white/5 text-white"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Profile
            </button>
            <button
              onClick={() => setActiveTab("auth")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                activeTab === "auth"
                  ? "bg-white/5 text-white"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {user ? "Account" : "Login"}
            </button>
          </div>
        </div>

        {/* Tab Contents */}
        <div className="flex-grow">
          <AnimatePresence mode="wait">
            {/* PLAY TAB */}
            {activeTab === "play" && (
              <motion.div
                key="play"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="grid md:grid-cols-3 gap-6"
              >
                {/* Mode description & options */}
                <div className="md:col-span-2 flex flex-col gap-4">
                  <h2 className="text-sm font-bold text-zinc-500 uppercase tracking-widest px-1">
                    Select Game Mode
                  </h2>

                  {/* Classic Mode Selection */}
                  <div
                    onClick={() => setSelectedMode("CLASSIC")}
                    className={`group cursor-pointer rounded-2xl border p-5 transition-all duration-300 flex items-start gap-4 ${
                      selectedMode === "CLASSIC"
                        ? "bg-indigo-500/5 border-indigo-500/30 shadow-[0_0_25px_rgba(99,102,241,0.05)]"
                        : "bg-zinc-950/40 border-white/5 hover:border-white/15 hover:bg-zinc-900/10"
                    }`}
                  >
                    <div
                      className={`p-3 rounded-xl border transition-colors ${
                        selectedMode === "CLASSIC"
                          ? "bg-indigo-500/10 border-indigo-500/20 text-indigo-400"
                          : "bg-white/5 border-white/10 text-zinc-400 group-hover:text-zinc-300"
                      }`}
                    >
                      <Trophy size={20} />
                    </div>
                    <div className="flex-grow">
                      <div className="flex justify-between items-center mb-1">
                        <h3 className="text-sm font-bold text-white tracking-wide">
                          Classic Mode
                        </h3>
                        <span className="text-[10px] font-mono text-zinc-500">
                          5 ROUNDS
                        </span>
                      </div>
                      <p className="text-zinc-400 text-xs leading-relaxed">
                        Explore 5 random Street View locations worldwide.
                        Interpolate coordinates to hit the perfect 25,000 max
                        score.
                      </p>
                    </div>
                  </div>

                  {/* Infinite Mode Selection */}
                  <div
                    onClick={() => setSelectedMode("INFINITE")}
                    className={`group cursor-pointer rounded-2xl border p-5 transition-all duration-300 flex items-start gap-4 ${
                      selectedMode === "INFINITE"
                        ? "bg-indigo-500/5 border-indigo-500/30 shadow-[0_0_25px_rgba(99,102,241,0.05)]"
                        : "bg-zinc-950/40 border-white/5 hover:border-white/15 hover:bg-zinc-900/10"
                    }`}
                  >
                    <div
                      className={`p-3 rounded-xl border transition-colors ${
                        selectedMode === "INFINITE"
                          ? "bg-indigo-500/10 border-indigo-500/20 text-indigo-400"
                          : "bg-white/5 border-white/10 text-zinc-400 group-hover:text-zinc-300"
                      }`}
                    >
                      <Globe size={20} />
                    </div>
                    <div className="flex-grow">
                      <div className="flex justify-between items-center mb-1">
                        <h3 className="text-sm font-bold text-white tracking-wide">
                          Infinite Mode
                        </h3>
                        <span className="text-[10px] font-mono text-zinc-500">
                          UNLIMITED
                        </span>
                      </div>
                      <p className="text-zinc-400 text-xs leading-relaxed">
                        Play indefinitely. Great for practice, finding new
                        routes, and discovering unique global landmarks.
                      </p>
                    </div>
                  </div>

                  {/* Country Challenge Selection */}
                  <div
                    onClick={() => setSelectedMode("COUNTRY")}
                    className={`group cursor-pointer rounded-2xl border p-5 transition-all duration-300 flex items-start gap-4 ${
                      selectedMode === "COUNTRY"
                        ? "bg-indigo-500/5 border-indigo-500/30 shadow-[0_0_25px_rgba(99,102,241,0.05)]"
                        : "bg-zinc-950/40 border-white/5 hover:border-white/15 hover:bg-zinc-900/10"
                    }`}
                  >
                    <div
                      className={`p-3 rounded-xl border transition-colors ${
                        selectedMode === "COUNTRY"
                          ? "bg-indigo-500/10 border-indigo-500/20 text-indigo-400"
                          : "bg-white/5 border-white/10 text-zinc-400 group-hover:text-zinc-300"
                      }`}
                    >
                      <Landmark size={20} />
                    </div>
                    <div className="flex-grow">
                      <div className="flex justify-between items-center mb-1">
                        <h3 className="text-sm font-bold text-white tracking-wide">
                          Country Challenge
                        </h3>
                        <span className="text-[10px] font-mono text-zinc-500">
                          5 ROUNDS
                        </span>
                      </div>
                      <p className="text-zinc-400 text-xs leading-relaxed mb-3">
                        Test your knowledge of a specific country. Select from
                        the curated list of available regions.
                      </p>

                      {/* Country Selector Dropdown */}
                      {selectedMode === "COUNTRY" && (
                        <div
                          className="relative mt-2"
                          onClick={(e) => e.stopPropagation()} // Stop triggering parent div selection
                        >
                          <select
                            value={selectedCountry}
                            onChange={(e) => setSelectedCountry(e.target.value)}
                            className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-indigo-500"
                          >
                            {countries.map((c) => (
                              <option key={c.code} value={c.code}>
                                {c.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Play Action Panel */}
                <div className="flex flex-col gap-6">
                  <h2 className="text-sm font-bold text-zinc-500 uppercase tracking-widest px-1">
                    Match Lobby
                  </h2>
                  <GlassCard className="p-6 border-white/10 flex flex-col justify-between h-full bg-zinc-950/50">
                    <div className="flex flex-col gap-4">
                      <div className="text-center py-4">
                        <div className="text-2xl font-black text-white tracking-tight uppercase mb-1 flex items-center justify-center gap-1.5">
                          <Sparkles size={18} className="text-indigo-400" />
                          Ready to guess?
                        </div>
                        <span className="text-xs text-zinc-500">
                          {selectedMode === "COUNTRY"
                            ? `Playing in ${getCountryName(selectedCountry)}`
                            : `Exploring the Globe`}
                        </span>
                      </div>

                      <div className="w-full h-[1px] bg-white/10" />

                      <div className="flex flex-col gap-2 text-xs mb-3">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                            Difficulty
                          </label>
                          <select
                            value={singlePlayerDifficulty}
                            onChange={(e) =>
                              setSinglePlayerDifficulty(e.target.value)
                            }
                            className="bg-zinc-900/50 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-indigo-500 transition-colors"
                          >
                            <option value="easy">Easy</option>
                            <option value="medium">Medium</option>
                            <option value="hard">Hard</option>
                          </select>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 text-xs">
                        <div className="flex justify-between text-zinc-400">
                          <span>Status:</span>
                          <span className="text-emerald-400 font-semibold">
                            Active
                          </span>
                        </div>
                        <div className="flex justify-between text-zinc-400">
                          <span>User Account:</span>
                          <span className="text-zinc-200 truncate max-w-[120px]">
                            {user?.name || "Guest Account"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <GlassButton
                      onClick={handleStartGame}
                      variant="primary"
                      className="w-full mt-6"
                    >
                      <span>Launch Game</span>
                      <ChevronRight size={16} />
                    </GlassButton>
                  </GlassCard>
                </div>
              </motion.div>
            )}

            {activeTab === "multiplayer" && (
              <motion.div
                key="multiplayer"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="w-full flex justify-center"
              >
                {!user ? (
                  <GlassCard className="p-8 text-center border-white/10 max-w-lg mx-auto flex flex-col items-center gap-4 bg-zinc-950/40">
                    <UserIcon size={36} className="text-zinc-500" />
                    <h3 className="text-lg font-bold text-white">
                      Guest Player
                    </h3>
                    <p className="text-zinc-400 text-sm leading-relaxed max-w-sm">
                      Sign in to track your scores, unlock accuracy statistics,
                      compile guess histories, and compete on the global
                      leaderboards.
                    </p>
                    <GlassButton
                      onClick={() => setActiveTab("auth")}
                      variant="primary"
                    >
                      Log In or Register
                    </GlassButton>
                  </GlassCard>
                ) : (
                  <MultiplayerGame
                    userId={user.id ?? null}
                    onExit={() => setActiveTab("play")}
                  />
                )}
              </motion.div>
            )}

            {/* LEADERBOARDS TAB */}
            {activeTab === "leaderboard" && (
              <motion.div
                key="leaderboard"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex flex-col gap-4"
              >
                <h2 className="text-sm font-bold text-zinc-500 uppercase tracking-widest px-1">
                  Global Leaderboards
                </h2>

                <GlassCard className="p-6 border-white/10 overflow-hidden bg-zinc-950/40">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm border-collapse">
                      <thead>
                        <tr className="border-b border-white/10 text-xs font-bold text-zinc-500 uppercase tracking-wider">
                          <th className="pb-3 w-16 text-center">Rank</th>
                          <th className="pb-3 pl-2">Explorer</th>
                          <th className="pb-3 text-right">Games</th>
                          <th className="pb-3 text-right">Avg Score</th>
                          <th className="pb-3 text-right pr-2">High Score</th>
                        </tr>
                      </thead>
                      <tbody>
                        {leaderboard.length > 0 ? (
                          leaderboard.map((player, index) => (
                            <tr
                              key={player.id}
                              className={`border-b border-white/5 hover:bg-white/5 transition-colors ${
                                player.userId === user?.id
                                  ? "bg-indigo-500/5"
                                  : ""
                              }`}
                            >
                              <td className="py-3 text-center font-bold text-zinc-400">
                                {index === 0
                                  ? "🥇"
                                  : index === 1
                                    ? "🥈"
                                    : index === 2
                                      ? "🥉"
                                      : index + 1}
                              </td>
                              <td className="py-3 pl-2 text-white font-medium flex items-center gap-2">
                                <span className="truncate">
                                  {player.username}
                                </span>
                                {player.userId === user?.id && (
                                  <span className="text-[9px] font-extrabold bg-indigo-500/25 border border-indigo-500/30 text-indigo-300 px-1.5 py-0.5 rounded-md">
                                    YOU
                                  </span>
                                )}
                              </td>
                              <td className="py-3 text-right text-zinc-400 font-mono">
                                {player.gamesPlayed}
                              </td>
                              <td className="py-3 text-right text-zinc-400 font-mono">
                                {Math.round(
                                  player.averageScore,
                                ).toLocaleString()}
                              </td>
                              <td className="py-3 text-right text-indigo-400 font-mono font-bold pr-2">
                                {player.highScore.toLocaleString()}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td
                              colSpan={5}
                              className="py-8 text-center text-zinc-500"
                            >
                              No leaderboard entries yet. Be the first to claim
                              a rank!
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </GlassCard>
              </motion.div>
            )}

            {/* PROFILE TAB */}
            {activeTab === "profile" && (
              <motion.div
                key="profile"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex flex-col gap-6"
              >
                {!user ? (
                  <GlassCard className="p-8 text-center border-white/10 max-w-lg mx-auto flex flex-col items-center gap-4 bg-zinc-950/40">
                    <UserIcon size={36} className="text-zinc-500" />
                    <h3 className="text-lg font-bold text-white">
                      Guest Player
                    </h3>
                    <p className="text-zinc-400 text-sm leading-relaxed max-w-sm">
                      Sign in to track your scores, unlock accuracy statistics,
                      compile guess histories, and compete on the global
                      leaderboards.
                    </p>
                    <GlassButton
                      onClick={() => setActiveTab("auth")}
                      variant="primary"
                    >
                      Log In or Register
                    </GlassButton>
                  </GlassCard>
                ) : (
                  <>
                    <h2 className="text-sm font-bold text-zinc-500 uppercase tracking-widest px-1">
                      Explorer Profile
                    </h2>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="p-4 bg-zinc-950/40 border border-white/5 rounded-2xl flex flex-col gap-1">
                        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                          GAMES PLAYED
                        </span>
                        <span className="text-2xl font-black text-white font-mono">
                          {profileStats?.gamesPlayed || 0}
                        </span>
                      </div>
                      <div className="p-4 bg-zinc-950/40 border border-white/5 rounded-2xl flex flex-col gap-1">
                        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                          BEST GAME SCORE
                        </span>
                        <span className="text-2xl font-black text-indigo-400 font-mono">
                          {(profileStats?.bestScore || 0).toLocaleString()}
                        </span>
                      </div>
                      <div className="p-4 bg-zinc-950/40 border border-white/5 rounded-2xl flex flex-col gap-1">
                        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                          AVG GAME SCORE
                        </span>
                        <span className="text-2xl font-black text-zinc-300 font-mono">
                          {(profileStats?.averageScore || 0).toLocaleString()}
                        </span>
                      </div>
                      <div className="p-4 bg-zinc-950/40 border border-white/5 rounded-2xl flex flex-col gap-1">
                        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                          GEO ACCURACY
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-2xl font-black text-emerald-400 font-mono">
                            {profileStats?.accuracyPercent || 0}%
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Accuracy slider indicator */}
                    {profileStats && profileStats.gamesPlayed > 0 && (
                      <GlassCard className="p-4 border-white/5 flex flex-col gap-2 bg-zinc-950/20">
                        <div className="flex justify-between text-xs font-semibold text-zinc-400 px-1">
                          <span>Guessing Precision</span>
                          <span className="text-emerald-400 font-bold">
                            {profileStats.accuracyPercent}% accuracy
                          </span>
                        </div>
                        <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden border border-white/5">
                          <div
                            className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500 rounded-full"
                            style={{
                              width: `${profileStats.accuracyPercent}%`,
                            }}
                          />
                        </div>
                      </GlassCard>
                    )}

                    {/* History */}
                    <div className="flex flex-col gap-3">
                      <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5 px-1">
                        <History size={14} />
                        Game History
                      </h3>

                      <div className="flex flex-col gap-2">
                        {profileStats && profileStats.history.length > 0 ? (
                          profileStats.history.map((h) => (
                            <div
                              key={h.id}
                              className="flex items-center justify-between p-4 rounded-xl bg-zinc-950/40 border border-white/5 text-sm"
                            >
                              <div className="flex flex-col gap-1">
                                <span className="font-semibold text-white">
                                  {h.mode === "COUNTRY"
                                    ? `${getCountryName(h.country)} Challenge`
                                    : h.mode === "INFINITE"
                                      ? "Infinite Mode"
                                      : "Classic Game"}
                                </span>
                                <span className="text-[10px] text-zinc-500">
                                  {new Date(h.createdAt).toLocaleDateString()}{" "}
                                  at{" "}
                                  {new Date(h.createdAt).toLocaleTimeString(
                                    [],
                                    { hour: "2-digit", minute: "2-digit" },
                                  )}
                                </span>
                              </div>
                              <div className="text-right">
                                <span className="font-mono font-bold text-indigo-400">
                                  +{h.totalScore.toLocaleString()} pts
                                </span>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="p-6 text-center text-zinc-500 bg-zinc-950/30 rounded-xl border border-white/5">
                            No games played yet. Launch your first round!
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </motion.div>
            )}

            {/* AUTH TAB */}
            {activeTab === "auth" && (
              <motion.div
                key="auth"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="max-w-md mx-auto w-full"
              >
                {user ? (
                  <GlassCard className="p-8 text-center border-white/10 flex flex-col items-center gap-4 bg-zinc-950/40">
                    <div className="w-16 h-16 bg-white/5 border border-white/10 rounded-full flex items-center justify-center text-white text-xl font-bold uppercase shadow-inner">
                      {user.name
                        ? user.name[0]
                        : user.email
                          ? user.email[0]
                          : "?"}
                    </div>
                    <div className="flex flex-col">
                      <h3 className="text-lg font-bold text-white">
                        {user.name || "Explorer"}
                      </h3>
                      <span className="text-xs text-zinc-400">
                        {user.email}
                      </span>
                    </div>
                    <hr className="w-full border-white/5 my-2" />
                    <GlassButton
                      onClick={() => signOut({ callbackUrl: "/" })}
                      variant="danger"
                      className="w-full"
                    >
                      <LogOut size={16} />
                      Sign Out
                    </GlassButton>
                  </GlassCard>
                ) : (
                  <GlassCard className="p-8 border-white/10 flex flex-col gap-6 bg-zinc-950/50 shadow-2xl">
                    {/* Header */}
                    <div className="text-center">
                      <h2 className="text-xl font-extrabold tracking-wide text-white">
                        {authMode === "login"
                          ? "Welcome Back"
                          : "Create Account"}
                      </h2>
                      <p className="text-xs text-zinc-400 mt-1.5">
                        {authMode === "login"
                          ? "Log in to claim your leaderboard ranking"
                          : "Join and track your stats"}
                      </p>
                    </div>

                    {/* Auth Errors/Success notifications */}
                    {authError && (
                      <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl flex items-center gap-2">
                        <ShieldAlert size={16} className="shrink-0" />
                        <span>{authError}</span>
                      </div>
                    )}
                    {authSuccess && (
                      <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-xl flex items-center gap-2">
                        <CheckCircle size={16} className="shrink-0" />
                        <span>{authSuccess}</span>
                      </div>
                    )}

                    {/* Google OAuth Login Button */}
                    <GlassButton
                      onClick={() => signIn("google")}
                      variant="secondary"
                      className="w-full py-2.5 font-medium border border-white/10 hover:bg-white/10"
                    >
                      <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                        <path
                          fill="currentColor"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="currentColor"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="currentColor"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                        />
                        <path
                          fill="currentColor"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                        />
                      </svg>
                      Continue with Google
                    </GlassButton>

                    {/* Divider */}
                    <div className="flex items-center gap-3">
                      <div className="flex-grow h-[1px] bg-white/10" />
                      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest leading-none">
                        OR WITH EMAIL
                      </span>
                      <div className="flex-grow h-[1px] bg-white/10" />
                    </div>

                    {/* Form */}
                    <form
                      onSubmit={
                        authMode === "login" ? handleLogin : handleRegister
                      }
                      className="flex flex-col gap-4"
                    >
                      {authMode === "signup" && (
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-semibold text-zinc-400 pl-1">
                            Username
                          </label>
                          <input
                            required
                            type="text"
                            name="name"
                            placeholder="John Doe"
                            className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-indigo-500/50 transition-colors"
                          />
                        </div>
                      )}

                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-zinc-400 pl-1">
                          Email Address
                        </label>
                        <input
                          required
                          type="email"
                          name="email"
                          placeholder="johndoe@example.com"
                          className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-indigo-500/50 transition-colors"
                        />
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-zinc-400 pl-1">
                          Password
                        </label>
                        <input
                          required
                          type="password"
                          name="password"
                          placeholder="••••••••"
                          className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-indigo-500/50 transition-colors"
                        />
                      </div>

                      <GlassButton
                        type="submit"
                        variant="primary"
                        className="w-full mt-4 py-2.5"
                        disabled={authLoading}
                      >
                        {authLoading ? (
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        ) : authMode === "login" ? (
                          <>
                            <LogIn size={16} />
                            Log In
                          </>
                        ) : (
                          "Create Account"
                        )}
                      </GlassButton>
                    </form>

                    {/* Mode Toggle */}
                    <div className="text-center text-xs text-zinc-500 mt-2">
                      {authMode === "login" ? (
                        <>
                          Don&apos;t have an account?{" "}
                          <button
                            onClick={() => setAuthMode("signup")}
                            className="text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer outline-none"
                          >
                            Sign up
                          </button>
                        </>
                      ) : (
                        <>
                          Already have an account?{" "}
                          <button
                            onClick={() => setAuthMode("login")}
                            className="text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer outline-none"
                          >
                            Log in
                          </button>
                        </>
                      )}
                    </div>
                  </GlassCard>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
