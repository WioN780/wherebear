"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import { cn } from "@/shared/lib/utils";
import { FloatingPanel } from "@/shared/components/FloatingPanel";

// Dynamic import of the multiplayer map with SSR disabled to prevent Leaflet crashing on server render
const MultiplayerMap = dynamic(() => import("./MultiplayerMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[180px] bg-zinc-950/40 backdrop-blur-xl border border-white/5 rounded-2xl flex items-center justify-center animate-pulse">
      <div className="flex flex-col items-center gap-2">
        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        <span className="text-xs text-zinc-400 font-mono tracking-wider font-bold">
          LOADING MULTIPLAYER MAP...
        </span>
      </div>
    </div>
  ),
});

interface MultiplayerMapPickerProps {
  players: {
    id: string;
    username: string;
    lastGuess: { lat: number; lng: number } | null;
    lastDistance: number | null;
    lastScore: number | null;
  }[];
  actual: { lat: number; lng: number } | null;
  guess: { lat: number; lng: number } | null;
  onGuessSelect: (lat: number, lng: number) => void;
  onSubmitGuess: () => void;
  isSubmitted: boolean;
  className?: string;
  currentUserId: string;
}

export const MultiplayerMapPicker: React.FC<MultiplayerMapPickerProps> = ({
  players,
  actual,
  guess,
  onGuessSelect,
  onSubmitGuess,
  isSubmitted,
  className,
  currentUserId,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // If the round is finished (actual exists) or user submitted, expand the panel for visibility
  const showLargeMap = isSubmitted || actual !== null;

  const expandedWidthHeight =
    isExpanded || showLargeMap
      ? "w-[85vw] h-[50vh] sm:w-[450px] sm:h-[350px] md:w-[600px] md:h-[450px]"
      : "w-[260px] h-[180px] sm:w-[280px] sm:h-[200px] md:w-[340px] md:h-[240px]";

  return (
    <FloatingPanel
      className={cn(
        "transition-all duration-300 ease-in-out border border-white/10 overflow-hidden shadow-2xl z-40",
        expandedWidthHeight,
        className,
      )}
    >
      <MultiplayerMap
        players={players}
        actual={actual}
        guess={guess}
        onGuessSelect={onGuessSelect}
        onSubmitGuess={onSubmitGuess}
        isSubmitted={isSubmitted}
        isExpanded={isExpanded || showLargeMap}
        setIsExpanded={setIsExpanded}
        currentUserId={currentUserId}
      />
    </FloatingPanel>
  );
};
