package repository

import (
	"context"
	"database/sql"
	"fmt"
	"time"
)

type sqlLeaderboardRepository struct {
	db *sql.DB
}

func NewLeaderboardRepository(db *sql.DB) LeaderboardRepository {
	return &sqlLeaderboardRepository{db: db}
}

func (r *sqlLeaderboardRepository) SaveGameResult(ctx context.Context, userID string, score int) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("beginning leaderboard transaction: %w", err)
	}
	defer tx.Rollback()

	// 1. Create Game record
	gameID := fmt.Sprintf("game_mp_%d", time.Now().UnixNano())
	now := time.Now()
	_, err = tx.ExecContext(ctx, `
		INSERT INTO "Game" ("id", "userId", "mode", "country", "status", "currentRound", "totalRounds", "totalScore", "createdAt", "updatedAt")
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
	`, gameID, userID, "CLASSIC", nil, "COMPLETED", 5, 5, score, now, now)
	if err != nil {
		return fmt.Errorf("inserting game result: %w", err)
	}

	// 2. Fetch all completed games for stats
	var gamesPlayed int
	var totalScoreSum int
	err = tx.QueryRowContext(ctx, `
		SELECT COUNT(*), COALESCE(SUM("totalScore"), 0)
		FROM "Game"
		WHERE "userId" = $1 AND "status" = 'COMPLETED'
	`, userID).Scan(&gamesPlayed, &totalScoreSum)
	if err != nil {
		return fmt.Errorf("querying game stats: %w", err)
	}

	// 3. Fetch current user info
	var username string
	err = tx.QueryRowContext(ctx, `SELECT COALESCE("name", 'Explorer') FROM "User" WHERE "id" = $1`, userID).Scan(&username)
	if err != nil {
		return fmt.Errorf("querying user name: %w", err)
	}

	var currentHighScore int
	err = tx.QueryRowContext(ctx, `SELECT COALESCE("highScore", 0) FROM "LeaderboardEntry" WHERE "userId" = $1`, userID).Scan(&currentHighScore)
	if err != nil && err != sql.ErrNoRows {
		return fmt.Errorf("querying high score: %w", err)
	}

	highScore := currentHighScore
	if score > highScore {
		highScore = score
	}

	averageScore := float64(totalScoreSum) / float64(gamesPlayed)

	// 4. Upsert Leaderboard Entry
	var exists bool
	err = tx.QueryRowContext(ctx, `SELECT EXISTS(SELECT 1 FROM "LeaderboardEntry" WHERE "userId" = $1)`, userID).Scan(&exists)
	if err != nil {
		return fmt.Errorf("checking leaderboard existence: %w", err)
	}

	if exists {
		_, err = tx.ExecContext(ctx, `
			UPDATE "LeaderboardEntry"
			SET "totalScore" = $1, "gamesPlayed" = $2, "averageScore" = $3, "highScore" = $4, "username" = $5, "updatedAt" = $6
			WHERE "userId" = $7
		`, totalScoreSum, gamesPlayed, averageScore, highScore, username, now, userID)
		if err != nil {
			return fmt.Errorf("updating leaderboard entry: %w", err)
		}
	} else {
		entryID := fmt.Sprintf("lb_%d", time.Now().UnixNano())
		_, err = tx.ExecContext(ctx, `
			INSERT INTO "LeaderboardEntry" ("id", "userId", "username", "totalScore", "gamesPlayed", "averageScore", "highScore", "createdAt", "updatedAt")
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		`, entryID, userID, username, totalScoreSum, gamesPlayed, averageScore, highScore, now, now)
		if err != nil {
			return fmt.Errorf("inserting leaderboard entry: %w", err)
		}
	}

	if err = tx.Commit(); err != nil {
		return fmt.Errorf("committing leaderboard transaction: %w", err)
	}

	return nil
}
