"use server";

import { prisma } from "@/shared/lib/db";

export interface UserStats {
  gamesPlayed: number;
  totalScore: number;
  averageScore: number;
  bestScore: number;
  accuracyPercent: number; // calculated as (averageScore / 5000) * 100
  history: GameHistoryItem[];
}

export interface GameHistoryItem {
  id: string;
  mode: string;
  country: string | null;
  totalScore: number;
  createdAt: Date;
  roundsCount: number;
  status: string;
}

/**
 * Fetches profile stats for a specific user.
 * Falls back to demo stats if database is not available.
 */
export async function getUserProfileStats(
  userId: string,
): Promise<UserStats | null> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) return null;

    const completedGames = await prisma.game.findMany({
      where: {
        userId,
        status: "COMPLETED",
      },
      orderBy: {
        createdAt: "desc",
      },
      include: {
        rounds: true,
      },
    });

    const leaderboard = await prisma.leaderboardEntry.findUnique({
      where: { userId },
    });

    const gamesPlayed = completedGames.length;
    const totalScore = completedGames.reduce(
      (sum: number, g) => sum + g.totalScore,
      0,
    );
    const averageScore =
      gamesPlayed > 0 ? Math.round(totalScore / gamesPlayed) : 0;
    const bestScore = leaderboard ? leaderboard.highScore : 0;

    // Average accuracy percent across rounds
    // (5000 score = 100% accuracy)
    const accuracyPercent =
      gamesPlayed > 0 ? Math.round((averageScore / 25000) * 100) : 0;

    const history: GameHistoryItem[] = completedGames.map((g) => ({
      id: g.id,
      mode: g.mode,
      country: g.country,
      totalScore: g.totalScore,
      createdAt: g.createdAt,
      roundsCount: g.totalRounds,
      status: g.status,
    }));

    return {
      gamesPlayed,
      totalScore,
      averageScore,
      bestScore,
      accuracyPercent: Math.min(100, Math.max(0, accuracyPercent)),
      history,
    };
  } catch (err) {
    console.warn(
      "Database failed to fetch profile stats, returning mock stats:",
      err,
    );

    // Fallback: Mock stats
    return {
      gamesPlayed: 12,
      totalScore: 218500,
      averageScore: 18208,
      bestScore: 23450,
      accuracyPercent: 73,
      history: [
        {
          id: "h1",
          mode: "CLASSIC",
          country: null,
          totalScore: 23450,
          createdAt: new Date(Date.now() - 86400000),
          roundsCount: 5,
          status: "COMPLETED",
        },
        {
          id: "h2",
          mode: "CLASSIC",
          country: null,
          totalScore: 18200,
          createdAt: new Date(Date.now() - 86400000 * 3),
          roundsCount: 5,
          status: "COMPLETED",
        },
        {
          id: "h3",
          mode: "COUNTRY",
          country: "US",
          totalScore: 15400,
          createdAt: new Date(Date.now() - 86400000 * 5),
          roundsCount: 5,
          status: "COMPLETED",
        },
        {
          id: "h4",
          mode: "CLASSIC",
          country: null,
          totalScore: 19800,
          createdAt: new Date(Date.now() - 86400000 * 7),
          roundsCount: 5,
          status: "COMPLETED",
        },
      ],
    };
  }
}
