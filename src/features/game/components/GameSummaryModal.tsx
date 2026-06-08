"use client";

import React, { useEffect } from "react";
import { GlassCard } from "@/shared/components/GlassCard";
import { GlassButton } from "@/shared/components/GlassButton";
import { ScoreCounter } from "@/shared/components/ScoreCounter";
import {
  Trophy,
  RefreshCw,
  Home,
  MapPin,
  Award,
  CheckCircle,
} from "lucide-react";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";

interface GameSummaryModalProps {
  score: number;
  rounds: Array<{
    roundNumber: number;
    location: { country: string };
    score: number | null;
    distance: number | null;
  }>;
  onPlayAgain: () => void;
  onHome: () => void;
}

export const GameSummaryModal: React.FC<GameSummaryModalProps> = ({
  score,
  rounds,
  onPlayAgain,
  onHome,
}) => {
  // Trigger confetti if score is awesome (> 20000 points)
  useEffect(() => {
    if (score >= 18000) {
      const duration = 2.5 * 1000;
      const animationEnd = Date.now() + duration;
      const defaults = {
        startVelocity: 30,
        spread: 360,
        ticks: 60,
        zIndex: 100,
      };

      const randomInRange = (min: number, max: number) => {
        return Math.random() * (max - min) + min;
      };

      const interval: any = setInterval(function () {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          return clearInterval(interval);
        }

        const particleCount = 50 * (timeLeft / duration);
        // since particles fall down, animate a bit higher than they would
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
        });
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
        });
      }, 250);

      return () => clearInterval(interval);
    }
  }, [score]);

  const getPerformanceBadge = () => {
    if (score >= 23000)
      return { label: "Grandmaster Bear", desc: "Practically a human GPS!" };
    if (score >= 18000)
      return {
        label: "Master Explorer",
        desc: "Outstanding geography instincts.",
      };
    if (score >= 12000)
      return { label: "Wanderer", desc: "Good pathfinding, keep exploring!" };
    return { label: "Lost Cub", desc: "Time to study some maps!" };
  };

  const badge = getPerformanceBadge();

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        className="w-full max-w-xl my-8 pointer-events-auto"
      >
        <GlassCard
          glow={score >= 18000}
          className="p-8 border-white/10 flex flex-col gap-6 shadow-2xl bg-zinc-950/80"
        >
          {/* Header Trophy & Badge */}
          <div className="flex flex-col items-center text-center gap-2">
            <motion.div
              initial={{ rotate: -15, scale: 0.8 }}
              animate={{ rotate: 0, scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="w-16 h-16 bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 rounded-2xl flex items-center justify-center shadow-[0_0_20px_rgba(234,179,8,0.15)] mb-2"
            >
              <Trophy size={36} />
            </motion.div>

            <h1 className="text-2xl font-extrabold tracking-wide text-white">
              Game Completed
            </h1>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 mb-1">
              <Award size={14} />
              <span className="text-xs font-bold uppercase tracking-wider">
                {badge.label}
              </span>
            </div>

            <p className="text-zinc-400 text-sm max-w-sm">{badge.desc}</p>
          </div>

          {/* Big Score counter */}
          <div className="bg-white/5 border border-white/5 rounded-2xl p-6 flex flex-col items-center justify-center text-center">
            <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">
              FINAL TOTAL SCORE
            </span>
            <div className="flex items-baseline gap-2">
              <ScoreCounter
                value={score}
                className="text-5xl font-black text-white tracking-tight"
              />
              <span className="text-zinc-500 font-bold text-lg">/ 25,000</span>
            </div>
          </div>

          {/* Round breakdown */}
          <div className="flex flex-col gap-3">
            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider px-1">
              Round Breakdown
            </h3>

            <div className="flex flex-col gap-2 max-h-[200px] overflow-y-auto pr-1">
              {rounds.map((r, index) => {
                const isCorrect = r.score !== null;
                const distStr =
                  r.distance !== null
                    ? r.distance < 1
                      ? `${(r.distance * 1000).toFixed(0)} m`
                      : `${r.distance.toFixed(0)} km`
                    : "-";

                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + index * 0.08 }}
                    className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 text-sm"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-zinc-500 font-mono font-bold w-4">
                        {r.roundNumber}
                      </span>
                      <MapPin size={16} className="text-zinc-400" />
                      <span className="text-white font-medium truncate max-w-[180px] sm:max-w-[240px]">
                        {r.location.country}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-right">
                      <span className="text-zinc-400 font-mono text-xs">
                        {distStr}
                      </span>
                      <span className="text-indigo-400 font-mono font-bold w-16">
                        {r.score !== null ? `+${r.score}` : "0"}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          <hr className="border-white/10" />

          {/* Navigation Action Buttons */}
          <div className="flex gap-4">
            <GlassButton
              onClick={onHome}
              variant="secondary"
              className="flex-1"
            >
              <Home size={16} />
              <span>Main Menu</span>
            </GlassButton>

            <GlassButton
              onClick={onPlayAgain}
              variant="primary"
              className="flex-1 shadow-lg"
            >
              <RefreshCw size={16} className="animate-spin-slow" />
              <span>Play Again</span>
            </GlassButton>
          </div>
        </GlassCard>
      </motion.div>
    </div>
  );
};
