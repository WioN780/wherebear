"use server";

import type { Prisma } from "@/generated/prisma";
import { prisma } from "@/shared/lib/db";
import { getCountryName } from "@/shared/lib/countries";

export type LeaderboardEntry = {
  id: string;
  userId: string;
  username: string;
  gamesPlayed: number;
  averageScore: number;
  highScore: number;
  user?: { image: string | null } | null;
};

export interface LocationData {
  id: string;
  lat: number;
  lng: number;
  panoId: string | null;
  heading: number | null;
  country: string;
  subdivision: string | null;
  surface: string | null;
  elevation: number | null;
  difficulty: string;
}

export interface GameState {
  id: string;
  userId: string | null;
  mode: string;
  country: string | null;
  status: string;
  currentRound: number;
  totalRounds: number;
  totalScore: number;
  isVirtual: boolean; // True if running in local-fallback mode
  rounds: RoundState[];
}

export interface RoundState {
  id: string;
  gameId: string;
  location: LocationData;
  roundNumber: number;
  score: number | null;
  distance: number | null;
  guess: { lat: number; lng: number } | null;
}

// Utility to shuffle array
function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Gets a list of random locations for the game.
 * Uses the database if available.
 */
export async function getGameLocations(
  count: number,
  mode: string,
  countryFilter?: string,
  difficultyFilter?: string,
): Promise<LocationData[]> {
  try {
    // Check if database has locations
    const locCount = await prisma.location.count();
    if (locCount === 0) {
      console.warn(
        "Database contains 0 locations. Please run 'npm run prisma:integrate-vali' to seed locations.",
      );
      return [];
    }

    const whereClause: Prisma.LocationWhereInput = {
      ...(difficultyFilter
        ? { difficulty: difficultyFilter.toLowerCase() }
        : {}),
      ...(mode === "COUNTRY" && countryFilter
        ? { country: { equals: countryFilter, mode: "insensitive" } }
        : {}),
    };

    // Fetch a pool of up to 1000 locations matching the query and shuffle them ????
    const dbLocations = await prisma.location.findMany({
      where: whereClause,
      take: 1000,
    });

    if (dbLocations.length > 0) {
      const shuffled = shuffle(dbLocations);
      return shuffled.slice(0, Math.min(count, shuffled.length)).map((l) => ({
        id: l.id,
        lat: l.lat,
        lng: l.lng,
        panoId: l.panoId,
        heading: l.heading,
        country: l.country,
        subdivision: l.subdivision,
        surface: l.surface,
        elevation: l.elevation,
        difficulty: l.difficulty,
      }));
    }
  } catch (err) {
    console.error("Database locations query failed:", err);
  }

  return [];
}

/**
 * Creates a new game.
 * If the database is not ready or fails, returns a virtual game state
 * that the client can manage in localStorage.
 */
export async function startNewGame(
  userId: string | null,
  mode: string,
  totalRounds: number = 5,
  country: string | null = null,
  difficulty: string = "medium",
): Promise<GameState> {
  const locations = await getGameLocations(
    totalRounds,
    mode,
    country || undefined,
    difficulty,
  );
  const virtualId = `game_virt_${Math.random().toString(36).substring(2, 11)}`;

  const initialRounds: RoundState[] = locations.map((loc, index) => ({
    id: `round_virt_${index}_${Math.random().toString(36).substring(2, 7)}`,
    gameId: virtualId,
    location: loc,
    roundNumber: index + 1,
    score: null,
    distance: null,
    guess: null,
  }));

  const gameData: GameState = {
    id: virtualId,
    userId,
    mode,
    country,
    status: "IN_PROGRESS",
    currentRound: 1,
    totalRounds,
    totalScore: 0,
    isVirtual: true,
    rounds: initialRounds,
  };

  if (userId) {
    try {
      // Attempt database game creation
      const dbGame = await prisma.game.create({
        data: {
          userId,
          mode,
          country,
          totalRounds,
          status: "IN_PROGRESS",
          rounds: {
            create: locations.map((loc, index) => ({
              locationId: loc.id,
              roundNumber: index + 1,
            })),
          },
        },
        include: {
          rounds: {
            include: {
              location: true,
            },
          },
        },
      });

      return {
        id: dbGame.id,
        userId: dbGame.userId,
        mode: dbGame.mode,
        country: dbGame.country,
        status: dbGame.status,
        currentRound: dbGame.currentRound,
        totalRounds: dbGame.totalRounds,
        totalScore: dbGame.totalScore,
        isVirtual: false,
        rounds: dbGame.rounds.map((r) => ({
          id: r.id,
          gameId: r.gameId,
          location: {
            id: r.location.id,
            lat: r.location.lat,
            lng: r.location.lng,
            panoId: r.location.panoId,
            heading: r.location.heading,
            country: r.location.country,
            subdivision: r.location.subdivision,
            surface: r.location.surface,
            elevation: r.location.elevation,
            difficulty: r.location.difficulty,
          },
          roundNumber: r.roundNumber,
          score: r.score,
          distance: r.distance,
          guess: null, // Initial guess is null
        })),
      };
    } catch (err) {
      console.warn(
        "Failed to create game in database, creating virtual game:",
        err,
      );
    }
  }

  // Guest players or DB failure fallback to virtual game
  return gameData;
}

/**
 * Submits a guess for a specific round of a game.
 */
