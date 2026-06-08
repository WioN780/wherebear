"use client";

import React from "react";
import { GlassCard } from "@/shared/components/GlassCard";
import { GlassButton } from "@/shared/components/GlassButton";
import { ScoreCounter } from "@/shared/components/ScoreCounter";
import { Compass, ArrowRight, MapPin, Navigation } from "lucide-react";
import { motion } from "framer-motion";

interface RoundSummaryProps {
  score: number;
  distance: number;
  country: string;
  isLastRound: boolean;
  onNext: () => void;
}

export const RoundSummary: React.FC<RoundSummaryProps> = ({
  score,
  distance,
  country,
  isLastRound,
  onNext,
}) => {
  const getFeedbackMessage = () => {
    if (distance <= 5)
      return { text: "Flawless Guess!", color: "text-emerald-400" };
    if (distance <= 50)
      return { text: "Incredible Accuracy!", color: "text-green-400" };
    if (distance <= 250)
      return { text: "Excellent Guess!", color: "text-indigo-400" };
    if (distance <= 1000)
      return { text: "Decent Effort!", color: "text-amber-400" };
    return { text: "A bit far off...", color: "text-red-400" };
  };

  const feedback = getFeedbackMessage();

  // Format distance
  const formattedDistance =
    distance < 1
      ? `${(distance * 1000).toFixed(0)} m`
      : `${distance.toFixed(1)} km`;

  return (
    <div className="absolute top-[20%] left-6 z-20 w-[320px] pointer-events-none">
      <GlassCard
        glow={score > 4000}
        className="p-6 border border-white/10 bg-zinc-950/70 backdrop-blur-xl pointer-events-auto flex flex-col gap-4 shadow-2xl"
      >
        {/* Feedback Message */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="text-center"
        >
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-1">
            ROUND RESULTS
          </span>
          <h2
            className={`text-xl font-extrabold tracking-wide ${feedback.color}`}
          >
            {feedback.text}
          </h2>
        </motion.div>

        <hr className="border-white/10" />

        {/* Score and Distance Info */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col items-center p-3 rounded-xl bg-white/5 border border-white/5">
            <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
              POINTS
            </span>
            <ScoreCounter
              value={score}
              className="text-2xl font-extrabold text-white"
              prefix="+"
            />
          </div>
          <div className="flex flex-col items-center p-3 rounded-xl bg-white/5 border border-white/5">
            <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
              DISTANCE
            </span>
            <span className="text-xl font-extrabold text-zinc-100 font-mono">
              {formattedDistance}
            </span>
          </div>
        </div>

        {/* Location Info */}
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/5 border border-white/5 text-zinc-300">
          <MapPin size={16} className="text-indigo-400 shrink-0" />
          <div className="flex flex-col">
            <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-wide">
              ACTUAL LOCATION
            </span>
            <span className="text-sm font-semibold text-white truncate max-w-[200px]">
              {country}
            </span>
          </div>
        </div>

        {/* Next Step Action Button */}
        <GlassButton onClick={onNext} variant="primary" className="w-full mt-2">
          <span>{isLastRound ? "View Final Summary" : "Next Round"}</span>
          <ArrowRight size={16} className="animate-pulse" />
        </GlassButton>
      </GlassCard>
    </div>
  );
};
