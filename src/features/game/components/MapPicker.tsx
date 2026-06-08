"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import { cn } from "@/shared/lib/utils";
import { FloatingPanel } from "@/shared/components/FloatingPanel";

// Dynamic import of the map with SSR disabled to prevent Leaflet crashing on server render
const LeafletMap = dynamic(() => import("./LeafletMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[180px] bg-zinc-950/40 backdrop-blur-xl border border-white/5 rounded-2xl flex items-center justify-center animate-pulse">
      <div className="flex flex-col items-center gap-2">
        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        <span className="text-xs text-zinc-400 font-mono tracking-wider">
          LOADING TARGET MAP...
        </span>
      </div>
    </div>
  ),
});

interface MapPickerProps {
  guess: { lat: number; lng: number } | null;
  actual: { lat: number; lng: number } | null;
  onGuessSelect: (lat: number, lng: number) => void;
  onSubmitGuess: () => void;
  isSubmitted: boolean;
  className?: string;
}

export const MapPicker: React.FC<MapPickerProps> = ({
  guess,
  actual,
  onGuessSelect,
  onSubmitGuess,
  isSubmitted,
  className,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // If the round is submitted, we want the map to be large enough to see both coordinates clearly.
  const expandedWidthHeight = isExpanded
    ? "w-[85vw] h-[50vh] sm:w-[450px] sm:h-[350px] md:w-[600px] md:h-[450px]"
    : "w-[260px] h-[180px] sm:w-[280px] sm:h-[200px] md:w-[340px] md:h-[240px]";

  const submittedWidthHeight =
    "w-[85vw] h-[40vh] sm:w-[450px] sm:h-[320px] md:w-[550px] md:h-[380px]";

  return (
    <FloatingPanel
      className={cn(
        "transition-all duration-300 ease-in-out border border-white/10 overflow-hidden shadow-2xl",
        isSubmitted ? submittedWidthHeight : expandedWidthHeight,
        className,
      )}
    >
      <LeafletMap
        guess={guess}
        actual={actual}
        onGuessSelect={onGuessSelect}
        onSubmitGuess={onSubmitGuess}
        isSubmitted={isSubmitted}
        isExpanded={isExpanded || isSubmitted}
        setIsExpanded={setIsExpanded}
      />
    </FloatingPanel>
  );
};
