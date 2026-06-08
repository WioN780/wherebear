"use server";

import { prisma } from "@/shared/lib/db";
import locationSeed from "@/../prisma/location_seed.json";

export interface LocationData {
  id: string;
  lat: number;
  lng: number;
  country: string;
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
 * Uses the database if available, otherwise falls back to the local JSON seed.
 */
export async function getGameLocations(
  count: number,
  mode: string,
  countryFilter?: string,
): Promise<LocationData[]> {
  try {
    // Attempt database retrieval
    let dbLocations: any[] = [];

    // Auto-seed database if empty
    try {
      const locCount = await prisma.location.count();
      if (locCount === 0) {
        console.log(
          "Database contains 0 locations. Auto-seeding curated location pool...",
        );
        await prisma.location.createMany({
          data: locationSeed.map((l: any) => ({
            id: l.id,
            lat: l.lat,
            lng: l.lng,
            country: l.country,
            difficulty: l.difficulty,
          })),
          skipDuplicates: true,
        });
        console.log(
          `Auto-seeded ${locationSeed.length} locations successfully.`,
        );
      }
    } catch (seedErr) {
      console.warn(
        "Failed to check or auto-seed locations, database might not have tables yet:",
        seedErr,
      );
    }

    if (mode === "COUNTRY" && countryFilter) {
      dbLocations = await prisma.location.findMany({
        where: {
          country: {
            equals: countryFilter,
            mode: "insensitive",
          },
        },
      });
    } else {
      dbLocations = await prisma.location.findMany();
    }

    if (dbLocations.length >= count) {
      const shuffled = shuffle(dbLocations);
      return shuffled.slice(0, count).map((l) => ({
        id: l.id,
        lat: l.lat,
        lng: l.lng,
        country: l.country,
        difficulty: l.difficulty,
      }));
    }
  } catch (err) {
    console.warn(
      "Database locations query failed, falling back to JSON seed:",
      err,
    );
  }

  // Fallback: Use JSON seed
  let pool = locationSeed as LocationData[];

  if (mode === "COUNTRY" && countryFilter) {
    pool = pool.filter(
      (l) => l.country.toLowerCase() === countryFilter.toLowerCase(),
    );
  }

  // If filter produces too few items, ignore country filter
  if (pool.length < count) {
    pool = locationSeed as LocationData[];
  }

  const shuffled = shuffle(pool);
  return shuffled.slice(0, count);
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
): Promise<GameState> {
  const locations = await getGameLocations(
    totalRounds,
    mode,
    country || undefined,
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
        rounds: dbGame.rounds.map((r: any) => ({
          id: r.id,
          gameId: r.gameId,
          location: {
            id: r.location.id,
            lat: r.location.lat,
            lng: r.location.lng,
            country: r.location.country,
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

    const completedRounds = game.rounds.filter((r: any) => r.score !== null);
    const totalScore =
      completedRounds.reduce((sum: number, r: any) => sum + (r.score || 0), 0) +
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
          country: updatedRound.location.country,
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
      (sum: number, g: any) => sum + g.totalScore,
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
export async function getGlobalLeaderboard(limit: number = 20): Promise<any[]> {
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
        username: "GeoSherlock",
        highScore: 24850,
        gamesPlayed: 14,
        averageScore: 21200,
      },
      {
        id: "2",
        username: "BearGryllsClone",
        highScore: 23900,
        gamesPlayed: 8,
        averageScore: 19800,
      },
      {
        id: "3",
        username: "MapMaster",
        highScore: 22400,
        gamesPlayed: 25,
        averageScore: 18500,
      },
      {
        id: "4",
        username: "CarmenSandiego",
        highScore: 21950,
        gamesPlayed: 11,
        averageScore: 17200,
      },
      {
        id: "5",
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
export async function getAvailableCountries(): Promise<string[]> {
  try {
    const countries = await prisma.location.findMany({
      select: {
        country: true,
      },
      distinct: ["country"],
    });

    if (countries.length > 0) {
      return countries.map((c: any) => c.country).sort();
    }
  } catch (err) {
    // Fail silently, fallback below
  }

  // Fallback to distinct countries in JSON seed
  const countries = new Set<string>();
  (locationSeed as LocationData[]).forEach((l) => {
    countries.add(l.country);
  });
  return Array.from(countries).sort();
}
