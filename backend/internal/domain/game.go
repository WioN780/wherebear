// Package domain contains pure domain types with zero internal dependencies.
// This is the innermost layer — no package in the project may be imported here.
package domain

// GameMode represents the type of game being played.
type GameMode string

const (
	GameModeClassic  GameMode = "CLASSIC"
	GameModeInfinite GameMode = "INFINITE"
	GameModeCountry  GameMode = "COUNTRY"
)

// Difficulty represents location difficulty level.
type Difficulty string

const (
	DifficultyEasy   Difficulty = "easy"
	DifficultyMedium Difficulty = "medium"
	DifficultyHard   Difficulty = "hard"
)

// RoomConfig holds the configurable settings for a multiplayer room.
type RoomConfig struct {
	Mode          GameMode   `json:"mode"`
	Difficulty    Difficulty `json:"difficulty"`
	MaxPlayers    int        `json:"maxPlayers"`
	TotalRounds   int        `json:"totalRounds"`
	RoundDuration int        `json:"roundDuration"`
	Country       *string    `json:"country"`
}

// Guess represents a player's latitude/longitude guess.
type Guess struct {
	Lat float64 `json:"lat"`
	Lng float64 `json:"lng"`
}