export async function submitRoundGuess(
  gameId: string,
  roundId: string,
  lat: number,
  lng: number,
  score: number,
  distance: number,
  isVirtual: boolean,
): Promise<{
  success: boolean;
  round?: RoundState;
  nextRound?: number;
  gameCompleted?: boolean;
}> {
  if (isVirtual) {
    // Client will update its virtual game state in local storage.
    return { success: true };
  }

  try {
    // 1. Save the guess
    await prisma.guess.create({
      data: {
        roundId,
        lat,
        lng,
      },
    });

    // 2. Update the round with score and distance
    const updatedRound = await prisma.round.update({
      where: { id: roundId },
      data: {
        score,
        distance,
      },
      include: {
        location: true,
      },
    });

    // 3. Get the game to update totals
    const game = await prisma.game.findUnique({
      where: { id: gameId },
      include: {
        rounds: true,
      },
    });

    if (!game) {
      return { success: false };
    }

    const completedRounds = game.rounds.filter((r) => r.score !== null);
    const totalScore =
      completedRounds.reduce((sum: number, r) => sum + (r.score || 0), 0) +
      score;
    const isLastRound = game.currentRound >= game.totalRounds;

    // Update game score and round number
    const updatedGame = await prisma.game.update({
      where: { id: gameId },
      data: {
        totalScore,
        currentRound: isLastRound ? game.currentRound : game.currentRound + 1,
        status: isLastRound ? "COMPLETED" : "IN_PROGRESS",
      },
    });

    // If game is completed and user is logged in, submit to leaderboard
    if (isLastRound && game.userId) {
      await updateLeaderboard(game.userId, totalScore);
    }

    return {
      success: true,
      round: {
        id: updatedRound.id,
        gameId: updatedRound.gameId,
        location: {
          id: updatedRound.location.id,
          lat: updatedRound.location.lat,
          lng: updatedRound.location.lng,
          panoId: updatedRound.location.panoId,
          heading: updatedRound.location.heading,
          country: updatedRound.location.country,
          subdivision: updatedRound.location.subdivision,
          surface: updatedRound.location.surface,
          elevation: updatedRound.location.elevation,
          difficulty: updatedRound.location.difficulty,
        },
        roundNumber: updatedRound.roundNumber,
        score: updatedRound.score,
        distance: updatedRound.distance,
        guess: { lat, lng },
      },
      nextRound: updatedGame.currentRound,
      gameCompleted: isLastRound,
    };
  } catch (err) {
    console.error("Failed to submit guess to database:", err);
    return { success: false };
  }
}

/**
 * Updates a user's leaderboard stats after completing a game.
 */
async function updateLeaderboard(userId: string, gameScore: number) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) return;

    const completedGames = await prisma.game.findMany({
      where: {
        userId,
        status: "COMPLETED",
      },
    });

    const gamesPlayed = completedGames.length;
    const totalScoreSum = completedGames.reduce(
      (sum: number, g) => sum + g.totalScore,
      0,
    );
    const averageScore = gamesPlayed > 0 ? totalScoreSum / gamesPlayed : 0;

    const currentEntry = await prisma.leaderboardEntry.findUnique({
      where: { userId },
    });

    const highScore = currentEntry
      ? Math.max(currentEntry.highScore, gameScore)
      : gameScore;

    await prisma.leaderboardEntry.upsert({
      where: { userId },
      update: {
        totalScore: totalScoreSum,
        gamesPlayed,
        averageScore,
        highScore,
        username: user.name || "Explorer",
      },
      create: {
        userId,
        username: user.name || "Explorer",
        totalScore: totalScoreSum,
        gamesPlayed,
        averageScore,
        highScore,
      },
    });
  } catch (err) {
    console.warn("Failed to update leaderboard:", err);
  }
}

/**
 * Gets the global leaderboard.
 */
export async function getGlobalLeaderboard(
  limit: number = 20,
): Promise<LeaderboardEntry[]> {
  try {
    return await prisma.leaderboardEntry.findMany({
      orderBy: {
        highScore: "desc", // Sort by best single game score
      },
      take: limit,
      include: {
        user: {
          select: {
            image: true,
          },
        },
      },
    });
  } catch (err) {
    console.warn(
      "Failed to fetch leaderboard from database, returning mock leaderboard:",
      err,
    );

    // Fallback: Mock leaderboard entries
    return [
      {
        id: "1",
        userId: "",
        username: "GeoSherlock",
        highScore: 24850,
        gamesPlayed: 14,
        averageScore: 21200,
      },
      {
        id: "2",
        userId: "",
        username: "BearGryllsClone",
        highScore: 23900,
        gamesPlayed: 8,
        averageScore: 19800,
      },
      {
        id: "3",
        userId: "",
        username: "MapMaster",
        highScore: 22400,
        gamesPlayed: 25,
        averageScore: 18500,
      },
      {
        id: "4",
        userId: "",
        username: "CarmenSandiego",
        highScore: 21950,
        gamesPlayed: 11,
        averageScore: 17200,
      },
      {
        id: "5",
        userId: "",
        username: "LatitudeZero",
        highScore: 20100,
        gamesPlayed: 5,
        averageScore: 16400,
      },
    ];
  }
}

/**
 * Get country lists for Country Challenge mode
 */
export async function getAvailableCountries(): Promise<
  { code: string; name: string }[]
> {
  try {
    const countries = await prisma.location.findMany({
      select: {
        country: true,
      },
      distinct: ["country"],
    });

    if (countries.length > 0) {
      return countries
        .map((c) => ({
          code: c.country,
          name: getCountryName(c.country),
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
    }
  } catch (err) {
    console.warn("Failed to fetch available countries:", err);
  }

  return [];
}
