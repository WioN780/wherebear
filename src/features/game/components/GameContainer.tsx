"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  startNewGame,
  submitRoundGuess,
  GameState,
  RoundState,
} from "../actions";
import { calculateDistance, calculateScore } from "../scoring";
import { GameHUD } from "./GameHUD";
import { StreetViewContainer } from "./StreetViewContainer";
import { MapPicker } from "./MapPicker";
import { RoundSummary } from "./RoundSummary";
import { GameSummaryModal } from "./GameSummaryModal";
import { motion, AnimatePresence } from "framer-motion";
import { GlassCard } from "@/shared/components/GlassCard";
import { GlassButton } from "@/shared/components/GlassButton";
import { Navigation, Globe } from "lucide-react";

interface GameContainerProps {
  userId: string | null;
  mode: "CLASSIC" | "INFINITE" | "COUNTRY";
  country: string | null;
  onExit: () => void;
}

export const GameContainer: React.FC<GameContainerProps> = ({
  userId,
  mode,
  country,
  onExit,
}) => {
  const [game, setGame] = useState<GameState | null>(null);
  const [currentRoundIndex, setCurrentRoundIndex] = useState(0);
  const [guess, setGuess] = useState<{ lat: number; lng: number } | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [roundScore, setRoundScore] = useState<number | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize a new game
  const initGame = useCallback(async () => {
    setIsLoading(true);
    try {
      const totalRounds = mode === "INFINITE" ? 999 : 5;
      const gameData = await startNewGame(userId, mode, totalRounds, country);

      setGame(gameData);
      setCurrentRoundIndex(0);
      setGuess(null);
      setDistance(null);
      setRoundScore(null);
      setIsSubmitted(false);
      setShowSummaryModal(false);
    } catch (err) {
      console.error("Error starting new game:", err);
    } finally {
      setIsLoading(false);
    }
  }, [userId, mode, country]);

  useEffect(() => {
    initGame();
  }, [initGame]);

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-zinc-950 flex flex-col items-center justify-center gap-4 z-50">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
          className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full shadow-[0_0_20px_rgba(99,102,241,0.2)]"
        />
        <div className="flex flex-col items-center gap-1">
          <h2 className="text-white font-bold tracking-widest text-sm font-mono uppercase">
            CALIBRATING COORDINATES...
          </h2>
          <span className="text-zinc-500 text-xs tracking-wider animate-pulse">
            Fetching Street View pools
          </span>
        </div>
      </div>
    );
  }

  if (!game || game.rounds.length === 0) {
    return (
      <div className="fixed inset-0 bg-zinc-950 flex items-center justify-center z-50 p-4">
        <GlassCard className="p-8 max-w-sm text-center flex flex-col gap-4">
          <h2 className="text-white font-bold text-lg">Error Loading Game</h2>
          <p className="text-zinc-400 text-sm">
            We couldn't generate a valid location pool for this mode. Please try
            again or select another option.
          </p>
          <GlassButton onClick={onExit} variant="primary">
            Back to Main Menu
          </GlassButton>
        </GlassCard>
      </div>
    );
  }

  const currentRound = game.rounds[currentRoundIndex];
  const actualLocation = currentRound.location;

  const handleSelectGuess = (lat: number, lng: number) => {
    setGuess({ lat, lng });
  };

  const handleSubmitGuess = async () => {
    if (!guess || isSubmitted) return;

    // 1. Calculate distance (Haversine in km)
    const dist = calculateDistance(
      actualLocation.lat,
      actualLocation.lng,
      guess.lat,
      guess.lng,
    );

    // 2. Calculate score
    const score = calculateScore(dist);

    setDistance(dist);
    setRoundScore(score);
    setIsSubmitted(true);

    // 3. Update game locally
    const updatedRounds = [...game.rounds];
    updatedRounds[currentRoundIndex] = {
      ...currentRound,
      score,
      distance: dist,
      guess,
    };

    const newTotalScore = game.totalScore + score;
    const isLastRound = currentRoundIndex === game.totalRounds - 1;

    setGame({
      ...game,
      totalScore: newTotalScore,
      currentRound: isLastRound ? game.currentRound : game.currentRound + 1,
      status: isLastRound ? "COMPLETED" : "IN_PROGRESS",
      rounds: updatedRounds,
    });

    // 4. Save guess in DB / Virtual state
    try {
      await submitRoundGuess(
        game.id,
        currentRound.id,
        guess.lat,
        guess.lng,
        score,
        dist,
        game.isVirtual,
      );
    } catch (err) {
      console.warn("Failed to persist guess on server:", err);
    }
  };

  const handleNextRound = () => {
    const isLastRound = currentRoundIndex === game.totalRounds - 1;

    if (isLastRound) {
      setShowSummaryModal(true);
    } else {
      // Proceed to next round
      setCurrentRoundIndex((prev) => prev + 1);
      setGuess(null);
      setDistance(null);
      setRoundScore(null);
      setIsSubmitted(false);
    }
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-zinc-950 select-none">
      {/* 1. Immersive Full-Screen Street View iframe background */}
      <StreetViewContainer
        lat={actualLocation.lat}
        lng={actualLocation.lng}
        key={`${actualLocation.id}-${currentRoundIndex}`} // Key reset forces iframe remount
      />

      {/* 2. HUD - Game stats overlays */}
      <GameHUD
        round={currentRoundIndex + 1}
        totalRounds={game.totalRounds}
        score={game.totalScore}
        mode={game.mode}
        country={game.country}
        onExit={onExit}
      />

      {/* 3. MapPicker - Interactive Guess placement overlay */}
      <MapPicker
        guess={guess}
        actual={isSubmitted ? actualLocation : null}
        onGuessSelect={handleSelectGuess}
        onSubmitGuess={handleSubmitGuess}
        isSubmitted={isSubmitted}
        className="absolute bottom-6 right-6 z-20"
      />

      {/* 4. Round summary scorecard reveal */}
      <AnimatePresence>
        {isSubmitted && distance !== null && roundScore !== null && (
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            className="z-20"
          >
            <RoundSummary
              score={roundScore}
              distance={distance}
              country={actualLocation.country}
              isLastRound={currentRoundIndex === game.totalRounds - 1}
              onNext={handleNextRound}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* 5. Game completed summary dashboard */}
      {showSummaryModal && (
        <GameSummaryModal
          score={game.totalScore}
          rounds={game.rounds}
          onPlayAgain={initGame}
          onHome={onExit}
        />
      )}
    </div>
  );
};
