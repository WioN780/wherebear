"use client";

import React from "react";
import { FloatingPanel } from "@/shared/components/FloatingPanel";
import { GlassButton } from "@/shared/components/GlassButton";
import { ScoreCounter } from "@/shared/components/ScoreCounter";
import { ArrowLeft, Globe, MapPin, Trophy } from "lucide-react";
import { motion } from "framer-motion";

interface GameHUDProps {
  round: number;
  totalRounds: number;
  score: number;
  mode: string;
  country: string | null;
  onExit: () => void;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  round,
  totalRounds,
  score,
  mode,
  country,
  onExit,
}) => {
  const getModeLabel = () => {
    switch (mode) {
      case "CLASSIC":
        return "Classic Mode";
      case "INFINITE":
        return "Infinite Mode";
      case "COUNTRY":
        return `Country: ${country || "Unknown"}`;
      default:
        return "Geography guesser";
    }
  };

  return (
    <div className="absolute top-6 left-6 right-6 z-20 flex justify-between items-center pointer-events-none select-none">
      {/* Left Exit Button */}
      <div className="pointer-events-auto">
        <GlassButton
          onClick={onExit}
          size="sm"
          variant="secondary"
          className="bg-zinc-950/50 backdrop-blur-md"
        >
          <ArrowLeft size={16} />
          <span>Exit Game</span>
        </GlassButton>
      </div>

      {/* Middle Game Mode / Round Indicators */}
      <FloatingPanel className="px-5 py-2.5 flex items-center gap-6 bg-zinc-950/55 backdrop-blur-md pointer-events-auto border border-white/5">
        <div className="flex items-center gap-2">
          <Globe size={16} className="text-indigo-400 animate-spin-slow" />
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
            {getModeLabel()}
          </span>
        </div>

        <div className="w-[1px] h-4 bg-white/10" />

        <div className="flex items-center gap-2">
          <MapPin size={16} className="text-purple-400" />
          <span className="text-sm font-medium text-white font-mono">
            {mode === "INFINITE"
              ? `Round ${round}`
              : `Round ${round} of ${totalRounds}`}
          </span>
        </div>
      </FloatingPanel>

      {/* Right Total Score Board */}
      <FloatingPanel className="px-5 py-2.5 flex items-center gap-3 bg-zinc-950/55 backdrop-blur-md pointer-events-auto border border-white/5">
        <Trophy size={16} className="text-yellow-400" />
        <div className="flex flex-col items-end">
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest leading-none mb-0.5">
            TOTAL SCORE
          </span>
          <ScoreCounter
            value={score}
            className="text-base font-bold text-white leading-none"
          />
        </div>
      </FloatingPanel>
    </div>
  );
};
